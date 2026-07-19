import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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

function VetEditForm({ vet, token, onClose, onSaved }) {
    const [form, setForm] = useState({
        name: vet.name || '',
        phone: vet.phone || '',
        whatsapp: vet.whatsapp || '',
        website: vet.website || '',
        instagram: vet.instagram || '',
        address: vet.address || '',
        city: vet.city || '',
        bio: vet.bio || '',
    });
    const [servicesInput, setServicesInput] = useState((vet.services || []).join(', '));
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState('');
    const [err, setErr] = useState('');
    const [uploadingKind, setUploadingKind] = useState(null);
    const [logoPreview, setLogoPreview] = useState(vet.logo_url || '');
    const [coverPreview, setCoverPreview] = useState(vet.cover_url || '');

    const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const uploadImage = async (kind, file) => {
        setErr('');
        setUploadingKind(kind);
        try {
            const fd = new FormData();
            fd.append('image', file);
            fd.append('field', kind);
            const res = await fetch(`${API}/api/vets/me/image`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: fd,
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'No se pudo subir la imagen.');
            if (kind === 'logo') setLogoPreview(data.logo_url);
            else setCoverPreview(data.cover_url);
            onSaved?.();
        } catch (e) {
            setErr(e.message);
        } finally {
            setUploadingKind(null);
        }
    };

    const save = async () => {
        setSaving(true);
        setMsg('');
        setErr('');
        try {
            const services = servicesInput
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean);
            const body = { ...form, services };
            for (const k of Object.keys(body)) {
                if (body[k] === '' || body[k] === null) delete body[k];
            }
            const res = await fetch(`${API}/api/vets/me`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'No se pudo guardar.');
            setMsg('Guardado.');
            onSaved?.();
            setTimeout(() => onClose?.(), 800);
        } catch (e) {
            setErr(e.message);
        } finally {
            setSaving(false);
        }
    };

    const inputCls = 'w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:border-gray-900 focus:outline-none';
    const labelCls = 'text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400';

    return (
        <div className="rounded-[32px] border border-gray-100 bg-white p-8">
            <div className="mb-6 flex items-center justify-between">
                <span className={labelCls}>Editar perfil vet</span>
                <button onClick={onClose} className="text-xs font-semibold text-gray-400 hover:text-gray-900">
                    Cerrar
                </button>
            </div>

            {/* Logo + Cover uploads */}
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                    <div className={`${labelCls} mb-2`}>Logo</div>
                    <div className="flex items-center gap-3">
                        {logoPreview ? (
                            <img src={logoPreview} alt="" className="h-16 w-16 rounded-2xl object-cover" />
                        ) : (
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 text-2xl font-bold text-gray-400">
                                {vet.name.charAt(0)}
                            </div>
                        )}
                        <label className="cursor-pointer rounded-full border border-gray-200 px-4 py-2 text-xs font-bold uppercase tracking-widest text-gray-600 hover:bg-gray-50">
                            {uploadingKind === 'logo' ? 'Subiendo…' : 'Cambiar'}
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={uploadingKind !== null}
                                onChange={(e) => e.target.files?.[0] && uploadImage('logo', e.target.files[0])}
                            />
                        </label>
                    </div>
                </div>
                <div>
                    <div className={`${labelCls} mb-2`}>Portada</div>
                    <div className="flex items-center gap-3">
                        {coverPreview ? (
                            <img src={coverPreview} alt="" className="h-16 w-24 rounded-2xl object-cover" />
                        ) : (
                            <div className="h-16 w-24 rounded-2xl bg-gray-100" />
                        )}
                        <label className="cursor-pointer rounded-full border border-gray-200 px-4 py-2 text-xs font-bold uppercase tracking-widest text-gray-600 hover:bg-gray-50">
                            {uploadingKind === 'cover' ? 'Subiendo…' : 'Cambiar'}
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={uploadingKind !== null}
                                onChange={(e) => e.target.files?.[0] && uploadImage('cover', e.target.files[0])}
                            />
                        </label>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                    <div className={`${labelCls} mb-2`}>Nombre</div>
                    <input className={inputCls} value={form.name} onChange={update('name')} />
                </div>
                <div>
                    <div className={`${labelCls} mb-2`}>Teléfono</div>
                    <input className={inputCls} value={form.phone} onChange={update('phone')} placeholder="+598 …" />
                </div>
                <div>
                    <div className={`${labelCls} mb-2`}>WhatsApp</div>
                    <input className={inputCls} value={form.whatsapp} onChange={update('whatsapp')} placeholder="+598 …" />
                </div>
                <div>
                    <div className={`${labelCls} mb-2`}>Sitio web</div>
                    <input className={inputCls} value={form.website} onChange={update('website')} placeholder="https://…" />
                </div>
                <div>
                    <div className={`${labelCls} mb-2`}>Instagram</div>
                    <input className={inputCls} value={form.instagram} onChange={update('instagram')} placeholder="@handle" />
                </div>
                <div>
                    <div className={`${labelCls} mb-2`}>Ciudad</div>
                    <input className={inputCls} value={form.city} onChange={update('city')} />
                </div>
                <div className="md:col-span-2">
                    <div className={`${labelCls} mb-2`}>Dirección</div>
                    <input className={inputCls} value={form.address} onChange={update('address')} />
                </div>
                <div className="md:col-span-2">
                    <div className={`${labelCls} mb-2`}>Sobre la clínica</div>
                    <textarea
                        className={`${inputCls} min-h-[100px]`}
                        value={form.bio}
                        onChange={update('bio')}
                        placeholder="Contá qué hacen, especialidades, horarios…"
                    />
                </div>
                <div className="md:col-span-2">
                    <div className={`${labelCls} mb-2`}>Servicios (separá por coma)</div>
                    <input
                        className={inputCls}
                        value={servicesInput}
                        onChange={(e) => setServicesInput(e.target.value)}
                        placeholder="Consultas, Vacunación, Cirugía…"
                    />
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
                <div className="mt-3 rounded-2xl bg-green-50 p-3 text-center text-xs font-semibold text-green-600">{msg}</div>
            ) : null}
            {err ? (
                <div className="mt-3 rounded-2xl bg-red-50 p-3 text-center text-xs font-semibold text-red-500">{err}</div>
            ) : null}
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
                        <div className="text-sm font-semibold text-gray-900">Radio de alerta</div>
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
                            <span className="font-semibold text-[#C98800]">Socio Mimo extiende a 50 km.</span>
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
                <div className="mt-3 rounded-2xl bg-green-50 p-3 text-center text-xs font-semibold text-green-600">{msg}</div>
            ) : null}
            {err ? (
                <div className="mt-3 rounded-2xl bg-red-50 p-3 text-center text-xs font-semibold text-red-500">{err}</div>
            ) : null}
        </div>
    );
}

