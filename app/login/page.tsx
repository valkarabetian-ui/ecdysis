"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

function PasswordVisibilityIcon({ isVisible }: { isVisible: boolean }) {
  if (isVisible) {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M3 3L21 21M10.58 10.58C10.21 10.95 10 11.46 10 12C10 13.1 10.9 14 12 14C12.54 14 13.05 13.79 13.42 13.42M9.88 5.09C10.56 4.93 11.27 4.85 12 4.85C17.52 4.85 21.61 9.03 22.8 11.32C22.93 11.54 23 11.77 23 12C23 12.23 22.93 12.46 22.8 12.68C22.37 13.51 21.46 14.82 20.11 16.03M6.1 6.1C3.95 7.32 2.45 9.29 1.2 11.32C1.07 11.54 1 11.77 1 12C1 12.23 1.07 12.46 1.2 12.68C2.39 14.97 6.48 19.15 12 19.15C13.58 19.15 15.03 18.81 16.33 18.24"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M1 12C2.19 9.71 6.28 5.53 11.8 5.53C17.32 5.53 21.41 9.71 22.6 12C21.41 14.29 17.32 18.47 11.8 18.47C6.28 18.47 2.19 14.29 1 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="11.8" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [resetPassword, setResetPassword] = useState("");
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [isPasswordResetFlow, setIsPasswordResetFlow] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const setupPasswordRecovery = async () => {
      const url = new URL(window.location.href);
      const type = url.searchParams.get("type");
      const code = url.searchParams.get("code");
      const tokenHash = url.searchParams.get("token_hash");
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const hashType = hashParams.get("type");

      const isRecoveryType =
        type === "recovery" ||
        type === "invite" ||
        hashType === "recovery" ||
        hashType === "invite";

      try {
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (!exchangeError && !cancelled) {
            setIsPasswordResetFlow(true);
            window.history.replaceState({}, "", "/login");
          }
          return;
        }

        if (tokenHash && (type === "recovery" || type === "invite")) {
          const { error: otpError } = await supabase.auth.verifyOtp({
            type,
            token_hash: tokenHash,
          });

          if (!otpError && !cancelled) {
            setIsPasswordResetFlow(true);
            window.history.replaceState({}, "", "/login");
          }
          return;
        }

        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (!sessionError && !cancelled) {
            setIsPasswordResetFlow(true);
            window.history.replaceState({}, "", "/login");
          }
          return;
        }

        if (isRecoveryType) {
          const { data } = await supabase.auth.getSession();
          if (!cancelled && data.session) {
            setIsPasswordResetFlow(true);
          }
        }
      } catch {
        // no-op
      }
    };

    void setupPasswordRecovery();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogin = async () => {
    setError("");
    setMessage("");
    setLoading(true);

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      setError("Credenciales incorrectas.");
      setLoading(false);
      return;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("No se pudo obtener la sesion.");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      setError("Perfil no encontrado.");
      setLoading(false);
      return;
    }

    if (profile.role === "admin") {
      router.push("/admin");
    } else {
      router.push("/cliente");
    }
  };

  const handleForgotPassword = async () => {
    setError("");
    setMessage("");

    if (!email) {
      setError("Ingresa tu mail para recuperar la contraseña.");
      return;
    }

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });

    if (resetError) {
      setError("No se pudo enviar el correo de recuperacion.");
      return;
    }

    setMessage("Te enviamos un mail para restablecer la contraseña.");
  };

  const handleSetNewPassword = async () => {
    setError("");
    setMessage("");

    if (!resetPassword || !resetPasswordConfirm) {
      setError("Completa ambos campos de contraseña.");
      return;
    }

    if (resetPassword.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (resetPassword !== resetPasswordConfirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({
      password: resetPassword,
    });

    if (updateError) {
      setError("No se pudo actualizar la contraseña. Intenta de nuevo.");
      setLoading(false);
      return;
    }

    await supabase.auth.signOut();
    setIsPasswordResetFlow(false);
    setResetPassword("");
    setResetPasswordConfirm("");
    setShowResetPassword(false);
    setLoading(false);
    setMessage("Contraseña actualizada. Ahora inicia sesión.");
  };

  return (
    <main className="ds-login-page">
      <section className="ds-login-shell">
        <header className="ds-login-head">
          <h1 className="ds-login-title">
            {isPasswordResetFlow ? "Nueva contraseña" : "Práctica Viva"}
          </h1>
          <p className="ds-login-subtitle ds-login-subtitle-line">
            {isPasswordResetFlow
              ? "Definí tu nuevo acceso"
              : "Entrená tu evolución"}
          </p>
        </header>

        <div className="ds-login-form-card">
          {!isPasswordResetFlow ? (
            <>
              <label className="ds-login-field">
                <span className="ds-login-label">Email</span>
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  placeholder="hola@practicaviva.com"
                  className="ds-login-input"
                />
              </label>

              <label className="ds-login-field">
                <span className="ds-login-label">Contraseña</span>
                <div className="ds-login-password-wrap">
                  <input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="ds-login-input"
                  />
                  <button
                    type="button"
                    className="ds-login-eye"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    <PasswordVisibilityIcon isVisible={showPassword} />
                  </button>
                </div>
              </label>

              <div className="ds-login-forgot-row">
                <button type="button" className="ds-login-forgot-link" onClick={handleForgotPassword}>
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              <button type="button" onClick={handleLogin} disabled={loading} className="ds-login-cta">
                {loading ? "Ingresando..." : "Ingresar"}
              </button>
            </>
          ) : (
            <>
              <label className="ds-login-field">
                <span className="ds-login-label">Nueva contraseña</span>
                <div className="ds-login-password-wrap">
                  <input
                    value={resetPassword}
                    onChange={(event) => setResetPassword(event.target.value)}
                    type={showResetPassword ? "text" : "password"}
                    placeholder="••••••"
                    className="ds-login-input"
                  />
                  <button
                    type="button"
                    className="ds-login-eye"
                    onClick={() => setShowResetPassword((current) => !current)}
                    aria-label={showResetPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    <PasswordVisibilityIcon isVisible={showResetPassword} />
                  </button>
                </div>
              </label>

              <label className="ds-login-field">
                <span className="ds-login-label">Confirmar contraseña</span>
                <input
                  value={resetPasswordConfirm}
                  onChange={(event) => setResetPasswordConfirm(event.target.value)}
                  type={showResetPassword ? "text" : "password"}
                  placeholder="••••••"
                  className="ds-login-input"
                />
              </label>

              <button
                type="button"
                onClick={handleSetNewPassword}
                disabled={loading}
                className="ds-login-cta"
              >
                {loading ? "Guardando..." : "Guardar contraseña"}
              </button>
            </>
          )}

          {error && <p className="ds-login-feedback">{error}</p>}
          {message && <p className="ds-login-feedback">{message}</p>}
        </div>
      </section>
    </main>
  );
}
