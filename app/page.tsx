"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import "./landing.css";

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="lp">
      {/* ── NAV ── */}
      <nav className={`lp-nav ${scrolled ? "lp-nav--scrolled" : ""}`}>
        <div className="lp-nav-inner">
          <Image src="/logo-pv.png" alt="Práctica Viva" width={160} height={40} priority className="lp-nav-logo" />

          <button className="lp-hamburger" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menú">
            <span className={menuOpen ? "open" : ""} />
            <span className={menuOpen ? "open" : ""} />
            <span className={menuOpen ? "open" : ""} />
          </button>

          <div className={`lp-nav-right ${menuOpen ? "is-open" : ""}`}>
            <a href="#programa" onClick={() => setMenuOpen(false)}>EL MÉTODO</a>
            <a href="#nosotras" onClick={() => setMenuOpen(false)}>EQUIPO</a>
            <div className="lp-nav-divider" />
            <Link href="/login" className="lp-nav-cta" onClick={() => setMenuOpen(false)}>
              Iniciar sesión
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="lp-hero">
        <div className="lp-hero-inner">
          <div className="lp-hero-text">
            <h1 className="lp-hero-h1">
              No es solo entrenar.<br />
              Es entrenar con <em className="lp-hero-accent">propósito.</em>
            </h1>
            <p className="lp-hero-desc">
              Fuerza. Movilidad. Yoga. Meditación.
            </p>
            <a href="#videollamada" className="lp-btn lp-btn--dark">
              Agendar videollamada
            </a>
          </div>
          <div className="lp-hero-visual">
            <div className="lp-hero-circle" />
            <Image
              src="/workout-hero.jpeg"
              alt="Entrenamiento Práctica Viva"
              width={560}
              height={700}
              className="lp-hero-img"
              priority
            />
          </div>
        </div>
      </section>


      {/* ── PROGRAMA / EL MÉTODO ── */}
      <section id="programa" className="lp-metodo">
        <div className="lp-metodo-inner">
          <div className="lp-metodo-left">
            <h2 className="lp-metodo-title">
              Evaluación<br />
              <em>y enfoque</em>
            </h2>
          </div>
          <div className="lp-metodo-divider" />
          <div className="lp-metodo-right">
            <p>
              Partimos de tu nivel actual, tus objetivos y tu contexto real.
              Nada genérico. Todo tiene dirección.
            </p>
            <a href="#precio" className="lp-metodo-link">UNIRME &rarr;</a>
          </div>
        </div>
      </section>

      {/* ── PROCESO ── */}
      <section className="lp-proceso">
        <div className="lp-container">
          <span className="lp-proceso-tag">EL PROCESO</span>
          <h2 className="lp-proceso-title">Tu camino paso a paso</h2>
          <div className="lp-proceso-grid">
            <div className="lp-proceso-card">
              <div className="lp-proceso-num">01</div>
              <h3>Te unís a la comunidad</h3>
              <p>Acceso inmediato a la plataforma y bienvenida personal.</p>
            </div>
            <div className="lp-proceso-card">
              <div className="lp-proceso-num">02</div>
              <h3>Evaluación inicial</h3>
              <p>Analizamos tu punto de partida, objetivos y limitaciones.</p>
            </div>
            <div className="lp-proceso-card">
              <div className="lp-proceso-num">03</div>
              <h3>Plan personalizado</h3>
              <p>Recibís tu ruta de entrenamiento y hábitos adaptada a vos.</p>
            </div>
            <div className="lp-proceso-card">
              <div className="lp-proceso-num">04</div>
              <h3>Transformación continua</h3>
              <p>Ajustes mensuales, llamadas de seguimiento y soporte.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── NOSOTRAS ── */}
      <section id="nosotras" className="lp-equipo">
        {/* Candela - foto derecha */}
        <div className="lp-equipo-row">
          <div className="lp-equipo-info">
            <span className="lp-equipo-tag lp-equipo-tag--verde">YOGA Y MEDITACIÓN</span>
            <h3 className="lp-equipo-name">Candela Pellegrino</h3>
            <p>
              Guía experta en la conexión mente-cuerpo. Candela te
              enseñará a encontrar el silencio interior y a moverte
              con intención, creando un espacio sagrado en tu
              práctica diaria.
            </p>
            <div className="lp-equipo-line" />
          </div>
          <div className="lp-equipo-photo">
            <Image
              src="/pelele.jpeg"
              alt="Candela Pellegrino"
              width={520}
              height={640}
              className="lp-equipo-img"
            />
          </div>
        </div>

        {/* Valentina - foto izquierda */}
        <div className="lp-equipo-row">
          <div className="lp-equipo-photo">
            <Image
              src="/china.jpeg"
              alt="Valentina Oyuela"
              width={520}
              height={640}
              className="lp-equipo-img"
            />
          </div>
          <div className="lp-equipo-info">
            <span className="lp-equipo-tag">FUERZA Y MOVILIDAD</span>
            <h3 className="lp-equipo-name">Valentina Oyuela</h3>
            <p>
              Especialista en potenciar las capacidades humanas.
              Valentina combina la disciplina de la fuerza con la
              libertad de la movilidad para que construyas un cuerpo
              capaz de todo.
            </p>
            <div className="lp-equipo-line" />
          </div>
        </div>
      </section>

      {/* ── VIDEOLLAMADA ── */}
      <section id="videollamada" className="lp-call">
        <div className="lp-container">
          <div className="lp-call-card">
            <span className="lp-call-tag">¿TENÉS DUDAS?</span>
            <h2 className="lp-call-title">Hablemos antes de empezar</h2>
            <p className="lp-call-desc">
              Agendá una videollamada gratuita con nosotras. Queremos
              conocer tus objetivos y ver si Práctica Viva es lo que estás buscando.
            </p>
            <a
              href="https://calendar.google.com/calendar/appointments"
              target="_blank"
              rel="noopener noreferrer"
              className="lp-btn lp-btn--dark"
            >
              Agendar videollamada
            </a>
          </div>
        </div>
      </section>

      {/* ── PRECIO ── */}
      <section id="precio" className="lp-precio">
        <div className="lp-container">
          <div className="lp-precio-card">
            <span className="lp-precio-tag">PROGRAMA DE 3 MESES</span>
            <div className="lp-precio-amount">
              <span className="lp-precio-currency">USD</span>
              <span className="lp-precio-number">150</span>
            </div>
            <p className="lp-precio-period">Pago único &middot; 3 meses de acompañamiento</p>

            <div className="lp-precio-divider" />

            <ul className="lp-precio-list">
              <li>Rutinas de fuerza y movilidad semanales</li>
              <li>Clases de yoga y meditación</li>
              <li>App con calendario y seguimiento</li>
              <li>Contacto directo con tus entrenadoras</li>
              <li>Comunidad </li>
              
            </ul>

            <a href="https://wa.me/" target="_blank" rel="noopener noreferrer" className="lp-btn lp-btn--dark lp-btn--full">
              Quiero unirme
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="lp-footer">
        <div className="lp-container lp-footer-inner">
          <p className="lp-footer-copy">&copy; {new Date().getFullYear()} Práctica Viva</p>
        </div>
      </footer>
    </div>
  );
}
