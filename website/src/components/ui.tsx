import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useFileUrl } from '../lib/files';
import { initials } from '../lib/format';
import { renderMarkdown } from '../lib/markdown';

/** Image stored in S3 (or a static /images path). Shows a monogram when there is none. */
export function Img({ k, alt, fallback, className }: { k?: string | null; alt: string; fallback?: string; className?: string }) {
  const url = useFileUrl(k);
  if (!k || !url) {
    return fallback !== undefined ? (
      <div className={'monogram ' + (className ?? '')} aria-label={alt}>
        {fallback}
      </div>
    ) : (
      <div className={className} style={{ width: '100%', height: '100%', background: 'var(--teal-100)' }} aria-hidden />
    );
  }
  return <img src={url} alt={alt} loading="lazy" className={className} />;
}

export function Portrait({ k, name }: { k?: string | null; name: string }) {
  return <Img k={k} alt={name} fallback={initials(name)} />;
}

/** Link to a file stored in S3. */
export function FileLink({ k, children }: { k?: string | null; children: ReactNode }) {
  const url = useFileUrl(k);
  if (!k) return null;
  return (
    <a href={url || '#'} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}

export function Markdown({ src, className = 'prose' }: { src?: string | null; className?: string }) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: renderMarkdown(src) }} />;
}

export function Paragraphs({ text }: { text?: string | null }) {
  return (
    <>
      {(text ?? '')
        .split(/\n\s*\n/)
        .filter((p) => p.trim())
        .map((p, i) => (
          <p key={i}>{p}</p>
        ))}
    </>
  );
}

export function PageHeader({ title, intro, eyebrow, crumbs }: { title: ReactNode; intro?: ReactNode; eyebrow?: string; crumbs?: { to: string; label: string }[] }) {
  return (
    <header className="page-header">
      <div className="container">
        {crumbs && (
          <div className="crumbs">
            {crumbs.map((c) => (
              <span key={c.to}>
                <Link to={c.to}>{c.label}</Link> ›{' '}
              </span>
            ))}
          </div>
        )}
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {intro && <p>{intro}</p>}
      </div>
    </header>
  );
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="loading">
      <span className="spinner" /> {label}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}

/** Full-screen photo viewer with keyboard navigation. */
export function Lightbox({ photos, index, onClose }: { photos: { key: string; caption?: string }[]; index: number; onClose: () => void }) {
  const [i, setI] = useState(index);
  const go = useCallback((d: number) => setI((x) => (x + d + photos.length) % photos.length), [photos.length]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, onClose]);
  const p = photos[i];
  const url = useFileUrl(p?.key);
  if (!p) return null;
  return (
    <div className="lightbox" role="dialog" aria-modal onClick={onClose}>
      <button className="close" onClick={onClose} aria-label="Close">
        ×
      </button>
      {photos.length > 1 && (
        <button
          className="nav prev"
          onClick={(e) => {
            e.stopPropagation();
            go(-1);
          }}
          aria-label="Previous"
        >
          ‹
        </button>
      )}
      {url && <img src={url} alt={p.caption ?? ''} onClick={(e) => e.stopPropagation()} />}
      <div className="cap">
        {p.caption} {photos.length > 1 && <span className="muted">({i + 1} / {photos.length})</span>}
      </div>
      {photos.length > 1 && (
        <button
          className="nav next"
          onClick={(e) => {
            e.stopPropagation();
            go(1);
          }}
          aria-label="Next"
        >
          ›
        </button>
      )}
    </div>
  );
}

export function PhotoGrid({ photos }: { photos: { key: string; caption?: string }[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <>
      <div className="photo-grid">
        {photos.map((p, i) => (
          <button key={p.key + i} onClick={() => setOpen(i)} title={p.caption}>
            <Img k={p.key} alt={p.caption ?? ''} />
          </button>
        ))}
      </div>
      {open !== null && <Lightbox photos={photos} index={open} onClose={() => setOpen(null)} />}
    </>
  );
}

/* ---------- Toasts ---------- */
type Toast = { id: number; text: string; error?: boolean };
const ToastContext = createContext<(text: string, error?: boolean) => void>(() => undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((text: string, error?: boolean) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, error }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), error ? 8000 : 3500);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="toast-wrap" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={'toast' + (t.error ? ' error' : '')}>
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

export function BrandMark({ className = 'brand-mark' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden>
      <rect width="64" height="64" rx="10" fill="#0E4B47" />
      <g fill="none" stroke="#F6F1E7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 36v-9l14-8 14 8v9" />
        <path d="M15 36h34" />
        <path d="M26 36v-6h12v6" />
      </g>
      <text x="32" y="54" fontFamily="Georgia,serif" fontSize="13" fill="#E9DCC0" textAnchor="middle">
        AS
      </text>
    </svg>
  );
}
