// Mockups simplificados de las pantallas de la app, solo para uso decorativo
// en la landing. NO son componentes funcionales de la app real.
import MimoLogo from './MimoLogo';

const MIMO = {
    coral: '#FF5C6C',
    coralUrgent: '#FF3B4E',
    teal: '#3ECFB2',
    sol: '#FFB830',
    violeta: '#9B6DFF',
    noche: '#1A1A2E',
    crema: '#FFF6F0',
    arena: '#F0EBE8',
};

const nunito = "'Nunito', 'Trebuchet MS', sans-serif";
const dm = "'DM Sans', system-ui, sans-serif";
const f = (w, s, c) => ({ fontFamily: nunito, fontWeight: w, fontSize: s, color: c });
const fb = (w, s, c) => ({ fontFamily: dm, fontWeight: w, fontSize: s, color: c });

// Feed de alertas — hero.
export function ScreenRescate() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div
                style={{
                    background: MIMO.coral,
                    padding: '16px 14px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 9,
                }}
            >
                <MimoLogo size={26} color="#fff" />
                <span style={f(900, '1.2rem', '#fff')}>mimo</span>
            </div>
            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                <div style={f(800, '0.78rem', MIMO.noche)}>📍 Alertas cerca tuyo</div>
                <div
                    style={{
                        background: '#fff',
                        borderRadius: 14,
                        padding: 12,
                        boxShadow: '0 4px 14px rgba(0,0,0,0.07)',
                        borderLeft: `4px solid ${MIMO.coralUrgent}`,
                    }}
                >
                    <div
                        style={{
                            ...fb(700, '0.54rem', '#fff'),
                            background: MIMO.coralUrgent,
                            borderRadius: 20,
                            padding: '2px 8px',
                            display: 'inline-block',
                            marginBottom: 6,
                        }}
                    >
                        URGENTE · 2 H
                    </div>
                    <div style={f(800, '0.82rem', MIMO.noche)}>Luna — perdida en Pocitos</div>
                    <div style={fb(400, '0.65rem', '#9B8F8A')}>
                        Caniche · vista cerca de Rambla
                    </div>
                </div>
                <div
                    style={{
                        background: '#fff',
                        borderRadius: 14,
                        padding: 12,
                        boxShadow: '0 4px 14px rgba(0,0,0,0.07)',
                        display: 'flex',
                        gap: 10,
                        alignItems: 'center',
                    }}
                >
                    <div
                        style={{
                            width: 36,
                            height: 36,
                            background: MIMO.teal + '22',
                            borderRadius: 10,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.2rem',
                        }}
                    >
                        👀
                    </div>
                    <div>
                        <div style={f(800, '0.75rem', MIMO.noche)}>Avistamiento</div>
                        <div style={fb(400, '0.62rem', '#9B8F8A')}>
                            Alguien vio a Luna hace 20 min
                        </div>
                    </div>
                </div>
                <div
                    style={{
                        ...f(800, '0.78rem', '#fff'),
                        background: MIMO.coral,
                        borderRadius: 14,
                        padding: 12,
                        textAlign: 'center',
                    }}
                >
                    + Reportar mascota
                </div>
                <div style={{ flex: 1 }} />
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-around',
                        paddingTop: 10,
                        borderTop: `1px solid ${MIMO.arena}`,
                    }}
                >
                    {['🔍', '🏠', '🐾', '👤'].map((i) => (
                        <span key={i} style={{ fontSize: '1.05rem' }}>
                            {i}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}

// Cámara analizando foto — paso 1.
export function ScreenUpload() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div
                style={{
                    background: MIMO.noche,
                    padding: '16px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                }}
            >
                <span style={{ color: '#fff', fontSize: '1rem' }}>←</span>
                <span style={f(800, '0.85rem', '#fff')}>Nueva búsqueda</span>
            </div>
            <div style={{ padding: 14, flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={fb(600, '0.68rem', '#9B8F8A')}>PASO 1 DE 3</div>
                <div
                    style={{
                        background:
                            'linear-gradient(135deg, #FFB830 0%, #FF8C6C 100%)',
                        borderRadius: 18,
                        aspectRatio: '3/4',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '4rem',
                        position: 'relative',
                        overflow: 'hidden',
                    }}
                >
                    🐕
                    <div
                        style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            padding: '14px 12px',
                            background:
                                'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.55) 100%)',
                            color: '#fff',
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                marginBottom: 6,
                            }}
                        >
                            <div
                                style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    background: MIMO.teal,
                                    animation: 'pulse 1.5s infinite',
                                }}
                            />
                            <span style={fb(600, '0.65rem', '#fff')}>Analizando patrones…</span>
                        </div>
                        <div style={{ height: 4, background: 'rgba(255,255,255,0.25)', borderRadius: 3 }}>
                            <div style={{ width: '68%', height: '100%', background: MIMO.teal, borderRadius: 3 }} />
                        </div>
                    </div>
                </div>
                <div
                    style={{
                        ...f(800, '0.78rem', '#fff'),
                        background: MIMO.noche,
                        borderRadius: 14,
                        padding: 12,
                        textAlign: 'center',
                    }}
                >
                    Buscar coincidencias
                </div>
            </div>
        </div>
    );
}

