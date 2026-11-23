import { Mail, AtSign, Smartphone } from 'lucide-react';
import Wordmark from './Wordmark';
import { C } from '../utils/theme';
import { INSTAGRAM_URL, CONTACT_EMAIL } from '../utils/links';

// Mismo footer Noche que la landing. Los links de "Mimo" y "Sumate" llevan a
// las secciones de la landing.
const COLS = [
    ['Mimo', [['Cómo funciona', '/#como'], ['Preguntas frecuentes', '/#faq'], ['Apoyar', '/#apoyar']]],
    ['Sumate', [['Veterinarias', '/vets'], ['Refugios', '/shelters'], ['Socio Mimo', '/#vets']]],
];

const colTitle = 'm-0 text-[13px] font-bold uppercase tracking-[.1em]';

export default function Footer() {
    return (
        <footer className="px-5 md:px-20 pt-[72px] pb-10 flex flex-col gap-14 font-sans" style={{ background: C.noche, color: C.crema }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr] gap-12 items-start">
                <div className="flex flex-col gap-[18px] max-w-[380px]">
                    <Wordmark size={30} color={C.crema} />
                    <p className="m-0 text-base leading-[1.55]">
                        Comunidad de reencuentro animal. Hecha en Uruguay para que cada mascota vuelva a casa.
                    </p>
                    <span className="self-start flex items-center gap-2 h-[34px] px-3.5 rounded-full text-[13px] font-bold" style={{ background: C.noche2 }}>
                        <Smartphone size={16} strokeWidth={2} />
                        Próximamente en iPhone y Android
                    </span>
                </div>
                {COLS.map(([title, links]) => (
                    <div key={title} className="flex flex-col gap-3.5">
                        <p className={colTitle} style={{ color: C.lavanda }}>{title}</p>
                        {links.map(([label, href]) => (
                            <a key={label} href={href} className="text-base font-medium no-underline hover:opacity-80" style={{ color: C.crema }}>
                                {label}
                            </a>
                        ))}
                    </div>
                ))}
                <div className="flex flex-col gap-3.5">
                    <p className={colTitle} style={{ color: C.lavanda }}>Contacto</p>
                    <a href={`mailto:${CONTACT_EMAIL}`} className="flex items-center gap-2.5 text-[15px] font-medium no-underline [overflow-wrap:anywhere] hover:opacity-80" style={{ color: C.crema }}>
                        <Mail size={18} strokeWidth={2} className="shrink-0" />
                        {CONTACT_EMAIL}
                    </a>
                    <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-base font-medium no-underline hover:opacity-80" style={{ color: C.crema }}>
                        <AtSign size={18} strokeWidth={2} className="shrink-0" />
                        somos.mimo.uy
                    </a>
                </div>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-7 text-sm" style={{ borderTop: `1px solid ${C.linea}`, color: C.lavanda }}>
                <span>© {new Date().getFullYear()} Mimo · mimo.uy</span>
                <a href="/privacy" className="no-underline hover:opacity-80" style={{ color: C.lavanda }}>Privacidad</a>
            </div>
        </footer>
    );
}
