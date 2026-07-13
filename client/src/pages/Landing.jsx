import { useEffect, useRef, useState } from 'react';
import MimoLogo from '../components/brand/MimoLogo';
import MorochaChow from '../components/brand/MorochaChow';
import PhoneMock from '../components/brand/PhoneMock';
import {
    ScreenRescate,
    ScreenUpload,
    ScreenMatches,
    ScreenMap,
    ScreenChat,
} from '../components/brand/AppScreens';

const MIMO = {
    coral: '#FF5C6C',
    teal: '#3ECFB2',
    sol: '#FFB830',
    violeta: '#9B6DFF',
    noche: '#1A1A2E',
    crema: '#FFF6F0',
    arena: '#F0EBE8',
    text: '#4A4A5A',
    subtle: '#9B8F8A',
};

const nunito = "'Nunito', 'Trebuchet MS', sans-serif";
const dm = "'DM Sans', system-ui, sans-serif";

function Wordmark({ color = MIMO.coral, size = '2rem' }) {
    return (
        <span
            style={{
                fontFamily: nunito,
                fontWeight: 900,
                fontSize: size,
                color,
                letterSpacing: '-0.03em',
                lineHeight: 1,
            }}
        >
            mimo
        </span>
    );
}

function Kicker({ children, color = MIMO.subtle }) {
    return (
        <div
            style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color,
                marginBottom: '1rem',
            }}
        >
            {children}
        </div>
    );
}

function SectionTitle({ children, color = MIMO.noche, align = 'center' }) {
    return (
        <h2
            style={{
                fontFamily: nunito,
                fontWeight: 900,
                fontSize: 'clamp(1.85rem, 5vw, 2.75rem)',
                letterSpacing: '-0.025em',
                lineHeight: 1.1,
                color,
                margin: 0,
                textAlign: align,
            }}
        >
            {children}
        </h2>
    );
}

