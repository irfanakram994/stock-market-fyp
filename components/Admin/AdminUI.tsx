'use client';

import { Loader, Search, Inbox, RefreshCw } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type React from 'react';

type Tone = 'blue' | 'green' | 'red' | 'amber' | 'purple' | 'slate' | 'cyan';
type RoleTone = 'admin' | 'super';

const roleToneClasses: Record<RoleTone, { accent: string; focus: string; buttonHover: string }> = {
  admin: {
    accent: 'text-emerald-300',
    focus: 'focus:border-emerald-300/60',
    buttonHover: 'hover:border-emerald-300/40 hover:text-emerald-200',
  },
  super: {
    accent: 'text-fuchsia-300',
    focus: 'focus:border-fuchsia-300/60',
    buttonHover: 'hover:border-fuchsia-300/40 hover:text-fuchsia-200',
  },
};

const toneClasses: Record<Tone, { icon: string; soft: string; text: string; border: string }> = {
  blue: { icon: 'text-teal-300', soft: 'bg-teal-400/10', text: 'text-teal-200', border: 'border-teal-300/20' },
  green: { icon: 'text-emerald-300', soft: 'bg-emerald-500/10', text: 'text-emerald-200', border: 'border-emerald-400/20' },
  red: { icon: 'text-red-300', soft: 'bg-red-500/10', text: 'text-red-200', border: 'border-red-400/20' },
  amber: { icon: 'text-lime-300', soft: 'bg-lime-300/10', text: 'text-lime-200', border: 'border-lime-300/20' },
  purple: { icon: 'text-emerald-300', soft: 'bg-emerald-400/10', text: 'text-emerald-200', border: 'border-emerald-300/20' },
  cyan: { icon: 'text-emerald-300', soft: 'bg-emerald-300/10', text: 'text-emerald-200', border: 'border-emerald-300/20' },
  slate: { icon: 'text-slate-300', soft: 'bg-slate-500/10', text: 'text-slate-200', border: 'border-slate-500/30' },
};

export function AdminPageHeader({
  title,
  description,
  icon: Icon,
  actions,
  tone = 'admin',
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  tone?: RoleTone;
}) {
  const roleTone = roleToneClasses[tone];
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        {Icon && (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-700/60 bg-slate-900/80">
            <Icon className={`h-5 w-5 ${roleTone.accent}`} />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-normal text-white md:text-3xl">{title}</h1>
          {description && <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function AdminMetricCard({
  title,
  value,
  icon: Icon,
  detail,
  tone = 'blue',
}: {
  title: string;
  value: string | number;
  icon: LucideIcon;
  detail?: string;
  tone?: Tone;
}) {
  const toneClass = toneClasses[tone];
  return (
    <div className={`rounded-lg border ${toneClass.border} bg-slate-900/70 p-5 shadow-lg shadow-black/10`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-400">{title}</p>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${toneClass.soft}`}>
          <Icon className={`h-5 w-5 ${toneClass.icon}`} />
        </div>
      </div>
      <p className="text-2xl font-semibold text-white">{value}</p>
      {detail && <p className="mt-1 text-sm text-slate-500">{detail}</p>}
    </div>
  );
}

export function StatusPill({ active, activeText = 'Active', inactiveText = 'Inactive' }: { active: boolean; activeText?: string; inactiveText?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded px-2.5 py-1 text-xs font-semibold ${
        active ? 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-400/20' : 'bg-red-500/10 text-red-300 ring-1 ring-red-400/20'
      }`}
    >
      <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${active ? 'bg-emerald-300' : 'bg-red-300'}`} />
      {active ? activeText : inactiveText}
    </span>
  );
}

export function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-slate-800 bg-slate-900/70 shadow-xl shadow-black/10 ${className}`}>{children}</div>;
}

export function LoadingState({ label = 'Loading...', tone = 'admin' }: { label?: string; tone?: RoleTone }) {
  const roleTone = roleToneClasses[tone];
  return (
    <div className="flex min-h-[220px] items-center justify-center rounded-lg border border-slate-800 bg-slate-900/50">
      <div className="text-center">
        <Loader className={`mx-auto mb-3 h-7 w-7 animate-spin ${roleTone.accent}`} />
        <p className="text-sm text-slate-400">{label}</p>
      </div>
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex min-h-[220px] items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-900/40 p-8 text-center">
      <div>
        <Inbox className="mx-auto mb-3 h-9 w-9 text-slate-500" />
        <p className="font-medium text-white">{title}</p>
        {description && <p className="mt-1 text-sm text-slate-400">{description}</p>}
      </div>
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  tone = 'admin',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  tone?: RoleTone;
}) {
  const roleTone = roleToneClasses[tone];
  return (
    <div className="relative min-w-0 flex-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`h-11 w-full rounded-lg border border-slate-700 bg-slate-950/70 pl-10 pr-3 text-sm text-white outline-none transition-colors placeholder:text-slate-500 ${roleTone.focus}`}
      />
    </div>
  );
}

export function RefreshButton({ onClick, loading, tone = 'admin' }: { onClick: () => void; loading?: boolean; tone?: RoleTone }) {
  const roleTone = roleToneClasses[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={`inline-flex h-10 items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 ${roleTone.buttonHover}`}
    >
      <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
      Refresh
    </button>
  );
}
