import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

const API = import.meta.env.VITE_API_URL || '';

const STATUS_LABEL = { lost: 'Perdida', found: 'Encontrada', resolved: 'Reencontrada' };

function StatTile({ label, value, hint, accent }) {
    return (
        <div
            className="rounded-[32px] border border-gray-100 bg-white p-6"
            style={accent ? { borderTop: `4px solid ${accent}` } : {}}
        >
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
                {label}
            </div>
            <div className="mt-2 text-4xl font-semibold tracking-tight text-gray-900">
                {value}
            </div>
            {hint ? <div className="mt-1 text-xs font-medium text-gray-400">{hint}</div> : null}
        </div>
    );
}

function AlertsConfig({ vet, token, onUpdate }) {
    const [receivesLost, setReceivesLost] = useState(vet.receives_lost);
    const [receivesFound, setReceivesFound] = useState(vet.receives_found);
    const [radius, setRadius] = useState(vet.alert_radius_km);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState('');
    const [err, setErr] = useState('');

    const maxRadius = vet.plan === 'ally' ? 5 : 50;

    const save = async () => {
        setSaving(true);
        setMsg('');
        setErr('');
        try {
            const res = await fetch(`${API}/api/vets/me/alerts`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    receives_lost: receivesLost,
                    receives_found: receivesFound,
                    alert_radius_km: radius,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'No se pudo guardar.');
            setMsg('Guardado.');
            onUpdate?.(data);
        } catch (e) {
            setErr(e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="rounded-[32px] border border-gray-100 bg-white p-8">
            <span className="mb-6 block text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
                Configuración de alertas
            </span>
            <div className="space-y-4">
                <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-gray-100 p-4 transition-all hover:bg-gray-50">
                    <div>
                        <div className="text-sm font-semibold text-gray-900">Mascotas perdidas</div>
                        <div className="text-xs text-gray-400">Recibir alertas cuando reporten una mascota perdida en tu radio.</div>
                    </div>
                    <input
                        type="checkbox"
                        checked={receivesLost}
                        onChange={(e) => setReceivesLost(e.target.checked)}
                        className="h-5 w-5 accent-[#FF5C6C]"
                    />
                </label>
                <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-gray-100 p-4 transition-all hover:bg-gray-50">
                    <div>
                        <div className="text-sm font-semibold text-gray-900">Mascotas encontradas</div>
                        <div className="text-xs text-gray-400">Recibir alertas cuando reporten una mascota encontrada.</div>
                    </div>
                    <input
                        type="checkbox"
                        checked={receivesFound}
                        onChange={(e) => setReceivesFound(e.target.checked)}
                        className="h-5 w-5 accent-[#FF5C6C]"
                    />
                </label>
                <div className="rounded-2xl border border-gray-100 p-4">
                    <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-gray-900">
                            Radio de alerta
                        </div>
                        <div className="text-2xl font-semibold text-[#FF5C6C]">{radius} km</div>
                    </div>
                    <input
                        type="range"
                        min={1}
                        max={maxRadius}
                        value={radius}
                        onChange={(e) => setRadius(Number(e.target.value))}
                        className="mt-3 w-full accent-[#FF5C6C]"
                    />
                    {vet.plan === 'ally' ? (
                        <div className="mt-2 text-xs text-gray-400">
                            Plan gratis: hasta 5 km.{' '}
                            <span className="font-semibold text-[#C98800]">
                                Socio Mimo extiende a 50 km.
                            </span>
                        </div>
                    ) : (
                        <div className="mt-2 text-xs text-gray-400">Socio Mimo · hasta 50 km.</div>
                    )}
                </div>
            </div>
            <button
                onClick={save}
                disabled={saving}
                className="mt-6 w-full rounded-full bg-black py-4 text-sm font-semibold text-white transition-all hover:bg-gray-800 disabled:opacity-50"
            >
                {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
            {msg ? (
                <div className="mt-3 rounded-2xl bg-green-50 p-3 text-center text-xs font-semibold text-green-600">
                    {msg}
                </div>
            ) : null}
            {err ? (
                <div className="mt-3 rounded-2xl bg-red-50 p-3 text-center text-xs font-semibold text-red-500">
                    {err}
                </div>
            ) : null}
        </div>
    );
}

export default function VetDashboard() {
    const token = useSelector((s) => s.user?.token);
    const navigate = useNavigate();
    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = async () => {
        try {
            const res = await fetch(`${API}/api/vets/me/dashboard`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'No se pudo cargar.');
            setDashboard(data);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#F5F5F7]">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 animate-pulse">
                    Cargando
                </div>
            </div>
        );
    }

    if (error === 'No tenés una veterinaria registrada.') {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-[#F5F5F7] p-6 text-center">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
                    Panel Vet
                </div>
                <h1 className="mt-4 text-4xl font-semibold text-black">
                    Todavía no tenés una vet.
                </h1>
                <p className="mt-4 max-w-md text-gray-500">
                    Registrate como veterinaria para publicar mascotas encontradas, recibir alertas
                    y sumarte a la red.
                </p>
                <Link
                    to="/vets"
                    className="mt-8 rounded-full bg-black px-8 py-3 font-semibold text-white"
                >
                    Ir al directorio
                </Link>
            </div>
        );
    }

    if (error || !dashboard) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-[#F5F5F7] p-6 text-center">
                <p className="text-gray-500">{error || 'Error inesperado.'}</p>
            </div>
        );
    }

    const { vet, stats, recent_pets, recent_alerts } = dashboard;
    const successRate = stats.total_pets > 0
        ? Math.round((stats.resolved_pets / stats.total_pets) * 100)
        : null;

    return (
        <div className="min-h-screen bg-[#F5F5F7] pb-20 font-sans text-gray-900">
            <div className="mx-auto w-full max-w-6xl px-6 pt-16">
                <span className="mb-4 block text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
                    Panel Vet
                </span>
                <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
                    <div className="flex items-center gap-4">
                        {vet.logo_url ? (
                            <img
                                src={vet.logo_url}
                                alt=""
                                className="h-16 w-16 rounded-2xl object-cover shadow-md"
                            />
                        ) : (
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FF5C6C] text-2xl font-bold text-white shadow-md">
                                {vet.name.charAt(0)}
                            </div>
                        )}
                        <div>
                            <h1 className="text-4xl font-semibold tracking-tight text-black md:text-5xl">
                                {vet.name}.
                            </h1>
                            <div className="mt-1 flex items-center gap-2">
                                {vet.is_sponsor ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-[#FFB830] px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-white">
                                        ⭐ Socio Mimo
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-gray-500">
                                        Aliada
                                    </span>
                                )}
                                {!vet.approved && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-red-500">
                                        Pendiente aprobación
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Link
                            to={`/vets/${vet.slug}`}
                            className="rounded-full border border-gray-200 bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-gray-600 hover:bg-gray-50"
                        >
                            Ver perfil público
                        </Link>
                    </div>
                </div>

                {/* Stats */}
                <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatTile label="Mascotas publicadas" value={stats.total_pets} accent="#FF5C6C" />
                    <StatTile
                        label="Reencontradas"
                        value={stats.resolved_pets}
                        hint={successRate !== null ? `${successRate}% tasa de reunión` : null}
                        accent="#3ECFB2"
                    />
                    <StatTile
                        label="Alertas recibidas"
                        value={stats.total_alerts}
                        hint={stats.unread_alerts > 0 ? `${stats.unread_alerts} sin leer` : 'al día'}
                        accent="#FFB830"
                    />
                    <StatTile
                        label="Radio de alerta"
                        value={`${vet.alert_radius_km} km`}
                        hint={vet.plan === 'ally' ? 'Ally (máx 5)' : 'Socio Mimo'}
                        accent="#9B6DFF"
                    />
                </div>

                {/* CTA sponsor */}
                {!vet.is_sponsor && (
                    <div className="mt-8 rounded-[32px] bg-gradient-to-br from-[#FFB830] to-[#FF8C6C] p-8 text-white">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <div className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70">
                                    Sumate como
                                </div>
                                <h2 className="mt-1 text-3xl font-semibold tracking-tight">
                                    Socio Mimo ⭐
                                </h2>
                                <p className="mt-2 max-w-md text-sm opacity-90">
                                    Alcance de alertas hasta 50 km, card destacada en el directorio,
                                    badge visible en cada publicación y dashboard extendido.
                                </p>
                            </div>
                            <a
                                href="mailto:somos.mimo.app@gmail.com?subject=Quiero%20ser%20Socio%20Mimo"
                                className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-100"
                            >
                                Contactar
                            </a>
                        </div>
                    </div>
                )}

                {/* Grid principal */}
                <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <div className="space-y-6 lg:col-span-2">
                        {/* Últimos pets */}
                        <div className="rounded-[32px] border border-gray-100 bg-white p-8">
                            <div className="mb-6 flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
                                    Últimas publicaciones
                                </span>
                            </div>
                            {recent_pets.length === 0 ? (
                                <div className="py-10 text-center text-sm text-gray-400">
                                    Todavía no publicaste mascotas.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {recent_pets.map((p) => (
                                        <Link
                                            key={p.id}
                                            to={`/pet/${p.id}`}
                                            className="flex items-center gap-4 rounded-2xl border border-gray-100 p-3 transition-all hover:bg-gray-50"
                                        >
                                            <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-gray-100">
                                                {p.photo_url ? (
                                                    <img src={p.photo_url} className="h-full w-full object-cover" alt="" />
                                                ) : null}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="text-sm font-semibold text-gray-900 truncate">
                                                    {p.name || (p.status === 'lost' ? 'Sin nombre' : 'Encontrada')}
                                                </div>
                                                <div className="text-xs text-gray-400 truncate">
                                                    {p.address || 'Sin ubicación'}
                                                </div>
                                            </div>
                                            <span
                                                className="rounded-full px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-white"
                                                style={{
                                                    background: p.resolved_at
                                                        ? '#3ECFB2'
                                                        : p.status === 'lost'
                                                        ? '#FF5C6C'
                                                        : '#FFB830',
                                                }}
                                            >
                                                {p.resolved_at ? 'Reencontrada' : STATUS_LABEL[p.status]}
                                            </span>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Alertas recientes */}
                        <div className="rounded-[32px] border border-gray-100 bg-white p-8">
                            <div className="mb-6 flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
                                    Alertas recientes
                                </span>
                            </div>
                            {recent_alerts.length === 0 ? (
                                <div className="py-10 text-center text-sm text-gray-400">
                                    No recibiste alertas todavía.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {recent_alerts.map((a) => {
                                        const isLost = a.type === 'nearby_vet_lost';
                                        const petId = a.data?.pet_id;
                                        return (
                                            <Link
                                                key={a.id}
                                                to={petId ? `/pet/${petId}` : '#'}
                                                className="flex items-center gap-4 rounded-2xl border border-gray-100 p-3 transition-all hover:bg-gray-50"
                                            >
                                                <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-gray-100">
                                                    {a.pet_photo ? (
                                                        <img src={a.pet_photo} className="h-full w-full object-cover" alt="" />
                                                    ) : null}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: isLost ? '#FF5C6C' : '#3ECFB2' }}>
                                                        {isLost ? 'Perdida cerca' : 'Encontrada cerca'}
                                                    </div>
                                                    <div className="mt-0.5 text-sm font-semibold text-gray-900 truncate">
                                                        {a.pet_name || 'Sin nombre'}
                                                    </div>
                                                    <div className="text-xs text-gray-400 truncate">
                                                        {a.pet_address || 'Sin ubicación'}
                                                    </div>
                                                </div>
                                                {!a.read_at && (
                                                    <div className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-[#FF5C6C]" />
                                                )}
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar config */}
                    <div>
                        <AlertsConfig vet={vet} token={token} onUpdate={() => load()} />
                    </div>
                </div>
            </div>
        </div>
    );
}
