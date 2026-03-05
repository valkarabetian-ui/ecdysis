import Link from "next/link";
import { ReactNode } from "react";

type ButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
};

type InputProps = {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
};

type SelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
};

export function AppShell({
  title,
  subtitle,
  kicker = "PrÃ¡ctica viva",
  children,
}: {
  title: string;
  subtitle?: string;
  kicker?: string;
  children: ReactNode;
}) {
  const hasHero = Boolean(kicker || title || subtitle);

  return (
    <div className="ds-page">
      {hasHero && (
        <section className="ds-hero">
          <div className="ds-hero-overlay" />
          <div className="ds-hero-content">
            {kicker && <p className="ds-kicker">{kicker}</p>}
            {title && <h1 className="ds-h1">{title}</h1>}
            {subtitle && <p className="ds-subtitle">{subtitle}</p>}
          </div>
        </section>
      )}
      <main className={`ds-main ${hasHero ? "" : "ds-main-no-hero"}`}>{children}</main>
    </div>
  );
}

export function FloatingCard({
  title,
  description,
  className,
  headerRight,
  children,
}: {
  title: string;
  description?: string;
  className?: string;
  headerRight?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={`ds-card ds-animate-card ${className ?? ""}`}>
      <div className="ds-card-head">
        <h2 className="ds-h2">{title}</h2>
        {headerRight ? <div className="ds-card-head-right">{headerRight}</div> : null}
      </div>
      {description && <p className="ds-description">{description}</p>}
      <div className="ds-stack-md">{children}</div>
    </section>
  );
}

export function Tabs({
  items,
  value,
  onChange,
}: {
  items: { id: string; label: string; icon?: ReactNode }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="ds-pill-row">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onChange(item.id)}
          className={`ds-pill ${value === item.id ? "is-active" : ""}`}
        >
          {item.icon && <span className="ds-tab-icon" aria-hidden>{item.icon}</span>}
          <span className="ds-tab-label">{item.label}</span>
        </button>
      ))}
    </div>
  );
}

export function PrimaryButton({
  children,
  onClick,
  type = "button",
  disabled,
  className,
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`ds-btn-primary ${className ?? ""}`}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  onClick,
  type = "button",
  disabled,
  className,
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`ds-btn-secondary ${className ?? ""}`}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  onClick,
  type = "button",
  disabled,
  className,
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`ds-btn-ghost ${className ?? ""}`}
    >
      {children}
    </button>
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: InputProps) {
  return (
    <label className="ds-field">
      <span className="ds-field-label">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        className="ds-input"
      />
    </label>
  );
}

export function SelectField({ label, value, onChange, children }: SelectProps) {
  return (
    <label className="ds-field">
      <span className="ds-field-label">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="ds-input"
      >
        {children}
      </select>
    </label>
  );
}

export function EditorialWorkoutCard({
  title,
  meta,
  rightSlot,
}: {
  title: string;
  meta: string;
  rightSlot?: ReactNode;
}) {
  return (
    <article className="ds-editorial-card ds-animate-card">
      <div>
        <h3 className="ds-h3">{title}</h3>
        <p className="ds-micro">{meta}</p>
      </div>
      {rightSlot}
    </article>
  );
}

export function BookingPanel({
  title,
  datetime,
  onJoin,
}: {
  title: string;
  datetime: string;
  onJoin: () => void;
}) {
  return (
    <article className="ds-booking-panel ds-animate-card">
      <div>
        <p className="ds-micro">Proxima clase en vivo</p>
        <h3 className="ds-h3">{title}</h3>
        <p className="ds-description">{datetime}</p>
      </div>
      <PrimaryButton onClick={onJoin}>Unirme</PrimaryButton>
    </article>
  );
}

export function ExpandableSection({
  open,
  children,
}: {
  open: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`ds-expand ${open ? "is-open" : ""}`} aria-hidden={!open}>
      <div>{children}</div>
    </div>
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="ds-skeleton-card" aria-hidden>
      <div className="ds-skeleton-line ds-skeleton-line-title" />
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={`skeleton-line-${index}`}
          className="ds-skeleton-line"
        />
      ))}
    </div>
  );
}

export function DatePills({
  days,
  current,
  labels,
}: {
  days: string[];
  current: string;
  labels?: string[];
}) {
  return (
    <div className="ds-pill-row ds-date-pills">
      {days.map((day, index) => (
        (() => {
          const rawLabel = labels?.[index] ?? day.slice(0, 3);
          const parts = rawLabel.trim().split(/\s+/);
          const maybeNumber = parts[parts.length - 1];
          const hasNumber = /^\d{1,2}$/.test(maybeNumber);
          const top = hasNumber ? parts.slice(0, -1).join(" ") : rawLabel;
          const bottom = hasNumber ? maybeNumber : "";
          const isActive = day === current;

          return (
            <button
              key={day}
              disabled={!isActive}
              className={`ds-pill ds-date-pill ${isActive ? "is-active" : ""}`}
            >
              <span className="ds-pill-top">{top}</span>
              {bottom && <span className="ds-pill-bottom">{bottom}</span>}
            </button>
          );
        })()
      ))}
    </div>
  );
}

export function ProgressRing({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  const percent = Math.max(0, Math.min(value, 100));
  const style = {
    background: `conic-gradient(var(--ds-accent) ${percent * 3.6}deg, rgba(58,86,53,0.18) 0deg)`,
  };

  return (
    <div className="ds-progress-wrap">
      <div className="ds-progress-ring" style={style}>
        <div className="ds-progress-inner">{Math.round(percent)}%</div>
      </div>
      <p className="ds-micro">{label}</p>
    </div>
  );
}

export function BottomNavigation({
  items,
  value,
  onChange,
}: {
  items: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <nav className="ds-bottom-nav">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onChange(item.id)}
          className={`ds-bottom-item ${value === item.id ? "is-active" : ""}`}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}

export function StickyBottomCTA({
  label,
  href,
  onClick,
}: {
  label: string;
  href?: string;
  onClick?: () => void;
}) {
  return (
    <div className="ds-sticky-cta">
      {href ? (
        <Link href={href} className="ds-btn-primary ds-btn-full">
          {label}
        </Link>
      ) : (
        <PrimaryButton onClick={onClick} className="ds-btn-full">
          {label}
        </PrimaryButton>
      )}
    </div>
  );
}

