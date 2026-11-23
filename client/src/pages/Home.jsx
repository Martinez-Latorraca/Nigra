import { useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Camera, Map as MapIcon, HeartHandshake, HouseHeart, Stethoscope } from 'lucide-react';
import { C, SECTION } from '../utils/theme';

// Inicio (Web-home). "Cerca tuyo", Mimo Protect y Héroes Mimo del diseño
// quedan afuera, igual que en la app: son funciones nuevas (ver
// mobile/REDISENO-PENDIENTES.md).
const SECTIONS = [
    { to: '/pets', title: 'Explorar', sub: 'Reportes de mascotas en tu zona.', color: SECTION.explorar, icon: MapIcon },
    { to: '/adoptions', title: 'En adopción', sub: 'Mascotas que buscan una familia.', color: SECTION.adopciones, icon: HeartHandshake },
    { to: '/shelters', title: 'Refugios', sub: 'Conocé y apoyá a los refugios aliados.', color: SECTION.refugios, icon: HouseHeart },
    { to: '/vets', title: 'Veterinarias', sub: 'Clínicas cerca que reciben alertas.', color: C.noche, icon: Stethoscope },
];

function SectionIcon({ icon }) {
    const Icon = icon;
    return <Icon size={30} strokeWidth={2} />;
}

function Home() {
    const navigate = useNavigate();
    const token = useSelector(state => state.user?.token);
    const user = useSelector(state => state.user?.data);
    const firstName = (user?.name || '').trim().split(/\s+/)[0];

    // Los dos botones entran al mismo flujo de reporte.
    const startReport = () => navigate(token ? '/reportar' : '/login');

    return (
        <div className="flex-1 bg-mimo-warm font-sans text-mimo-noche">
            <main className="w-full max-w-[1200px] mx-auto px-4 md:px-6 xl:px-0 pt-10 md:pt-12 pb-20 flex flex-col gap-8 md:gap-9">
                <div className="flex flex-col gap-2">
                    <h1 className="m-0 font-display font-black text-4xl md:text-5xl leading-[1.05] break-words">
                        {firstName ? `Hola, ${firstName}` : 'Hola'}
                    </h1>
                    <p className="m-0 text-lg">Una comunidad que ayuda a las mascotas a volver a casa.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[1fr_476px] gap-6">
                    <section className="rounded-[32px] md:rounded-[40px] p-7 md:p-10 flex flex-col gap-7 bg-mimo-coral text-mimo-muted">
                        <div className="flex flex-col gap-4">
                            <h2 className="m-0 font-display font-black text-3xl md:text-[40px] leading-[1.1]">
                                ¿Perdiste o encontraste una mascota?
                            </h2>
                            <p className="m-0 text-base md:text-lg leading-normal max-w-[540px]">
                                Subí una foto y la buscamos entre los reportes cercanos. Si no aparece, publicás el aviso en un paso.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <button onClick={startReport} className="h-14 px-[22px] rounded-2xl bg-mimo-noche text-mimo-warm font-bold text-[15px] flex items-center gap-2 hover:bg-mimo-nocheAlt transition-colors">
                                <Search size={18} strokeWidth={2} />
                                Perdí la mía
                            </button>
                            <button onClick={startReport} className="h-14 px-[22px] rounded-2xl bg-mimo-warm text-mimo-noche font-bold text-[15px] flex items-center gap-2 hover:bg-white transition-colors">
                                <Camera size={18} strokeWidth={2} />
                                Encontré una
                            </button>
                        </div>
                    </section>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {SECTIONS.map(({ to, title, sub, color, icon }) => (
                            <Link
                                key={to}
                                to={to}
                                className="rounded-3xl md:rounded-[28px] p-[26px] min-h-[160px] md:min-h-[190px] flex flex-col justify-between gap-5 hover:opacity-90 transition-opacity"
                                style={{ background: color, color: C.arena }}
                            >
                                <SectionIcon icon={icon} />
                                <span className="flex flex-col gap-1.5">
                                    <b className="font-display font-black text-2xl">{title}</b>
                                    <span className="text-sm leading-snug">{sub}</span>
                                </span>
                            </Link>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}

export default Home;
