import { useEffect, useRef, useState } from 'react';
import MimoLogo from '../components/brand/MimoLogo';
import MorochaChow from '../components/brand/MorochaChow';

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

function SectionKicker({ children, color = MIMO.subtle }) {
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

function SectionTitle({ children, color = MIMO.noche }) {
    return (
        <h2
            style={{
                fontFamily: nunito,
                fontWeight: 900,
                fontSize: 'clamp(1.75rem, 5vw, 2.5rem)',
                letterSpacing: '-0.02em',
                lineHeight: 1.15,
                color,
                margin: 0,
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

    const scrollToForm = () =>
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

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
            {/* HERO */}
            <section
                style={{
                    padding: '3.5rem 1.5rem 5rem',
                    maxWidth: 1000,
                    margin: '0 auto',
                    textAlign: 'center',
                }}
            >
                <div
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        marginBottom: '3rem',
                    }}
                >
                    <MimoLogo size={52} color={MIMO.coral} />
                    <Wordmark size="2.4rem" />
                </div>
                <h1
                    style={{
                        fontFamily: nunito,
                        fontWeight: 900,
                        fontSize: 'clamp(2.5rem, 8vw, 4.5rem)',
                        letterSpacing: '-0.035em',
                        lineHeight: 1.05,
                        marginBottom: '1.5rem',
                    }}
                >
                    Cada mascota merece
                    <br />
                    <span style={{ color: MIMO.coral }}>un mimo.</span>
                </h1>
                <p
                    style={{
                        fontSize: 'clamp(1rem, 2.2vw, 1.2rem)',
                        lineHeight: 1.6,
                        maxWidth: 620,
                        margin: '0 auto 2.5rem',
                        color: MIMO.text,
                    }}
                >
                    Una app para encontrar mascotas perdidas con inteligencia artificial, adoptar de
                    forma responsable y proteger a tu compañero.
                </p>
                <button
                    onClick={scrollToForm}
                    style={{
                        background: MIMO.coral,
                        color: '#fff',
                        border: 'none',
                        borderRadius: 40,
                        padding: '18px 36px',
                        fontFamily: nunito,
                        fontWeight: 800,
                        fontSize: '1rem',
                        cursor: 'pointer',
                        boxShadow: '0 10px 28px rgba(255,92,108,0.32)',
                        transition: 'transform 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                >
                    Quiero que me avisen
                </button>
                <div style={{ marginTop: '2.5rem' }}>
                    <span
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            background: '#fff',
                            border: `1.5px solid ${MIMO.arena}`,
                            borderRadius: 40,
                            padding: '9px 20px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            color: MIMO.subtle,
                        }}
                    >
                        📱 Próximamente en tu celular
                    </span>
                </div>
            </section>

            {/* PILARES */}
            <section style={{ background: '#fff', padding: '5rem 1.5rem' }}>
                <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
                        <SectionKicker>Los pilares</SectionKicker>
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

            {/* CÓMO FUNCIONA */}
            <section style={{ padding: '5rem 1.5rem' }}>
                <div style={{ maxWidth: 800, margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
                        <SectionKicker>Cómo funciona</SectionKicker>
                        <SectionTitle>Encontrar a tu mascota, paso a paso.</SectionTitle>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {[
                            'Subís una foto de la mascota',
                            'La IA compara por similitud visual real, no por raza ni color',
                            'Filtra resultados por distancia cerca tuyo',
                            'Te conecta por chat privado sin exponer tus datos',
                        ].map((step, i) => (
                            <div
                                key={i}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1.25rem',
                                    background: '#fff',
                                    padding: '1.25rem 1.5rem',
                                    borderRadius: 20,
                                    border: `1.5px solid ${MIMO.arena}`,
                                }}
                            >
                                <div
                                    style={{
                                        background: MIMO.coral,
                                        color: '#fff',
                                        width: 44,
                                        height: 44,
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontFamily: nunito,
                                        fontWeight: 900,
                                        fontSize: '1.15rem',
                                        flexShrink: 0,
                                    }}
                                >
                                    {i + 1}
                                </div>
                                <div
                                    style={{
                                        fontSize: '1rem',
                                        color: MIMO.noche,
                                        fontWeight: 500,
                                        lineHeight: 1.4,
                                    }}
                                >
                                    {step}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* POR QUÉ */}
            <section style={{ background: '#fff', padding: '5rem 1.5rem' }}>
                <div style={{ maxWidth: 720, margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                        <SectionKicker>Por qué Mimo</SectionKicker>
                        <SectionTitle>Lo que nos hace distintos.</SectionTitle>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {[
                            'La búsqueda siempre es gratis',
                            'Inteligencia artificial visual real',
                            'Chat anónimo, sin exponer teléfono ni email',
                            'Cero venta de animales, solo adopción responsable',
                            'Hecho en Uruguay para toda Latinoamérica',
                        ].map((line, i, arr) => (
                            <div
                                key={i}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1rem',
                                    padding: '1.25rem 0',
                                    borderBottom:
                                        i === arr.length - 1 ? 'none' : `1px solid ${MIMO.arena}`,
                                }}
                            >
                                <div
                                    style={{
                                        width: 8,
                                        height: 8,
                                        background: MIMO.coral,
                                        borderRadius: '50%',
                                        flexShrink: 0,
                                    }}
                                />
                                <div
                                    style={{
                                        fontSize: '1.05rem',
                                        color: MIMO.noche,
                                        fontWeight: 500,
                                    }}
                                >
                                    {line}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* HISTORIA */}
            <section
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
                        <SectionKicker color={MIMO.sol}>La historia</SectionKicker>
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
                            El fundador viene de investigar fotoidentificación de anfibios en Facultad de
                            Ciencias UdelaR. La misma técnica de reconocer animales individuales por
                            patrones visuales es lo que Mimo aplica con IA para mascotas perdidas.
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
                ref={formRef}
                style={{
                    background: `linear-gradient(180deg, #FFE8EB 0%, ${MIMO.crema} 100%)`,
                    padding: '5rem 1.5rem',
                }}
            >
                <div style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>
                    <SectionKicker color={MIMO.coral}>Lista de espera</SectionKicker>
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
                    {count !== null && count > 0 && (
                        <div
                            style={{
                                marginTop: '1.5rem',
                                fontSize: '0.9rem',
                                color: MIMO.subtle,
                                fontWeight: 500,
                            }}
                        >
                            Ya somos{' '}
                            <strong style={{ color: MIMO.coral }}>
                                {count.toLocaleString('es-UY')}
                            </strong>{' '}
                            esperando
                        </div>
                    )}
                </div>
            </section>

            {/* FOOTER */}
            <footer
                style={{
                    background: MIMO.noche,
                    color: '#fff',
                    padding: '4rem 1.5rem 3rem',
                    textAlign: 'center',
                }}
            >
                <div
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        marginBottom: '2rem',
                    }}
                >
                    <MimoLogo size={40} color="#fff" />
                    <Wordmark color="#fff" size="1.8rem" />
                </div>
                <div
                    style={{
                        display: 'flex',
                        gap: '1.5rem',
                        justifyContent: 'center',
                        flexWrap: 'wrap',
                        marginBottom: '2.5rem',
                        alignItems: 'center',
                    }}
                >
                    <a
                        href="https://instagram.com/somos.mimo.uy"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            color: '#fff',
                            textDecoration: 'none',
                            fontSize: '0.95rem',
                            fontWeight: 600,
                        }}
                    >
                        @somos.mimo.uy
                    </a>
                    <span style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
                    <a
                        href="https://link.mercadopago.com.uy/mimouy"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            color: '#fff',
                            textDecoration: 'none',
                            fontSize: '0.95rem',
                            fontWeight: 600,
                        }}
                    >
                        Invitanos un mimo 🩷
                    </a>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                    Hecho con 🩷 en Montevideo, Uruguay · 2026
                </div>
            </footer>
        </div>
    );
}
