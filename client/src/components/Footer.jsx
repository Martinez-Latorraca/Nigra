import { Link } from 'react-router-dom';
import MimoLogo from './MimoLogo';

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
                                href="https://instagram.com/somos.mimo.uy"
                                target="_blank"
                                rel="noreferrer"
                                className="text-sm text-white/80 hover:text-white transition-colors"
                            >
                                @somos.mimo.uy
                            </a>
                        </li>
                        <li>
                            <a
                                href="https://mpago.la/1"
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
