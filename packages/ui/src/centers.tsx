import type { ReactNode } from "react";

export type CenterStatusTone = "active" | "suspended" | "pending" | "closed";

export function CenterStatusBadge({
  status,
  children,
}: {
  status: CenterStatusTone;
  children?: ReactNode;
}) {
  const label =
    children ??
    (status === "active" ? "ACTIVE" : status === "suspended" ? "SUSPENDED" : status.toUpperCase());
  return <span className={`ed-center-status ed-center-status--${status}`}>{label}</span>;
}

export function CenterAvatar({
  initials,
  imageUrl,
  tone = "blue",
}: {
  initials: string;
  imageUrl?: string | null;
  tone?: "blue" | "purple" | "teal" | "gray";
}) {
  if (imageUrl) {
    return <img src={imageUrl} alt="" className="ed-center-avatar ed-center-avatar--image" />;
  }
  return (
    <span className={`ed-center-avatar ed-center-avatar--${tone}`} aria-hidden>
      {initials}
    </span>
  );
}

export function CentersPageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="ed-centers-page-header">
      <div className="ed-centers-page-header__copy">
        <h1 className="ed-centers-page-header__title">{title}</h1>
        {subtitle ? <p className="ed-centers-page-header__subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="ed-centers-page-header__actions">{actions}</div> : null}
    </header>
  );
}

export function CentersKpiGrid({ children }: { children: ReactNode }) {
  return <div className="ed-centers-kpi-grid">{children}</div>;
}

export function CentersKpiCard({
  label,
  value,
  icon,
  tone = "default",
  active,
  onClick,
}: {
  label: string;
  value: number | string;
  icon?: ReactNode;
  tone?: "default" | "active" | "suspended";
  active?: boolean;
  onClick?: () => void;
}) {
  const className = [
    "ed-centers-kpi",
    `ed-centers-kpi--${tone}`,
    active ? "is-active" : "",
    onClick ? "is-clickable" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      {icon ? <span className="ed-centers-kpi__icon">{icon}</span> : null}
      <div>
        <p className="ed-centers-kpi__label">{label}</p>
        <p className="ed-centers-kpi__value">{value}</p>
      </div>
    </>
  );

  if (onClick) {
    return (
      <button type="button" className={className} onClick={onClick} aria-pressed={active}>
        {content}
      </button>
    );
  }

  return <article className={className}>{content}</article>;
}

export function CentersMobileOverview({
  items,
}: {
  items: { key: string; label: string; value: number; tone?: "default" | "active" | "suspended" }[];
}) {
  return (
    <div className="ed-centers-mobile-overview">
      {items.map((item) => (
        <div key={item.key} className={`ed-centers-mobile-overview__item ed-centers-mobile-overview__item--${item.tone ?? "default"}`}>
          <p className="ed-centers-mobile-overview__value">{item.value}</p>
          <p className="ed-centers-mobile-overview__label">{item.label}</p>
        </div>
      ))}
    </div>
  );
}

export function CentersDirectoryPanel({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <aside className="ed-centers-directory">
      <div className="ed-centers-directory__head">
        <h2 className="ed-centers-directory__title">{title}</h2>
        {action ? <div className="ed-centers-directory__action">{action}</div> : null}
      </div>
      <div className="ed-centers-directory__body">{children}</div>
    </aside>
  );
}

export function CentersDirectoryItem({
  initials,
  imageUrl,
  tone = "blue",
  title,
  meta,
  status,
  statusLabel,
  selected,
  onSelect,
}: {
  initials: string;
  imageUrl?: string | null;
  tone?: "blue" | "purple" | "teal" | "gray";
  title: string;
  meta?: string;
  status: CenterStatusTone;
  /** Visible badge text. When omitted, the badge uses the status tone (ACTIVE, PENDING, …). */
  statusLabel?: ReactNode;
  selected?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={`ed-centers-directory-item${selected ? " is-selected" : ""}`}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <CenterAvatar initials={initials} imageUrl={imageUrl} tone={tone} />
      <div className="ed-centers-directory-item__copy">
        <p className="ed-centers-directory-item__title">{title}</p>
        {meta ? <p className="ed-centers-directory-item__meta">{meta}</p> : null}
      </div>
      <CenterStatusBadge status={status}>{statusLabel}</CenterStatusBadge>
    </button>
  );
}

