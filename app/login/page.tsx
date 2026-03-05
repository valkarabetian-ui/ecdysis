"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

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

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${window.location.origin}/login`,
      },
    );

    if (resetError) {
      setError("No se pudo enviar el correo de recuperacion.");
      return;
    }

    setMessage("Te enviamos un mail para restablecer la contraseña.");
  };

  return (
    <main className="ds-login-page">
      <section className="ds-login-shell">
        <header className="ds-login-head">
          <h1 className="ds-login-title">Bienvenido de nuevo</h1>
          <p className="ds-login-subtitle">Inicia sesión para continuar</p>
        </header>

        <div className="ds-login-form-card">
          <h2 className="ds-login-form-title">Iniciar sesión</h2>

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

          <button
            type="button"
            className="ds-login-forgot-link"
            onClick={handleForgotPassword}
          >
            ¿Olvidaste tu contraseña?
          </button>

          <button
            type="button"
            onClick={handleLogin}
            disabled={loading}
            className="ds-login-cta"
          >
            {loading ? "Ingresando..." : "Iniciar sesión"}
          </button>

          {error && <p className="ds-login-feedback">{error}</p>}
          {message && <p className="ds-login-feedback">{message}</p>}
        </div>
      </section>
    </main>
  );
}
