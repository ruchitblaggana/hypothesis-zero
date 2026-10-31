// Shared UI components for Hypothesis Zero

import { type ReactNode } from 'react';

// ── Section header ────────────────────────────────────────────────────────
export function SectionHeader({ number, title, subtitle }: { number?: string; title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      {number && <div className="font-mono text-xs uppercase tracking-[0.25em] text-burgundy mb-1">№ {number}</div>}
      <h2 className="editorial-title text-2xl md:text-3xl text-ink">{title}</h2>
      {subtitle && <p className="text-ink-secondary text-sm mt-2 max-w-2xl">{subtitle}</p>}
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────
export function StatRow({ label, value, unit, emphasis }: { label: string; value: string; unit?: string; emphasis?: boolean }) {
  return (
    <div className="flex justify-between items-baseline py-1.5 border-b border-divider/60 last:border-0">
      <span className="text-sm text-ink-secondary">{label}</span>
      <span className={`font-mono ${emphasis ? 'text-burgundy font-semibold' : 'text-ink'}`}>
        {value}{unit && <span className="text-ink-secondary text-xs ml-1">{unit}</span>}
      </span>
    </div>
  );
}

// ── Warning box ───────────────────────────────────────────────────────────
export function WarningBox({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) return null;
  return (
    <div className="border-l-2 border-burgundy bg-burgundy/5 px-4 py-3 my-4" role="alert">
      <div className="font-mono text-xs uppercase tracking-wider text-burgundy mb-1.5">Analytical Warning</div>
      <ul className="space-y-1">
        {warnings.map((w, i) => (
          <li key={i} className="text-sm text-ink">{w}</li>
        ))}
      </ul>
    </div>
  );
}

// ── Annotation ────────────────────────────────────────────────────────────
export function Annotation({ children }: { children: ReactNode }) {
  return <span className="relative inline-block">
    <span className="absolute inset-x-0 bottom-0 h-[3px] bg-highlight -z-10 opacity-50" />
    {children}
  </span>;
}

// ── Empty state ───────────────────────────────────────────────────────────
export function EmptyState({ icon, title, message, action }: { icon?: ReactNode; title: string; message: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && <div className="text-ink-secondary mb-4">{icon}</div>}
      <h3 className="editorial-title text-xl text-ink mb-2">{title}</h3>
      <p className="text-ink-secondary text-sm max-w-md mb-6">{message}</p>
      {action}
    </div>
  );
}

// ── Panel ─────────────────────────────────────────────────────────────────
export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`bg-paper border border-divider ${className}`}>{children}</div>;
}

// ── Badge ─────────────────────────────────────────────────────────────────
const badgeColors: Record<string, string> = {
  supported: 'bg-evidence-green/15 text-evidence-green border-evidence-green/30',
  notSupported: 'bg-burgundy/15 text-burgundy border-burgundy/30',
  inconclusive: 'bg-highlight/20 text-ink border-highlight/40',
  requiresFurther: 'bg-research-blue/15 text-research-blue border-research-blue/30',
  notAssessed: 'bg-divider/30 text-ink-secondary border-divider',
  draft: 'bg-divider/30 text-ink-secondary border-divider',
  inProgress: 'bg-research-blue/15 text-research-blue border-research-blue/30',
  completed: 'bg-evidence-green/15 text-evidence-green border-evidence-green/30',
  archived: 'bg-ink-secondary/15 text-ink-secondary border-ink-secondary/30',
};

export function Badge({ status, label }: { status: string; label?: string }) {
  const cls = badgeColors[status] || badgeColors.notAssessed;
  const text = label || status.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
  return (
    <span className={`inline-block px-2.5 py-1 text-xs font-mono uppercase tracking-wider border ${cls}`}>
      {text}
    </span>
  );
}

// ── Confirm dialog ────────────────────────────────────────────────────────
export function ConfirmDialog({
  open, title, message, onConfirm, onCancel, confirmLabel = 'Confirm', danger,
}: {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  danger?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30" onClick={onCancel}>
      <div className="bg-paper border border-divider p-6 max-w-md mx-4" onClick={e => e.stopPropagation()}>
        <h3 className="editorial-title text-lg text-ink mb-2">{title}</h3>
        <p className="text-sm text-ink-secondary mb-5">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="btn-ghost">Cancel</button>
          <button onClick={onConfirm} className={danger ? 'btn-primary !bg-burgundy' : 'btn-primary'}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────
export function Tabs({ tabs, active, onChange }: { tabs: Array<{ id: string; label: string }>; active: string; onChange: (id: string) => void }) {
  return (
    <div className="flex gap-1 border-b border-divider overflow-x-auto">
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors relative ${
            active === t.id ? 'text-ink' : 'text-ink-secondary hover:text-ink'
          }`}
        >
          {t.label}
          {active === t.id && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-burgundy" />}
        </button>
      ))}
    </div>
  );
}
