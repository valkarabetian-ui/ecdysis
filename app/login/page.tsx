"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

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
            {isPasswordResetFlow ? "Crea tu nueva contraseña" : "Bienvenido de nuevo"}
          </h1>
          <p className="ds-login-subtitle">
            {isPasswordResetFlow
              ? "Defínela una sola vez para ingresar."
              : "Inicia sesión para continuar"}
          </p>
        </header>

        <div className="ds-login-form-card">
          <h2 className="ds-login-form-title">
            {isPasswordResetFlow ? "Nueva contraseña" : "Iniciar sesión"}
          </h2>

          {!isPasswordResetFlow ? (
            <>
              <label className="ds-login-field">
                <span className="ds-login-label">Email</span>
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  placeholder="nombre@dominio.com"
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
                    placeholder="•••••"
                    className="ds-login-input"
                  />
                  <button
                    type="button"
                    className="ds-login-eye"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassword ? "🙈" : "👁"}
                  </button>
                </div>
              </label>

              <button type="button" className="ds-login-forgot-link" onClick={handleForgotPassword}>
                ¿Olvidaste tu contraseña?
              </button>

              <button type="button" onClick={handleLogin} disabled={loading} className="ds-login-cta">
                {loading ? "Ingresando..." : "Iniciar sesión"}
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
                    {showResetPassword ? "🙈" : "👁"}
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