// Grid de matches con % — paso 2.
export function ScreenMatches() {
    const matches = [
        { pct: 94, color: MIMO.coral, emoji: '🐕' },
        { pct: 87, color: MIMO.sol, emoji: '🐕‍🦺' },
        { pct: 71, color: MIMO.teal, emoji: '🐩' },
        { pct: 68, color: MIMO.teal, emoji: '🐕' },
    ];
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ background: MIMO.crema, padding: '14px 14px 10px' }}>
                <div style={fb(600, '0.62rem', '#9B8F8A')}>PASO 2 · RESULTADOS</div>
                <div style={f(800, '0.85rem', MIMO.noche)}>4 posibles coincidencias</div>
            </div>
            <div
                style={{
                    padding: 12,
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 10,
                    flex: 1,
                    background: MIMO.crema,
                }}
            >
                {matches.map((m, i) => (
                    <div
                        key={i}
                        style={{
                            background: '#fff',
                            borderRadius: 12,
                            overflow: 'hidden',
                            boxShadow: '0 3px 10px rgba(0,0,0,0.06)',
                            position: 'relative',
                        }}
                    >
                        <div
                            style={{
                                height: 62,
                                background:
                                    'linear-gradient(135deg, #F0EBE8 0%, #E5DED9 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.6rem',
                            }}
                        >
                            {m.emoji}
                        </div>
                        <div
                            style={{
                                position: 'absolute',
                                top: 6,
                                right: 6,
                                ...f(800, '0.55rem', '#fff'),
                                background: m.color,
                                borderRadius: 20,
                                padding: '2px 7px',
                            }}
                        >
                            {m.pct}%
                        </div>
                        <div style={{ padding: '6px 8px' }}>
                            <div style={f(800, '0.62rem', MIMO.noche)}>a 1.2 km</div>
                            <div style={fb(400, '0.5rem', '#9B8F8A')}>hace 3 h</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Mapa con radio de búsqueda — paso 3.
export function ScreenMap() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ background: MIMO.crema, padding: '14px 14px 8px' }}>
                <div style={fb(600, '0.62rem', '#9B8F8A')}>PASO 3 · FILTRO</div>
                <div style={f(800, '0.85rem', MIMO.noche)}>Cerca tuyo — 5 km</div>
            </div>
            <div
                style={{
                    flex: 1,
                    background:
                        'linear-gradient(135deg, #E8F5F0 0%, #F0F4E8 50%, #F5F0E8 100%)',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundImage:
                            'linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(0deg, rgba(0,0,0,0.04) 1px, transparent 1px)',
                        backgroundSize: '22px 22px',
                    }}
                />
                {/* Círculo de radio */}
                <div
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: 140,
                        height: 140,
                        borderRadius: '50%',
                        background: MIMO.coral + '22',
                        border: `2px solid ${MIMO.coral}`,
                    }}
                />
                {/* Pins */}
                {[
                    { top: '30%', left: '38%' },
                    { top: '55%', left: '62%' },
                    { top: '48%', left: '32%' },
                    { top: '68%', left: '50%' },
                ].map((p, i) => (
                    <div
                        key={i}
                        style={{
                            position: 'absolute',
                            top: p.top,
                            left: p.left,
                            transform: 'translate(-50%, -50%)',
                        }}
                    >
                        <MimoLogo size={22} color={MIMO.coral} />
                    </div>
                ))}
                {/* User pin */}
                <div
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        background: MIMO.noche,
                        border: '3px solid #fff',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                    }}
                />
            </div>
            <div
                style={{
                    background: '#fff',
                    padding: 12,
                    borderTop: `1px solid ${MIMO.arena}`,
                }}
            >
                <div style={fb(600, '0.62rem', '#9B8F8A')}>RADIO</div>
                <div style={f(800, '0.85rem', MIMO.noche)}>5 km · 4 alertas</div>
            </div>
        </div>
    );
}