export default function Landing() {
    const [count, setCount] = useState(null);
    const [form, setForm] = useState({ name: '', email: '', city: '' });
    const [status, setStatus] = useState('idle');
    const [errorMsg, setErrorMsg] = useState('');
    const [scrolled, setScrolled] = useState(false);
    const formRef = useRef(null);
    const API = import.meta.env.VITE_API_URL || '';

    useEffect(() => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href =
            'https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;800;900&family=DM+Sans:wght@400;500;600&display=swap';
        document.head.appendChild(link);
        return () => {
            document.head.removeChild(link);
        };
    }, []);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 32);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const refreshCount = () => {
        fetch(`${API}/api/waitlist/count`)
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
                if (d && typeof d.count === 'number') setCount(d.count);
            })
            .catch(() => {});
    };

    useEffect(() => {
        refreshCount();
    }, []);

    const scrollTo = (id) => (e) => {
        e?.preventDefault();
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (status === 'sending') return;
        setStatus('sending');
        setErrorMsg('');
        try {
            const res = await fetch(`${API}/api/waitlist`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'No se pudo registrar. Probá de nuevo.');
            setStatus('success');
            refreshCount();
        } catch (err) {
            setStatus('error');
            setErrorMsg(err.message);
        }
    };

    const inputStyle = {
        border: `1.5px solid ${MIMO.arena}`,
        borderRadius: 14,
        padding: '15px 18px',
        fontSize: '1rem',
        fontFamily: dm,
        outline: 'none',
        color: MIMO.noche,
        background: MIMO.crema,
        width: '100%',
        boxSizing: 'border-box',
    };

    return (
        <div
            style={{
                background: MIMO.crema,
                minHeight: '100vh',
                fontFamily: dm,
                color: MIMO.noche,
            }}
        >
            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.6; transform: scale(1.15); }
                }
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-8px); }
                }
                .mimo-btn:hover { transform: translateY(-2px); }
                .mimo-navlink:hover { color: ${MIMO.coral} !important; }
                @media (max-width: 720px) {
                    .mimo-nav-links { display: none !important; }
                }
            `}</style>

            {/* NAV STICKY */}
            <nav
                style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 50,
                    background: scrolled ? 'rgba(255,246,240,0.92)' : 'transparent',
                    backdropFilter: scrolled ? 'blur(10px)' : 'none',
                    borderBottom: scrolled ? `1px solid ${MIMO.arena}` : '1px solid transparent',
                    transition: 'all 0.25s ease',
                }}
            >
                <div
                    style={{
                        maxWidth: 1200,
                        margin: '0 auto',
                        padding: '14px 1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem',
                    }}
                >
                    <a
                        href="#hero"
                        onClick={scrollTo('hero')}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            textDecoration: 'none',
                        }}
                    >
                        <MimoLogo size={32} color={MIMO.coral} />
                        <Wordmark size="1.4rem" color={MIMO.noche} />
                    </a>
                    <div
                        className="mimo-nav-links"
                        style={{
                            display: 'flex',
                            gap: '2rem',
                            alignItems: 'center',
                        }}
                    >
                        {[
                            { id: 'pilares', label: 'Pilares' },
                            { id: 'como', label: 'Cómo funciona' },
                            { id: 'historia', label: 'Historia' },
                        ].map((l) => (
                            <a
                                key={l.id}
                                href={`#${l.id}`}
                                onClick={scrollTo(l.id)}
                                className="mimo-navlink"
                                style={{
                                    fontFamily: dm,
                                    fontWeight: 600,
                                    fontSize: '0.9rem',
                                    color: MIMO.text,
                                    textDecoration: 'none',
                                    transition: 'color 0.15s',
                                }}
                            >
                                {l.label}
                            </a>
                        ))}
                    </div>
                    <a
                        href="#waitlist"
                        onClick={scrollTo('waitlist')}
                        className="mimo-btn"
                        style={{
                            background: MIMO.coral,
                            color: '#fff',
                            textDecoration: 'none',
                            borderRadius: 40,
                            padding: '10px 20px',
                            fontFamily: nunito,
                            fontWeight: 800,
                            fontSize: '0.85rem',
                            boxShadow: '0 6px 18px rgba(255,92,108,0.28)',
                            transition: 'transform 0.15s',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        Avisame
                    </a>
                </div>
            </nav>

            {/* HERO */}
            <section
                id="hero"
                style={{
                    padding: '3rem 1.5rem 5rem',
                    maxWidth: 1200,
                    margin: '0 auto',
                    position: 'relative',
                }}
            >
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(0, 1fr) auto',
                        gap: 'clamp(2rem, 5vw, 4rem)',
                        alignItems: 'center',
                    }}
                    className="mimo-hero-grid"
                >
                    <div>
                        <Kicker color={MIMO.coral}>Adiós a los flyers en postes</Kicker>
                        <h1
                            style={{
                                fontFamily: nunito,
                                fontWeight: 900,
                                fontSize: 'clamp(2.4rem, 6vw, 4rem)',
                                letterSpacing: '-0.035em',
                                lineHeight: 1.05,
                                margin: '0 0 1.5rem',
                            }}
                        >
                            Cada mascota merece{' '}
                            <span style={{ color: MIMO.coral }}>un mimo.</span>
                        </h1>
                        <p
                            style={{
                                fontSize: 'clamp(1rem, 2.2vw, 1.2rem)',
                                lineHeight: 1.6,
                                maxWidth: 520,
                                color: MIMO.text,
                                margin: '0 0 2.25rem',
                            }}
                        >
                            Una app para encontrar mascotas perdidas con inteligencia artificial,
                            adoptar de forma responsable y proteger a tu compañero.
                        </p>
                        <div
                            style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                alignItems: 'center',
                                gap: '1rem 1.25rem',
                            }}
                        >
                            <a
                                href="#waitlist"
                                onClick={scrollTo('waitlist')}
                                className="mimo-btn"
                                style={{
                                    background: MIMO.coral,
                                    color: '#fff',
                                    textDecoration: 'none',
                                    border: 'none',
                                    borderRadius: 40,
                                    padding: '18px 32px',
                                    fontFamily: nunito,
                                    fontWeight: 800,
                                    fontSize: '1rem',
                                    boxShadow: '0 10px 28px rgba(255,92,108,0.32)',
                                    transition: 'transform 0.15s',
                                    display: 'inline-block',
                                }}
                            >
                                Sumate a la lista de espera
                            </a>
                            <span
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    color: MIMO.subtle,
                                }}
                            >
                                📱 Próximamente en tu celular
                            </span>
                        </div>
                    </div>
                    <div
                        style={{
                            position: 'relative',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}
                        className="mimo-hero-phone"
                    >
                        {/* Blob decorativo */}
                        <div
                            style={{
                                position: 'absolute',
                                width: 340,
                                height: 340,
                                borderRadius: '50%',
                                background: `radial-gradient(circle, ${MIMO.coral}33 0%, ${MIMO.coral}00 70%)`,
                                filter: 'blur(20px)',
                                zIndex: 0,
                            }}
                        />
                        <div style={{ position: 'relative', zIndex: 1, animation: 'float 6s ease-in-out infinite' }}>
                            <PhoneMock width={240}>
                                <ScreenRescate />
                            </PhoneMock>
                        </div>
                    </div>
                </div>
                <style>{`
                    @media (max-width: 900px) {
                        .mimo-hero-grid { grid-template-columns: 1fr !important; text-align: center; }
                        .mimo-hero-phone { justify-self: center; }
                        .mimo-hero-grid > div:first-child > p,
                        .mimo-hero-grid > div:first-child > h1 { margin-left: auto; margin-right: auto; }
                        .mimo-hero-grid > div:first-child > div:last-child { justify-content: center; }
                    }
                `}</style>
            </section>

            {/* PILARES */}
            <section id="pilares" style={{ background: '#fff', padding: '5rem 1.5rem' }}>
                <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
                        <Kicker>Los pilares</Kicker>
                        <SectionTitle>Tres formas de ayudar.</SectionTitle>
                    </div>
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                            gap: '1.5rem',
                        }}
                    >
                        {[
                            {
                                color: MIMO.coral,
                                emoji: '🔍',
                                title: 'Buscar y rescatar',
                                desc: 'Reportá una mascota perdida o encontrada y activá la red al instante.',
                            },
                            {
                                color: MIMO.teal,
                                emoji: '🐾',
                                title: 'Adoptar',
                                desc: 'Dale una segunda oportunidad a un animal que lo necesita.',
                            },
                            {
                                color: MIMO.violeta,
                                emoji: '🏠',
                                title: 'Proteger',
                                desc: 'Registrá a tu mascota y recibí alertas si alguien la reporta.',
                            },
                        ].map((p) => (
                            <div
                                key={p.title}
                                style={{
                                    background: '#fff',
                                    borderRadius: 24,
                                    overflow: 'hidden',
                                    border: `1.5px solid ${MIMO.arena}`,
                                    boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
                                }}
                            >
                                <div
                                    style={{
                                        background: p.color,
                                        padding: '2rem 1.5rem 1.75rem',
                                        textAlign: 'center',
                                        fontSize: '2.5rem',
                                    }}
                                >
                                    {p.emoji}
                                </div>
                                <div style={{ padding: '1.5rem' }}>
                                    <h3
                                        style={{
                                            fontFamily: nunito,
                                            fontWeight: 800,
                                            fontSize: '1.25rem',
                                            margin: '0 0 0.5rem',
                                            color: MIMO.noche,
                                        }}
                                    >
                                        {p.title}
                                    </h3>
                                    <p
                                        style={{
                                            fontSize: '0.95rem',
                                            lineHeight: 1.6,
                                            color: MIMO.text,
                                            margin: 0,
                                        }}
                                    >
                                        {p.desc}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* PRUEBA SOCIAL / TECNOLOGÍA REAL */}
            <section style={{ padding: '5rem 1.5rem' }}>
                <div style={{ maxWidth: 1000, margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
                        <Kicker>Tecnología real</Kicker>
                        <SectionTitle>No es un algoritmo cualquiera.</SectionTitle>
                    </div>
                    {count !== null && count > 0 && (
                        <div
                            style={{
                                textAlign: 'center',
                                marginBottom: '3rem',
                                background: '#fff',
                                borderRadius: 24,
                                padding: '2rem',
                                border: `1.5px solid ${MIMO.arena}`,
                                display: 'inline-block',
                                width: '100%',
                                boxSizing: 'border-box',
                            }}
                        >
                            <div
                                style={{
                                    fontFamily: nunito,
                                    fontWeight: 900,
                                    fontSize: 'clamp(3rem, 8vw, 4.5rem)',
                                    color: MIMO.coral,
                                    lineHeight: 1,
                                }}
                            >
                                {count.toLocaleString('es-UY')}
                            </div>
                            <div
                                style={{
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                    color: MIMO.subtle,
                                    letterSpacing: '0.1em',
                                    textTransform: 'uppercase',
                                    marginTop: '0.5rem',
                                }}
                            >
                                personas esperando el lanzamiento
                            </div>
                        </div>
                    )}
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                            gap: '1.5rem',
                        }}
                    >
                        {[
                            {
                                emoji: '🧬',
                                title: 'Nacido en UdelaR',
                                desc: 'Basado en técnicas de fotoidentificación de anfibios investigadas en Facultad de Ciencias.',
                                accent: MIMO.teal,
                            },
                            {
                                emoji: '🤖',
                                title: 'IA visual real',
                                desc: 'No compara raza ni color: compara los patrones únicos de cada mascota, individuo por individuo.',
                                accent: MIMO.coral,
                            },
                            {
                                emoji: '🇺🇾',
                                title: 'Hecho en Uruguay',
                                desc: 'Diseñado y desarrollado en Montevideo. Pensado para toda Latinoamérica desde el día uno.',
                                accent: MIMO.sol,
                            },
                        ].map((c) => (
                            <div
                                key={c.title}
                                style={{
                                    background: '#fff',
                                    borderRadius: 24,
                                    padding: '1.75rem',
                                    border: `1.5px solid ${MIMO.arena}`,
                                    position: 'relative',
                                    overflow: 'hidden',
                                }}
                            >
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        height: 4,
                                        background: c.accent,
                                    }}
                                />
                                <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>{c.emoji}</div>
                                <h3
                                    style={{
                                        fontFamily: nunito,
                                        fontWeight: 800,
                                        fontSize: '1.1rem',
                                        margin: '0 0 0.5rem',
                                        color: MIMO.noche,
                                    }}
                                >
                                    {c.title}
                                </h3>
                                <p
                                    style={{
                                        fontSize: '0.9rem',
                                        lineHeight: 1.6,
                                        color: MIMO.text,
                                        margin: 0,
                                    }}
                                >
                                    {c.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CÓMO FUNCIONA — zig-zag con phones */}
            <section id="como" style={{ background: '#fff', padding: '5rem 1.5rem' }}>
                <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '4.5rem' }}>
                        <Kicker>Cómo funciona</Kicker>
                        <SectionTitle>Encontrar a tu mascota, paso a paso.</SectionTitle>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4.5rem' }}>
                        {[
                            {
                                num: '01',
                                title: 'Subís una foto',
                                desc: 'Sacala en el momento o elegila de tu galería. Nuestra IA hace el resto — no necesitás describir raza ni color.',
                                screen: <ScreenUpload />,
                                accent: MIMO.sol,
                            },
                            {
                                num: '02',
                                title: 'La IA compara patrones visuales',
                                desc: 'Analiza rasgos únicos —forma, marcas, proporciones— y te devuelve las coincidencias ordenadas por similitud real.',
                                screen: <ScreenMatches />,
                                accent: MIMO.coral,
                            },
                            {
                                num: '03',
                                title: 'Filtramos por distancia',
                                desc: 'Solo te mostramos casos cerca tuyo. Nada de mascotas perdidas al otro lado del país que no podés ayudar.',
                                screen: <ScreenMap />,
                                accent: MIMO.teal,
                            },
                            {
                                num: '04',
                                title: 'Chat privado, sin exponer datos',
                                desc: 'Ni teléfono ni email. Solo un chat dentro de la app entre vos y la otra persona. Cuando el caso se cierra, el chat también.',
                                screen: <ScreenChat />,
                                accent: MIMO.violeta,
                            },
                        ].map((step, i) => {
                            const reverse = i % 2 === 1;
                            return (
                                <div
                                    key={step.num}
                                    className="mimo-step"
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: 'clamp(2rem, 5vw, 4rem)',
                                        alignItems: 'center',
                                        direction: reverse ? 'rtl' : 'ltr',
                                    }}
                                >
                                    <div style={{ direction: 'ltr' }}>
                                        <div
                                            style={{
                                                fontFamily: nunito,
                                                fontWeight: 900,
                                                fontSize: '3.5rem',
                                                color: step.accent,
                                                lineHeight: 1,
                                                marginBottom: '0.75rem',
                                            }}
                                        >
                                            {step.num}
                                        </div>
                                        <h3
                                            style={{
                                                fontFamily: nunito,
                                                fontWeight: 900,
                                                fontSize: 'clamp(1.5rem, 3.5vw, 2rem)',
                                                letterSpacing: '-0.02em',
                                                lineHeight: 1.15,
                                                margin: '0 0 1rem',
                                                color: MIMO.noche,
                                            }}
                                        >
                                            {step.title}
                                        </h3>
                                        <p
                                            style={{
                                                fontSize: '1.05rem',
                                                lineHeight: 1.65,
                                                color: MIMO.text,
                                                margin: 0,
                                                maxWidth: 460,
                                            }}
                                        >
                                            {step.desc}
                                        </p>
                                    </div>
                                    <div
                                        style={{
                                            direction: 'ltr',
                                            display: 'flex',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <PhoneMock width={220}>{step.screen}</PhoneMock>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <style>{`
                        @media (max-width: 780px) {
                            .mimo-step {
                                grid-template-columns: 1fr !important;
                                direction: ltr !important;
                                text-align: center;
                            }
                            .mimo-step > div:first-child > p { margin-left: auto; margin-right: auto; }
                        }
                    `}</style>
                </div>
            </section>

            {/* HISTORIA */}
            <section
                id="historia"
                style={{
                    background: `linear-gradient(135deg, ${MIMO.noche} 0%, #2D2B55 100%)`,
                    padding: '5rem 1.5rem',
                    color: '#fff',
                }}
            >
                <div
                    style={{
                        maxWidth: 950,
                        margin: '0 auto',
                        display: 'flex',
                        gap: '3rem',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        justifyContent: 'center',
                    }}
                >
                    <div style={{ textAlign: 'center', flex: '0 0 auto' }}>
                        <MorochaChow size={160} />
                        <div
                            style={{
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                letterSpacing: '0.15em',
                                textTransform: 'uppercase',
                                color: MIMO.sol,
                                marginTop: '0.75rem',
                            }}
                        >
                            La morocha
                        </div>
                    </div>
                    <div style={{ flex: '1 1 300px', maxWidth: 560 }}>
                        <Kicker color={MIMO.sol}>La historia</Kicker>
                        <h2
                            style={{
                                fontFamily: nunito,
                                fontWeight: 900,
                                fontSize: 'clamp(1.75rem, 4.5vw, 2.4rem)',
                                letterSpacing: '-0.02em',
                                lineHeight: 1.15,
                                margin: '0 0 1.5rem',
                            }}
                        >
                            Todo empezó en un laboratorio de biología.
                        </h2>
                        <p
                            style={{
                                fontSize: '1.05rem',
                                lineHeight: 1.75,
                                color: 'rgba(255,255,255,0.82)',
                                marginBottom: '1rem',
                            }}
                        >
                            El fundador viene de investigar fotoidentificación de anfibios en
                            Facultad de Ciencias UdelaR. La misma técnica de reconocer animales
                            individuales por patrones visuales es lo que Mimo aplica con IA para
                            mascotas perdidas.
                        </p>
                        <p
                            style={{
                                fontSize: '1.05rem',
                                lineHeight: 1.75,
                                color: '#fff',
                                fontWeight: 600,
                                margin: 0,
                            }}
                        >
                            La biología dio el problema. La programación dio la herramienta.
                        </p>
                    </div>
                </div>
            </section>

            {/* WAITLIST */}
            <section
                id="waitlist"
                ref={formRef}
                style={{
                    background: `linear-gradient(180deg, #FFE8EB 0%, ${MIMO.crema} 100%)`,
                    padding: '5rem 1.5rem',
                }}
            >
                <div style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>
                    <Kicker color={MIMO.coral}>Lista de espera</Kicker>
                    <SectionTitle>Sé de los primeros en usar Mimo.</SectionTitle>
                    <p
                        style={{
                            fontSize: '1rem',
                            color: MIMO.text,
                            margin: '1rem 0 2.5rem',
                        }}
                    >
                        Te avisamos apenas la app esté disponible en tu celular.
                    </p>
                    {status === 'success' ? (
                        <div
                            style={{
                                background: '#fff',
                                borderRadius: 24,
                                padding: '2.5rem',
                                boxShadow: '0 8px 32px rgba(255,92,108,0.15)',
                            }}
                        >
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
                            <h3
                                style={{
                                    fontFamily: nunito,
                                    fontWeight: 800,
                                    fontSize: '1.5rem',
                                    margin: '0 0 0.5rem',
                                }}
                            >
                                ¡Estás en la lista!
                            </h3>
                            <p style={{ color: MIMO.text, margin: 0 }}>
                                Te vamos a escribir apenas Mimo esté disponible.
                            </p>
                        </div>
                    ) : (
                        <form
                            onSubmit={handleSubmit}
                            style={{
                                background: '#fff',
                                borderRadius: 24,
                                padding: '2.5rem 2rem',
                                boxShadow: '0 8px 32px rgba(255,92,108,0.12)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '1rem',
                                textAlign: 'left',
                            }}
                        >
                            <input
                                required
                                type="text"
                                placeholder="Tu nombre"
                                value={form.name}
                                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                style={inputStyle}
                            />
                            <input
                                required
                                type="email"
                                placeholder="Tu email"
                                value={form.email}
                                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                                style={inputStyle}
                            />
                            <input
                                type="text"
                                placeholder="Ciudad (opcional)"
                                value={form.city}
                                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                                style={inputStyle}
                            />
                            <button
                                type="submit"
                                disabled={status === 'sending'}
                                style={{
                                    background: MIMO.coral,
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 40,
                                    padding: '18px',
                                    fontFamily: nunito,
                                    fontWeight: 800,
                                    fontSize: '1rem',
                                    cursor: status === 'sending' ? 'wait' : 'pointer',
                                    marginTop: '0.5rem',
                                    opacity: status === 'sending' ? 0.6 : 1,
                                    transition: 'opacity 0.15s',
                                }}
                            >
                                {status === 'sending' ? 'Enviando…' : 'Avisame cuando lance'}
                            </button>
                            {status === 'error' && (
                                <div
                                    style={{
                                        color: MIMO.coral,
                                        fontSize: '0.9rem',
                                        fontWeight: 600,
                                        textAlign: 'center',
                                    }}
                                >
                                    {errorMsg}
                                </div>
                            )}
                        </form>
                    )}
                </div>
            </section>

            {/* FOOTER */}
            <footer
                style={{
                    background: MIMO.noche,
                    color: '#fff',
                    padding: '4rem 1.5rem 2.5rem',
                }}
            >
                <div
                    style={{
                        maxWidth: 1000,
                        margin: '0 auto',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '2.5rem',
                        marginBottom: '3rem',
                    }}
                >
                    <div>
                        <div
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.6rem',
                                marginBottom: '1rem',
                            }}
                        >
                            <MimoLogo size={36} color="#fff" />
                            <Wordmark color="#fff" size="1.6rem" />
                        </div>
                        <p
                            style={{
                                fontSize: '0.85rem',
                                color: 'rgba(255,255,255,0.65)',
                                lineHeight: 1.6,
                                margin: 0,
                            }}
                        >
                            Cada mascota merece un mimo.
                        </p>
                    </div>
                    <div>
                        <div
                            style={{
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                letterSpacing: '0.15em',
                                textTransform: 'uppercase',
                                color: MIMO.sol,
                                marginBottom: '1rem',
                            }}
                        >
                            Producto
                        </div>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                            <li>
                                <a href="#pilares" onClick={scrollTo('pilares')} style={footerLinkStyle}>
                                    Pilares
                                </a>
                            </li>
                            <li>
                                <a href="#como" onClick={scrollTo('como')} style={footerLinkStyle}>
                                    Cómo funciona
                                </a>
                            </li>
                            <li>
                                <a href="#waitlist" onClick={scrollTo('waitlist')} style={footerLinkStyle}>
                                    Lista de espera
                                </a>
                            </li>
                        </ul>
                    </div>
                    <div>
                        <div
                            style={{
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                letterSpacing: '0.15em',
                                textTransform: 'uppercase',
                                color: MIMO.sol,
                                marginBottom: '1rem',
                            }}
                        >
                            Comunidad
                        </div>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                            <li>
                                <a
                                    href="https://instagram.com/somos.mimo.uy"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={footerLinkStyle}
                                >
                                    @somos.mimo.uy
                                </a>
                            </li>
                            <li>
                                <a
                                    href="https://link.mercadopago.com.uy/mimouy"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={footerLinkStyle}
                                >
                                    Invitanos un mimo 🩷
                                </a>
                            </li>
                        </ul>
                    </div>
                    <div>
                        <div
                            style={{
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                letterSpacing: '0.15em',
                                textTransform: 'uppercase',
                                color: MIMO.sol,
                                marginBottom: '1rem',
                            }}
                        >
                            Legal
                        </div>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                            <li>
                                <a
                                    href={`${API || ''}/privacy`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={footerLinkStyle}
                                >
                                    Política de privacidad
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>
                <div
                    style={{
                        maxWidth: 1000,
                        margin: '0 auto',
                        paddingTop: '2rem',
                        borderTop: '1px solid rgba(255,255,255,0.12)',
                        textAlign: 'center',
                        fontSize: '0.8rem',
                        color: 'rgba(255,255,255,0.5)',
                    }}
                >
                    Hecho con 🩷 en Montevideo, Uruguay · 2026
                </div>
            </footer>
        </div>
    );
}

const footerLinkStyle = {
    color: 'rgba(255,255,255,0.75)',
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: 500,
    transition: 'color 0.15s',
};
