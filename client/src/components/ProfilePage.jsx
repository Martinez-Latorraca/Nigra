// Partes compartidas de las fichas de refugio y de veterinaria
// (Web-refugio-ficha, Web-vet-ficha): portada con volver, tarjeta flotante
// con logo/nombre/acciones, lista de contactos y horarios.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, MapPin, Share2, MessageCircle, Phone, Mail, Globe, AtSign } from 'lucide-react';
import { C } from '../utils/theme';

const HOURS_ORDER = [
    ['mon', 'Lunes'], ['tue', 'Martes'], ['wed', 'Miércoles'],
    ['thu', 'Jueves'], ['fri', 'Viernes'], ['sat', 'Sábado'], ['sun', 'Domingo'],
];

export const cardLabel = 'm-0 text-xs font-bold tracking-[.08em] uppercase';

export function ProfileCover({ coverUrl, backTo, backLabel, color }) {
    return (
        <div className="relative h-[200px] md:h-[300px] bg-mimo-muted overflow-hidden">
            {coverUrl && <img src={coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />}
            <Link
                to={backTo}
                className="absolute top-6 left-4 md:left-12 xl:left-[120px] flex items-center gap-1 h-11 pl-2.5 pr-4 rounded-full text-[15px] font-bold text-mimo-muted hover:opacity-90"
                style={{ background: color }}
            >
                <ChevronLeft size={20} strokeWidth={2} />
                {backLabel}
            </Link>
        </div>
    );
}

// Tarjeta blanca que se monta sobre la portada.
export function ProfileHeader({ logoUrl, name, color, kicker, badge, place, whatsappHref, shareText, shareUrl, onContact }) {
    const [copied, setCopied] = useState(false);
    const share = async () => {
        if (navigator.share) {
            try { await navigator.share({ text: shareText, url: shareUrl }); } catch { /* cancelado */ }
            return;
        }
        try {
            await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch {
            window.prompt('Copiá el link para compartir:', shareUrl);
        }
    };
    return (
        <section className="bg-white rounded-[32px] p-5 md:p-7 flex flex-col md:flex-row md:items-center gap-5 md:gap-[22px] shadow-[0_8px_24px_rgba(26,26,46,.08)]">
            {logoUrl ? (
                <img src={logoUrl} alt="" className="w-20 h-20 md:w-24 md:h-24 rounded-[28px] object-cover bg-mimo-muted shrink-0" />
            ) : (
                <span className="w-20 h-20 md:w-24 md:h-24 rounded-[28px] flex items-center justify-center font-display font-black text-[40px] text-mimo-muted shrink-0" style={{ background: color }}>
                    {name.charAt(0).toUpperCase()}
                </span>
            )}
            <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                <p className="m-0 text-[13px] font-bold tracking-[.08em] uppercase">{kicker}</p>
                {badge}
                <h1 className="m-0 font-display font-black text-3xl md:text-[40px] leading-[1.05] break-words">{name}</h1>
                {place && (
                    <span className="flex items-center gap-1.5 text-[15px]">
                        <MapPin size={16} strokeWidth={2} className="shrink-0" />
                        {place}
                    </span>
                )}
            </div>
            <div className="flex gap-2.5">
                <button
                    type="button"
                    onClick={share}
                    className="flex-1 md:flex-none h-[52px] px-[22px] rounded-2xl border-2 border-mimo-noche font-bold text-[15px] flex items-center justify-center gap-2 hover:bg-mimo-warm transition-colors whitespace-nowrap"
                >
                    <Share2 size={18} strokeWidth={2} />
                    {copied ? 'Link copiado' : 'Compartir'}
                </button>
                {whatsappHref && (
                    <a
                        href={whatsappHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={onContact}
                        className="flex-1 md:flex-none h-[52px] px-[22px] rounded-2xl bg-mimo-noche hover:bg-mimo-nocheAlt text-mimo-warm font-bold text-[15px] flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
                    >
                        <MessageCircle size={18} strokeWidth={2} />
                        WhatsApp
                    </a>
                )}
            </div>
        </section>
    );
}

const RowIcon = ({ icon }) => {
    const Icon = icon;
    return <Icon size={20} strokeWidth={2} color={C.arena} />;
};

const handle = (ig) => String(ig).replace(/^@/, '');

// Lista de contactos con ícono del color de la sección. Solo muestra los
// que existen; `onClick` sirve para contar clics de contacto (vets).
export function ContactList({ entity, color, onClick }) {
    const wa = entity.whatsapp ? `https://wa.me/${String(entity.whatsapp).replace(/[^\d]/g, '')}` : null;
    const rows = [
        ['Teléfono', Phone, entity.phone, entity.phone ? `tel:${entity.phone}` : null],
        ['WhatsApp', MessageCircle, entity.whatsapp, wa],
        ['Email', Mail, entity.email, entity.email ? `mailto:${entity.email}` : null],
        ['Sitio web', Globe, entity.website?.replace(/^https?:\/\//, '').replace(/\/$/, ''), entity.website],
        ['Instagram', AtSign, entity.instagram ? `@${handle(entity.instagram)}` : null, entity.instagram ? `https://instagram.com/${handle(entity.instagram)}` : null],
    ].filter(([, , value]) => value);
    if (rows.length === 0) return null;
    return (
        <section className="bg-white rounded-3xl px-5 py-2 flex flex-col">
            {rows.map(([label, icon, value, href], i) => (
                <a
                    key={label}
                    href={href}
                    target={href?.startsWith('http') ? '_blank' : undefined}
                    rel="noopener noreferrer"
                    onClick={onClick}
                    className={`group flex items-center gap-3.5 py-3 ${i > 0 ? 'border-t border-mimo-muted' : ''}`}
                >
                    <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: color }}>
                        <RowIcon icon={icon} />
                    </span>
                    <span className="flex-1 min-w-0 flex flex-col">
                        <span className="text-[11px] font-bold tracking-[.08em] uppercase">{label}</span>
                        <span className="text-[15px] font-medium truncate group-hover:text-mimo-coral">{value}</span>
                    </span>
                    <ChevronRight size={18} strokeWidth={2} className="shrink-0" />
                </a>
            ))}
        </section>
    );
}

export function HoursCard({ hours }) {
    if (!hours || Object.keys(hours).length === 0) return null;
    const rows = HOURS_ORDER.filter(([k]) => hours[k]);
    if (rows.length === 0) return null;
    return (
        <section className="bg-white rounded-3xl p-[22px] flex flex-col gap-3">
            <p className={cardLabel}>Horarios</p>
            <div>
                {rows.map(([k, label]) => (
                    <div key={k} className="flex justify-between gap-4 py-2.5 border-t border-mimo-muted text-[15px]">
                        <b>{label}</b>
                        <span className="text-right">{hours[k]}</span>
                    </div>
                ))}
            </div>
        </section>
    );
}

export function TextCard({ title, children }) {
    return (
        <section className="bg-white rounded-3xl p-[22px] flex flex-col gap-3">
            <p className={cardLabel}>{title}</p>
            <p className="m-0 text-base leading-[1.55] whitespace-pre-line break-words">{children}</p>
        </section>
    );
}

export function ProfileSkeleton() {
    return (
        <div className="flex-1 bg-mimo-warm animate-pulse" aria-label="Cargando">
            <div className="h-[200px] md:h-[300px] bg-mimo-muted" />
            <div className="max-w-[1200px] mx-auto px-4 md:px-6 xl:px-0 -mt-20 relative pb-20 flex flex-col gap-5">
                <div className="h-36 rounded-[32px] bg-white" />
                <div className="h-40 rounded-3xl bg-white" />
            </div>
        </div>
    );
}

export function ProfileNotFound({ message, backTo, backLabel }) {
    return (
        <div className="flex-1 bg-mimo-warm flex flex-col items-center justify-center p-6 text-center text-mimo-noche">
            <p className="font-display font-black text-7xl m-0">404</p>
            <p className="mt-3 mb-8 text-base">{message}</p>
            <Link to={backTo} className="h-12 px-6 rounded-[18px] bg-mimo-noche text-mimo-warm font-bold flex items-center">
                {backLabel}
            </Link>
        </div>
    );
}