// Chat privado — paso 4.
export function ScreenChat() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: MIMO.crema }}>
            <div
                style={{
                    background: '#fff',
                    padding: '14px 14px 12px',
                    textAlign: 'center',
                    borderBottom: `1px solid ${MIMO.arena}`,
                }}
            >
                <div
                    style={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        background:
                            'linear-gradient(135deg, #FFB830, #FF8C6C)',
                        margin: '0 auto 6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.4rem',
                    }}
                >
                    🐕
                </div>
                <div style={fb(700, '0.55rem', '#9B8F8A')}>COMUNIDAD MIMO</div>
                <div style={f(800, '0.72rem', MIMO.noche)}>Hablando con Ana</div>
            </div>
            <div
                style={{
                    flex: 1,
                    padding: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    justifyContent: 'flex-end',
                }}
            >
                <div
                    style={{
                        alignSelf: 'flex-start',
                        maxWidth: '82%',
                        background: '#fff',
                        border: `1px solid ${MIMO.arena}`,
                        borderRadius: 16,
                        padding: '8px 12px',
                        ...fb(500, '0.68rem', MIMO.noche),
                        lineHeight: 1.4,
                    }}
                >
                    ¡Hola! Creo que vi a tu perro en el parque.
                </div>
                <div
                    style={{
                        alignSelf: 'flex-end',
                        maxWidth: '82%',
                        background: MIMO.noche,
                        borderRadius: 16,
                        padding: '8px 12px',
                        ...fb(500, '0.68rem', '#fff'),
                        lineHeight: 1.4,
                    }}
                >
                    Gracias 🩷 ¿En qué parte?
                </div>
                <div
                    style={{
                        alignSelf: 'flex-start',
                        maxWidth: '82%',
                        background: '#fff',
                        border: `1px solid ${MIMO.arena}`,
                        borderRadius: 16,
                        padding: '8px 12px',
                        ...fb(500, '0.68rem', MIMO.noche),
                        lineHeight: 1.4,
                    }}
                >
                    En Villa Biarritz, hace 10 min.
                </div>
            </div>
            <div
                style={{
                    background: '#fff',
                    padding: 10,
                    borderTop: `1px solid ${MIMO.arena}`,
                    display: 'flex',
                    gap: 6,
                    alignItems: 'center',
                }}
            >
                <div
                    style={{
                        flex: 1,
                        background: MIMO.crema,
                        borderRadius: 20,
                        padding: '8px 12px',
                        ...fb(400, '0.62rem', '#9B8F8A'),
                    }}
                >
                    Escribir mensaje…
                </div>
                <div
                    style={{
                        width: 30,
                        height: 30,
                        borderRadius: '50%',
                        background: MIMO.noche,
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.9rem',
                    }}
                >
                    →
                </div>
            </div>
        </div>
    );
}