export default function VetPanel() {
    const token = useSelector((s) => s.user?.token);
    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editing, setEditing] = useState(false);

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
        if (!token) return;
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    if (loading) {
        return (
            <div className="w-full max-w-6xl px-6 py-10 text-center">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 animate-pulse">
                    Cargando panel vet
                </div>
            </div>
        );
    }

    if (error || !dashboard) {
        return null;
    }

    const { vet, stats, recent_pets, recent_alerts } = dashboard;
    const successRate = stats.total_pets > 0
        ? Math.round((stats.resolved_pets / stats.total_pets) * 100)
        : null;

    return (
        <div className="w-full max-w-6xl px-6 pt-8 pb-16">
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
                        <h2 className="text-3xl font-semibold tracking-tight text-black md:text-4xl">
                            {vet.name}
                        </h2>
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
                    <button
                        onClick={() => setEditing((v) => !v)}
                        className="rounded-full bg-black px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white hover:bg-gray-800"
                    >
                        {editing ? 'Cerrar' : 'Editar'}
                    </button>
                    {vet.approved ? (
                        <Link
                            to={`/vets/${vet.slug}`}
                            className="rounded-full border border-gray-200 bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-gray-600 hover:bg-gray-50"
                        >
                            Ver perfil público
                        </Link>
                    ) : null}
                </div>
            </div>

            {editing ? (
                <div className="mt-8">
                    <VetEditForm
                        vet={vet}
                        token={token}
                        onClose={() => setEditing(false)}
                        onSaved={() => load()}
                    />
                </div>
            ) : null}

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
                            <h3 className="mt-1 text-3xl font-semibold tracking-tight">Socio Mimo ⭐</h3>
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

                <div>
                    <AlertsConfig vet={vet} token={token} onUpdate={() => load()} />
                </div>
            </div>
        </div>
    );
}
