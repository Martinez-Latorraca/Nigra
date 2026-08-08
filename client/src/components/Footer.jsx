import { Link } from 'react-router-dom';
import MimoLogo from './MimoLogo';
import { MP_DONATION_URL, INSTAGRAM_URL } from '../utils/links';

const CURRENT_YEAR = new Date().getFullYear();

export default function Footer() {
    return (
        <footer className="bg-mimo-noche text-white font-sans">
            <div className="max-w-6xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-4 gap-10">
                <div className="md:col-span-1">
                    <MimoLogo variant="wordmark" size={132} bg="dark" />
                    <p className="text-sm text-white/60 font-medium mt-4">
                        Cada mascota merece un mimo.
                    </p>
                </div>

                <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-mimo-sol mb-4">
                        Producto
                    </div>
                    <ul className="space-y-2">
                        <li><Link to="/#pilares" className="text-sm text-white/80 hover:text-white transition-colors">Pilares</Link></li>
                        <li><Link to="/#como-funciona" className="text-sm text-white/80 hover:text-white transition-colors">Cómo funciona</Link></li>
                        <li><Link to="/#waitlist" className="text-sm text-white/80 hover:text-white transition-colors">Lista de espera</Link></li>
                    </ul>
                </div>

                <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-mimo-sol mb-4">
                        Comunidad
                    </div>
                    <ul className="space-y-2">
                        <li>
                            <a
                                href={INSTAGRAM_URL}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white transition-colors"
                            >
                                {/* Glifo de Instagram inline: evita sumar una librería de
                                    iconos entera por un solo símbolo. */}
                                <svg
                                    width="16" height="16" viewBox="0 0 24 24" fill="none"
                                    stroke="currentColor" strokeWidth="2"
                                    strokeLinecap="round" strokeLinejoin="round"
                                    aria-hidden="true" className="shrink-0"
                                >
                                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                                </svg>
                                @somos.mimo.uy
                            </a>
                        </li>
                        <li>
                            <a
                                href={MP_DONATION_URL}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sm text-white/80 hover:text-white transition-colors"
                            >
                                Invitanos un mimo <span aria-hidden="true">💖</span>
                            </a>
                        </li>
                    </ul>
                </div>

                <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-mimo-sol mb-4">
                        Legal
                    </div>
                    <ul className="space-y-2">
                        <li><Link to="/privacy" className="text-sm text-white/80 hover:text-white transition-colors">Política de privacidad</Link></li>
                    </ul>
                </div>
            </div>

            <div className="border-t border-white/10">
                <div className="max-w-6xl mx-auto px-6 py-6 text-center text-xs text-white/50 font-medium">
                    Hecho con <span aria-hidden="true">💖</span> en Montevideo, Uruguay · {CURRENT_YEAR}
                </div>
            </div>
        </footer>
    );
}
