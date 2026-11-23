// Layout y piezas de las pantallas de cuenta (Web-login, Web-registro,
// Web-tipo-cuenta, Web-recuperar, Web-nueva-contrasena, Web-email-verificado):
// pantalla partida con el panel Noche y la red de colores a la izquierda y
// el formulario a la derecha, sin Navbar ni Footer.
import { Link } from 'react-router-dom';
import { Check, CircleAlert, PawPrint, Stethoscope, HouseHeart } from 'lucide-react';
import Wordmark from './Wordmark';
import { C } from '../utils/theme';

export function AuthLayout({ children }) {
    return (
        <div className="min-h-screen flex bg-mimo-warm font-sans text-mimo-noche">
            <aside className="hidden lg:flex relative flex-[0_0_600px] overflow-hidden bg-mimo-noche text-mimo-warm p-14 flex-col gap-[18px]">
                <Link to="/" className="self-start relative z-[1]"><Wordmark size={30} color={C.crema} /></Link>
                <h2 className="relative z-[1] mt-16 mb-0 font-display font-black text-[48px] leading-[1.05]">Que cada mascota vuelva a casa.</h2>
                <p className="relative z-[1] m-0 text-lg leading-normal max-w-[440px]">
                    Una comunidad de vecinos, veterinarias y refugios que se ayudan a reencontrar mascotas.
                </p>
                {/* Misma red de la landing, recortada a la izquierda. */}
                <div className="absolute left-0 bottom-0 w-[600px] h-[380px] overflow-hidden pointer-events-none" aria-hidden="true">
                    <img src="/landing/red-cta.svg" alt="" className="absolute left-0 bottom-0 h-[380px] w-[1440px] max-w-none" />
                </div>
            </aside>
            <main className="flex-1 min-w-0 flex flex-col items-center justify-center px-4 py-10 md:py-14">
                <div className="w-full max-w-[440px] flex flex-col gap-6">
                    <Link to="/" className="lg:hidden self-start"><Wordmark size={26} /></Link>
                    {children}
                </div>
            </main>
        </div>
    );
}

export function AuthTitle({ title, subtitle }) {
    return (
        <div className="flex flex-col gap-2.5">
            <h1 className="m-0 font-display font-black text-[34px] md:text-[38px] leading-[1.1]">{title}</h1>
            {subtitle && <p className="m-0 text-base leading-normal">{subtitle}</p>}
        </div>
    );
}

// Campo con etiqueta en mayúsculas e ícono a la izquierda.
export function Field({ label, icon, error, hint, className = '', ...inputProps }) {
    const Icon = icon;
    return (
        <label className={`flex flex-col gap-1.5 min-w-0 ${className}`}>
            <span className="text-xs font-bold tracking-[.08em] uppercase">{label}</span>
            <span className={`flex items-center gap-2.5 h-[52px] px-4 rounded-2xl bg-white border focus-within:border-mimo-noche ${error ? 'border-mimo-coral border-2' : 'border-mimo-muted'}`}>
                {Icon && <Icon size={18} strokeWidth={2} className="shrink-0" />}
                <input className="flex-1 min-w-0 bg-transparent outline-none text-[15px] placeholder:text-mimo-noche/60" {...inputProps} />
            </span>
            {error && <span className="text-[13px] font-bold text-mimo-coral">{error}</span>}
            {!error && hint && <span className="text-[13px]">{hint}</span>}
        </label>
    );
}

export function PrimaryButton({ children, className = '', ...props }) {
    return (
        <button
            className={`w-full h-14 rounded-2xl bg-mimo-coral hover:bg-mimo-coralDark text-mimo-muted font-bold text-[15px] flex items-center justify-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}

export function PrimaryLink({ to, children }) {
    return (
        <Link to={to} className="w-full h-14 rounded-2xl bg-mimo-coral hover:bg-mimo-coralDark text-mimo-muted font-bold text-[15px] flex items-center justify-center transition-colors">
            {children}
        </Link>
    );
}

// Aviso en tarjeta blanca. tone: 'error' (Coral) | 'info'.
export function Notice({ tone = 'info', children }) {
    return (
        <div className={`flex items-start gap-2.5 p-4 rounded-2xl bg-white text-sm leading-[1.45] ${tone === 'error' ? 'text-mimo-coral font-bold' : ''}`} role={tone === 'error' ? 'alert' : undefined}>
            <CircleAlert size={18} strokeWidth={2} className={`shrink-0 mt-px ${tone === 'error' ? '' : 'text-mimo-coral'}`} />
            <div className="flex-1 min-w-0 flex flex-col gap-2.5">{children}</div>
        </div>
    );
}

// Ícono grande en cuadrado de color (estados: email enviado, verificado…).
export function StateIcon({ icon, color = C.teal }) {
    const Icon = icon;
    return (
        <span className="w-[72px] h-[72px] rounded-[22px] flex items-center justify-center" style={{ background: color }}>
            <Icon size={34} strokeWidth={2} color={C.arena} />
        </span>
    );
}

const ACCOUNT_TYPES = [
    { id: 'user', icon: PawPrint, color: C.coral, title: 'Busco / reporto mascotas', desc: 'Uso Mimo para encontrar o reportar mascotas.' },
    { id: 'vet', icon: Stethoscope, color: C.noche, title: 'Represento una veterinaria', desc: 'Publico mascotas encontradas y recibo alertas.' },
    { id: 'shelter', icon: HouseHeart, color: C.teal, title: 'Represento un refugio', desc: 'Publico mascotas en adopción y las promociono.' },
];

export function AccountTypePicker({ value, onChange, disabled }) {
    return (
        <div className="flex flex-col gap-2.5" role="radiogroup" aria-label="Tipo de cuenta">
            {ACCOUNT_TYPES.map(({ id, icon, color, title, desc }) => {
                const active = value === id;
                const TypeIcon = icon;
                return (
                    <button
                        key={id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => onChange(id)}
                        disabled={disabled}
                        className={`flex items-center gap-3 p-3 rounded-2xl bg-white text-left transition-colors ${active ? 'border-2 border-mimo-noche' : 'border border-mimo-muted hover:border-mimo-noche'}`}
                    >
                        <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: color }}>
                            <TypeIcon size={20} strokeWidth={2} color={C.arena} />
                        </span>
                        <span className="flex-1 min-w-0 flex flex-col">
                            <b className="text-[15px]">{title}</b>
                            <span className="text-[13px] leading-snug">{desc}</span>
                        </span>
                        <span className={`w-[22px] h-[22px] rounded-full flex items-center justify-center shrink-0 ${active ? 'bg-mimo-noche' : 'border-2 border-mimo-muted'}`}>
                            {active && <Check size={13} strokeWidth={3} color={C.crema} />}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

export function AuthFooterLink({ text, to, linkText }) {
    return (
        <p className="m-0 text-center text-[15px]">
            {text}{' '}
            <Link to={to} className="font-bold underline hover:text-mimo-coral">{linkText}</Link>
        </p>
    );
}