export function CenterDetailHero({
  initials,
  imageUrl,
  title,
  franchiseId,
  idLabel = "Franchise ID",
  status,
  titleAction,
  actions,
}: {
  initials: string;
  imageUrl?: string | null;
  title: string;
  franchiseId?: string;
  idLabel?: string;
  status?: ReactNode;
  titleAction?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="ed-center-detail-hero">
      <div className="ed-center-detail-hero__main">
        <CenterAvatar initials={initials} imageUrl={imageUrl} tone="blue" />
        <div>
          <div className="ed-center-detail-hero__title-row">
            <h2 className="ed-center-detail-hero__title">{title}</h2>
            {status}
            {titleAction}
          </div>
          {franchiseId ? (
            <p className="ed-center-detail-hero__id">
              {idLabel}: {franchiseId}
            </p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="ed-center-detail-hero__actions">{actions}</div> : null}
    </div>
  );
}

export function CenterMobileHeroBanner({
  initials,
  imageUrl,
  title,
  slug,
  slugLabel = "slug",
  titleAction,
}: {
  initials: string;
  imageUrl?: string | null;
  title: string;
  slug: string;
  slugLabel?: string;
  titleAction?: ReactNode;
}) {
  return (
    <div className="ed-center-mobile-hero">
      <CenterAvatar initials={initials} imageUrl={imageUrl} tone="blue" />
      <div>
        <div className="ed-center-mobile-hero__title-row">
          <h2 className="ed-center-mobile-hero__title">{title}</h2>
          {titleAction}
        </div>
        <p className="ed-center-mobile-hero__slug">
          {slugLabel}: {slug}
        </p>
      </div>
    </div>
  );
}

export function CenterDetailStatsRow({
  items,
}: {
  items: { key: string; label: string; value: number | string; href?: string | null }[];
}) {
  return (
    <div className="ed-center-detail-stats">
      {items.map((item) => {
        const content = (
          <>
            <p className="ed-center-detail-stats__value">{item.value}</p>
            <p className="ed-center-detail-stats__label">{item.label}</p>
          </>
        );
        if (item.href) {
          return (
            <a
              key={item.key}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="ed-center-detail-stats__item ed-center-detail-stats__item--link"
            >
              {content}
            </a>
          );
        }
        return (
          <div key={item.key} className="ed-center-detail-stats__item">
            {content}
          </div>
        );
      })}
    </div>
  );
}

export function CentersSectionCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="ed-centers-section">
      <div className="ed-centers-section__head">
        <h3 className="ed-centers-section__title">{title}</h3>
        {action ? <div className="ed-centers-section__action">{action}</div> : null}
      </div>
      <div className="ed-centers-section__body">{children}</div>
    </section>
  );
}

export function CenterSocialLinkRow({
  value,
  onChange,
  onRemove,
  removeLabel = "Remove link",
}: {
  value: string;
  onChange: (value: string) => void;
  onRemove?: () => void;
  removeLabel?: string;
}) {
  return (
    <div className="ed-center-social-row">
      <span className="ed-center-social-row__icon" aria-hidden>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      </span>
      <input
        type="url"
        className="ed-center-social-row__input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://…"
      />
      {onRemove ? (
        <button type="button" className="ed-center-social-row__remove" onClick={onRemove} aria-label={removeLabel}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}

export function CenterAddSocialButton({ onClick, label = "+ Add social link" }: { onClick: () => void; label?: string }) {
  return (
    <button type="button" className="ed-center-add-social" onClick={onClick}>
      {label}
    </button>
  );
}

export function CenterCurriculumToggleCard({
  title,
  subtitle,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  subtitle?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className={`ed-center-curriculum-card${checked ? " is-active" : ""}`}>
      <div className="ed-center-curriculum-card__copy">
        <p className="ed-center-curriculum-card__title">{title}</p>
        {subtitle ? <p className="ed-center-curriculum-card__subtitle">{subtitle}</p> : null}
      </div>
      <label className="ed-center-curriculum-card__switch">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="ed-center-curriculum-card__slider" aria-hidden />
        <span className="ed-sr-only">{checked ? "Active" : "Inactive"}</span>
      </label>
    </div>
  );
}

export function CenterDetailFooter({
  suspendAction,
  deleteAction,
  resetAction,
  saveAction,
}: {
  suspendAction?: ReactNode;
  deleteAction?: ReactNode;
  resetAction?: ReactNode;
  saveAction?: ReactNode;
}) {
  return (
    <footer className="ed-center-detail-footer">
      <div className="ed-center-detail-footer__left">
        {suspendAction}
        {deleteAction}
      </div>
      <div className="ed-center-detail-footer__right">
        {resetAction}
        {saveAction}
      </div>
    </footer>
  );
}

export function CentersSearchField({
  value,
  onChange,
  placeholder = "Search centers…",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="ed-centers-search">
      <span className="ed-centers-search__icon" aria-hidden>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </span>
      <input
        type="search"
        className="ed-centers-search__input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
    </label>
  );
}
