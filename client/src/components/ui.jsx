// Piezas visuales compartidas de la web (mismo sistema que la app):
// banda de color de cada sección, pastillas de filtro, chips y estado vacío.
import { Star } from 'lucide-react';
import { C } from '../utils/theme';
import { tierOf } from '../utils/sponsorTiers';

// Banda de color arriba de los listados (radio inferior 48, título Nunito 52).
export function SectionBand({ color, title, subtitle, action }) {
    return (
        <section
            className="rounded-b-[32px] md:rounded-b-[48px] px-4 md:px-12 xl:px-[120px] pt-8 md:pt-10 pb-9 md:pb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 md:gap-10"
            style={{ background: color, color: C.arena }}
        >
            <div className="flex flex-col gap-2.5 max-w-[760px]">
                <h1 className="m-0 font-display font-black text-[40px] md:text-[52px] leading-[1.05]">{title}</h1>
                {subtitle && <p className="m-0 text-base md:text-lg leading-normal">{subtitle}</p>}
            </div>
            {action}
        </section>
    );
}

// Contenedor de la página bajo la banda.
export function PageBody({ children, className = '' }) {
    return (
        <main className={`px-4 md:px-12 xl:px-[120px] pt-7 md:pt-9 pb-20 flex flex-col gap-7 ${className}`}>
            {children}
        </main>
    );
}

export function FilterChip({ active, onClick, children }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={`flex items-center h-11 px-[18px] rounded-full text-[15px] whitespace-nowrap transition-colors ${
                active ? 'bg-mimo-noche text-mimo-warm font-bold' : 'bg-white border border-mimo-muted font-medium hover:border-mimo-noche'
            }`}
        >
            {children}
        </button>
    );
}

export function ChipDivider() {
    return <span className="w-px h-7 bg-mimo-muted mx-1.5 shrink-0" aria-hidden="true" />;
}

export function StatusChip({ color, children, small }) {
    return (
        <span
            className={`shrink-0 self-start rounded-full text-mimo-muted font-bold whitespace-nowrap ${small ? 'px-3 py-1 text-[11px]' : 'px-3.5 py-[5px] text-[13px]'}`}
            style={{ background: color }}
        >
            {children}
        </span>
    );
}

// "★ Socio Mimo · Nation" en el color del plan. Nada para vets sin plan.
export function TierChip({ vet }) {
    const tier = tierOf(vet);
    if (!tier) return null;
    return (
        <span
            className="self-start flex items-center gap-1 px-2.5 py-[3px] rounded-full text-[11px] font-bold whitespace-nowrap"
            style={{ background: tier.color, color: C.arena }}
        >
            <Star size={11} strokeWidth={2} fill="currentColor" />
            {tier.label} · {tier.tierLabel}
        </span>
    );
}

export function Count({ children }) {
    return <p className="m-0 text-[13px] font-bold tracking-[.08em] uppercase">{children}</p>;
}

export function EmptyState({ icon: Icon, color = C.sol, title, text, action }) {
    return (
        <div className="col-span-full flex flex-col items-center text-center py-16 px-6 bg-white rounded-3xl">
            {Icon && (
                <span className="w-16 h-16 rounded-full flex items-center justify-center mb-5" style={{ background: color }}>
                    <Icon size={28} strokeWidth={2} color={C.crema} />
                </span>
            )}
            <p className="m-0 font-display font-black text-2xl">{title}</p>
            {text && <p className="mt-2 mb-0 text-[15px] max-w-sm leading-normal">{text}</p>}
            {action && <div className="mt-6">{action}</div>}
        </div>
    );
}

export function OutlineButton({ children, className = '', ...props }) {
    return (
        <button
            type="button"
            className={`h-[52px] px-6 rounded-2xl border-2 border-mimo-noche font-bold text-[15px] flex items-center justify-center gap-2 hover:bg-white transition-colors disabled:opacity-50 ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}

// Grilla de tarjetas: 4 columnas en escritorio (3 para refugios y vets).
export function CardGrid({ cols = 4, children }) {
    const lg = cols === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-3 xl:grid-cols-4';
    return <div className={`grid grid-cols-1 sm:grid-cols-2 ${lg} gap-5`}>{children}</div>;
}

export function SkeletonGrid({ cols = 4, count = 8 }) {
    return (
        <CardGrid cols={cols}>
            {Array.from({ length: count }, (_, i) => (
                <div key={i} className="bg-white rounded-3xl p-3 flex flex-col gap-3 animate-pulse">
                    <div className="h-[200px] rounded-[18px] bg-mimo-muted" />
                    <div className="h-3 w-24 rounded bg-mimo-muted mx-1.5" />
                    <div className="h-5 w-32 rounded bg-mimo-muted mx-1.5 mb-3" />
                </div>
            ))}
        </CardGrid>
    );
}
