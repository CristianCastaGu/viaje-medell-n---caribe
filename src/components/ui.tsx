import React from 'react';
import { CityCode } from '../types';
import { CITY_STYLE, cityCodeFromName } from '../lib/cityTheme';

// Piezas compartidas del sistema visual "Ruta Caribe": chips, puntos de
// ciudad, encabezados de sección y el boleto estilo boarding-pass que usan
// Hospedaje y Transporte. Centralizadas aquí para que las tres vistas
// nuevas se vean como una sola cosa y no como tres pantallas distintas.

export function formatCOP(amount: number): string {
  return '$' + Math.round(amount || 0).toLocaleString('es-CO');
}

type ChipTone = 'neutral' | 'ok' | 'wait' | 'bad';

export const Chip: React.FC<{ tone?: ChipTone; children: React.ReactNode }> = ({
  tone = 'neutral',
  children,
}) => {
  const tones: Record<ChipTone, string> = {
    neutral: 'bg-soft text-ink2',
    ok: 'bg-ok/15 text-ok font-semibold',
    wait: 'bg-baq/20 text-ink',
    bad: 'bg-bad/15 text-bad font-semibold',
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[13px] font-medium px-2.5 py-0.5 rounded-full ${tones[tone]}`}
    >
      {children}
    </span>
  );
};

export const CityDot: React.FC<{ city: string }> = ({ city }) => (
  <span
    className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${
      CITY_STYLE[cityCodeFromName(city)].dot
    }`}
    aria-hidden="true"
  />
);

export const SectionHeader: React.FC<{
  title: string;
  lead?: string;
  actions?: React.ReactNode;
}> = ({ title, lead, actions }) => (
  <div className="flex justify-between items-end gap-3 flex-wrap mb-4">
    <div>
      <h2 className="text-[clamp(26px,4.4vw,38px)] font-bold tracking-[-0.03em] leading-[1.08] text-ink">
        {title}
      </h2>
      {lead && <p className="text-ink2 max-w-[62ch] text-[17px] mt-1.5">{lead}</p>}
    </div>
    {actions && <div className="flex gap-2.5 flex-wrap items-center">{actions}</div>}
  </div>
);

export const Button: React.FC<{
  variant?: 'solid' | 'ghost' | 'danger';
  size?: 'md' | 'sm';
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  children: React.ReactNode;
}> = ({ variant = 'solid', size = 'md', onClick, type = 'button', disabled, children }) => {
  const variants = {
    solid: 'bg-ink text-bg border-ink hover:opacity-90',
    ghost: 'bg-transparent text-ink border-line hover:border-ink',
    danger: 'bg-bad text-white border-bad hover:opacity-90',
  };
  const sizes = {
    md: 'px-[18px] py-2.5 text-[15px] rounded-xl min-h-[44px]',
    sm: 'px-3 py-1.5 text-[13px] rounded-[9px] min-h-[40px]',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 border-[1.5px] font-semibold transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]}`}
    >
      {children}
    </button>
  );
};

export const FilterPill: React.FC<{
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={`border-[1.5px] rounded-full px-3.5 py-1.5 text-sm font-medium min-h-[44px] transition-colors cursor-pointer ${
      active ? 'bg-ink text-bg border-ink' : 'bg-surface text-ink2 border-line hover:text-ink'
    }`}
  >
    {children}
  </button>
);

export const EmptyState: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="border-[1.5px] border-dashed border-line rounded-2xl p-6 text-ink2">
    {children}
  </div>
);

export const NoteBanner: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="border-l-4 border-baq bg-baq/10 px-3.5 py-3 rounded-r-xl text-[15px] text-ink mb-4">
    {children}
  </div>
);

/**
 * Boleto estilo boarding-pass: talón de color a la izquierda (o arriba en
 * celular), cuerpo en el centro, precio a la derecha.
 */
export const Ticket: React.FC<{
  city: CityCode;
  stubTop: React.ReactNode;
  stubBottom: React.ReactNode;
  children: React.ReactNode;
  end: React.ReactNode;
}> = ({ city, stubTop, stubBottom, children, end }) => (
  <article
    className="rc-ticket"
    style={{ ['--rc-c' as string]: `var(--color-${city})` }}
  >
    <div className="rc-stub">
      <b className="block text-[26px] leading-none tracking-[-0.04em] font-bold text-ink">
        {stubTop}
      </b>
      <span className="text-[13px] text-ink2">{stubBottom}</span>
    </div>
    <div className="p-4">{children}</div>
    <div className="p-4 text-right flex flex-col gap-1.5 items-end justify-between max-sm:flex-row max-sm:items-center max-sm:text-left max-sm:flex-wrap">
      {end}
    </div>
  </article>
);

export const Surface: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div className={`bg-surface border border-line rounded-2xl p-5 sm:p-6 ${className}`}>
    {children}
  </div>
);

export const Modal: React.FC<{
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-xs grid place-items-center p-4">
    <div className="bg-surface rounded-2xl max-w-md w-full p-6 shadow-2xl grid gap-4 max-h-[calc(100vh-2rem)] overflow-auto">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-ink">{title}</h3>
        <button
          onClick={onClose}
          className="text-ink2 hover:text-ink text-sm cursor-pointer"
          aria-label="Cerrar"
        >
          ✕
        </button>
      </div>
      {children}
    </div>
  </div>
);

export const Field: React.FC<{
  label: string;
  children: React.ReactNode;
}> = ({ label, children }) => (
  <label className="grid gap-1.5">
    <span className="text-sm font-semibold text-ink">{label}</span>
    {children}
  </label>
);

export const inputCls =
  'w-full border-[1.5px] border-line bg-surface rounded-[11px] px-3 py-2.5 text-ink placeholder:text-ink2/60';

export const TotalRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between gap-3 px-1 py-4 border-t-[3px] border-ink mt-[18px] font-bold text-xl text-ink">
    <span>{label}</span>
    <span>{value}</span>
  </div>
);
