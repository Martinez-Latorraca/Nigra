import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
    Pencil, LogOut, Plus, ChevronRight, Bell, Camera, ArrowRight, Star, Dog,
} from 'lucide-react';
import { clearCredentials, updateUserData } from '../store/userSlice';
import { openChat } from '../store/chatSlice';
import { markNotificationRead } from '../store/notificationsSlice';
import { CONTACT_EMAIL, mailtoContact } from '../utils/links';
import LinkedAccounts from '../components/LinkedAccounts';
import MapSelector from '../components/MapSelector';
import ShelterPanel from '../components/ShelterPanel';
import { TierChip } from '../components/ui';
import { adRadiusOf } from '../utils/sponsorTiers';
import { C, petStatusKey } from '../utils/theme';

const API = import.meta.env.VITE_API_URL || '';

// Radios de alerta (iguales a la app). Si el guardado es otro, se suma a la lista.
const RADIUS_PRESETS = [5, 15, 25, 50];

// Catálogo de servicios comunes de una veterinaria. El vet marca los que
// ofrece; lo que no está en la lista se agrega libre en 'Otros'. Los strings
// guardados hoy que no coincidan con el catálogo migran a 'Otros'.
const SERVICE_CATALOG = [
    'Consultas',
    'Vacunación',
    'Cirugía',
    'Urgencias 24h',
    'Peluquería',
    'Baño',
    'Radiología',
    'Ecografía',
    'Laboratorio',
    'Guardería',
    'Adiestramiento',
    'Atención a domicilio',
];

// Estado de un reporte propio (en femenino, como la app).
const REPORT_STATUS = {
    lost: { label: 'Perdida', color: C.coral },
    found: { label: 'Encontrada', color: C.teal },
    reunited: { label: 'Reencontrada ✓', color: C.violeta },
};

const kicker = 'm-0 text-xs font-bold tracking-[.1em] uppercase';
const inputCls = 'w-full h-[52px] px-4 rounded-2xl bg-white border border-mimo-muted focus:border-mimo-noche outline-none text-[15px] placeholder:text-mimo-noche/60';

// "12:40" hoy, "Ayer", o "3/11".
function shortTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const start = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const days = Math.round((start(now) - start(d)) / 86400000);
    if (days <= 0) return d.toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' });
    if (days === 1) return 'Ayer';
    return `${d.getDate()}/${d.getMonth() + 1}`;
}

// "Sobre Luna · Perdido" (o solo el estado si no tiene nombre) + color del punto.
function chatPetState(item) {
    if (!item.pet_status) return null;
    const about = (label) => (item.pet_name ? `Sobre ${item.pet_name} · ${label}` : label);
    if (item.pet_resolved_at) return { about: about('Reencontrada'), color: C.violeta };
    if (item.pet_status === 'lost') return { about: about('Perdido'), color: C.coral };
    return { about: about('Encontrado'), color: C.teal };
}

// ------------------------------------------------------------------------- //
// Piezas locales
// ------------------------------------------------------------------------- //

function Card({ children, className = '' }) {
    return <section className={`bg-white rounded-3xl p-5 md:p-6 ${className}`}>{children}</section>;
}

function Label({ children }) {
    return <span className="text-xs font-bold tracking-[.08em] uppercase">{children}</span>;
}

function Toggle({ checked, onChange, label }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            onClick={() => onChange(!checked)}
            className={`relative w-[52px] h-[30px] rounded-full shrink-0 transition-colors ${checked ? 'bg-mimo-teal' : 'bg-mimo-muted'}`}
        >
            <span className={`absolute top-[3px] w-6 h-6 rounded-full bg-white shadow transition-all ${checked ? 'left-[25px]' : 'left-[3px]'}`} />
        </button>
    );
}

function StatTile({ label, value, hint, accent }) {
    return (
        <div className="bg-white rounded-3xl p-[18px] flex flex-col gap-1.5" style={{ borderTop: `4px solid ${accent}` }}>
            <span className="text-xs font-bold tracking-[.08em] uppercase">{label}</span>
            <b className="font-display font-black text-[32px] leading-none">{value}</b>
            {hint && <span className="text-[13px]">{hint}</span>}
        </div>
    );
}

function ImagePick({ label, preview, fallback, wide, busy, disabled, onPick }) {
    return (
        <div className="flex flex-col gap-2">
            <Label>{label}</Label>
            <div className="flex items-center gap-3">
                {preview ? (
                    <img src={preview} alt="" referrerPolicy="no-referrer" className={`h-16 ${wide ? 'w-24' : 'w-16'} rounded-2xl object-cover bg-mimo-muted`} />
                ) : (
                    fallback || <div className={`h-16 ${wide ? 'w-24' : 'w-16'} rounded-2xl bg-mimo-muted`} />
                )}
                <label className={`h-10 px-4 rounded-xl border-2 border-mimo-noche text-sm font-bold flex items-center gap-1.5 ${disabled ? 'opacity-50' : 'cursor-pointer hover:bg-mimo-warm'}`}>
                    <Camera size={16} strokeWidth={2} />
                    {busy ? 'Subiendo…' : 'Cambiar'}
                    <input type="file" accept="image/*" className="hidden" disabled={disabled} onChange={(e) => e.target.files?.[0] && onPick(e.target.files[0])} />
                </label>
            </div>
        </div>
    );
}

function FormActions({ saving, disabled, onSave, onClose, msg, err }) {
    return (
        <>
            <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                    onClick={onSave}
                    disabled={saving || disabled}
                    className="flex-1 h-[52px] rounded-2xl bg-mimo-noche text-mimo-warm font-bold text-[15px] hover:bg-mimo-nocheAlt disabled:opacity-50"
                >
                    {saving ? 'Guardando…' : 'Guardar cambios'}
                </button>
                <button onClick={onClose} className="h-[52px] px-6 rounded-2xl border-2 border-mimo-noche font-bold text-[15px] hover:bg-mimo-warm">
                    Cancelar
                </button>
            </div>
            {msg && <p className="m-0 text-sm font-bold text-mimo-tealDark">{msg}</p>}
            {err && <p className="m-0 text-sm font-bold text-mimo-coral" role="alert">{err}</p>}
        </>
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
    const initialServices = vet.services || [];
    const catalogSet = new Set(SERVICE_CATALOG);
    const [servicesSelected, setServicesSelected] = useState(
        () => new Set(initialServices.filter((s) => catalogSet.has(s)))
    );
    const [servicesOther, setServicesOther] = useState(
        initialServices.filter((s) => !catalogSet.has(s)).join(', ')
    );
    const toggleService = (s) => {
        setServicesSelected((prev) => {
            const next = new Set(prev);
            if (next.has(s)) next.delete(s);
            else next.add(s);
            return next;
        });
    };
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState('');
    const [err, setErr] = useState('');
    const [uploadingKind, setUploadingKind] = useState(null);
    const [logoPreview, setLogoPreview] = useState(vet.logo_url || '');
    const [coverPreview, setCoverPreview] = useState(vet.cover_url || '');
    // Ubicación en el mapa: coords guardadas o null (mapa vacío, esperando clic).
    const [mapPosition, setMapPosition] = useState(
        vet.lat != null && vet.lng != null ? { lat: vet.lat, lng: vet.lng } : null
    );

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
            const otros = servicesOther.split(',').map((s) => s.trim()).filter(Boolean);
            const services = [...SERVICE_CATALOG.filter((s) => servicesSelected.has(s)), ...otros];
            const body = { ...form, services };
            if (mapPosition) {
                body.lat = mapPosition.lat;
                body.lng = mapPosition.lng;
            }
            for (const k of Object.keys(body)) {
                if (body[k] === '' || body[k] === null) delete body[k];
            }
            const res = await fetch(`${API}/api/vets/me`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
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

    const field = (key, text, props = {}) => (
        <label className="flex flex-col gap-1.5" key={key}>
            <Label>{text}</Label>
            <input className={inputCls} value={form[key]} onChange={update(key)} {...props} />
        </label>
    );

    return (
        <Card className="flex flex-col gap-5">
            <p className={kicker}>Editar perfil de la veterinaria</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ImagePick
                    label="Logo"
                    preview={logoPreview}
                    fallback={<div className="h-16 w-16 rounded-2xl bg-mimo-noche flex items-center justify-center text-mimo-warm font-display font-black text-2xl">{vet.name.charAt(0)}</div>}
                    busy={uploadingKind === 'logo'}
                    disabled={uploadingKind !== null}
                    onPick={(f) => uploadImage('logo', f)}
                />
                <ImagePick
                    label="Portada"
                    preview={coverPreview}
                    wide
                    busy={uploadingKind === 'cover'}
                    disabled={uploadingKind !== null}
                    onPick={(f) => uploadImage('cover', f)}
                />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {field('name', 'Nombre')}
                {field('phone', 'Teléfono', { placeholder: '+598 …' })}
                {field('whatsapp', 'WhatsApp', { placeholder: '+598 …' })}
                {field('website', 'Sitio web', { placeholder: 'https://…' })}
                {field('instagram', 'Instagram', { placeholder: '@usuario' })}
                {field('city', 'Ciudad')}
                <div className="sm:col-span-2">{field('address', 'Dirección')}</div>
                <div className="sm:col-span-2 flex flex-col gap-1.5">
                    <Label>Ubicación en el mapa</Label>
                    <MapSelector position={mapPosition} setPosition={setMapPosition} />
                    <span className="text-[13px]">Si no la marcás, tu veterinaria no aparece en "Cerca mío" del directorio.</span>
                </div>
                <label className="sm:col-span-2 flex flex-col gap-1.5">
                    <Label>Sobre la clínica</Label>
                    <textarea
                        className={`${inputCls} h-auto min-h-[110px] py-3.5 resize-y`}
                        value={form.bio}
                        onChange={update('bio')}
                        placeholder="Contá qué hacen, especialidades, horarios…"
                    />
                </label>
                <div className="sm:col-span-2 flex flex-col gap-2.5">
                    <Label>Servicios</Label>
                    <div className="flex flex-wrap gap-2">
                        {SERVICE_CATALOG.map((s) => {
                            const active = servicesSelected.has(s);
                            return (
                                <button
                                    type="button"
                                    key={s}
                                    onClick={() => toggleService(s)}
                                    aria-pressed={active}
                                    className={`h-10 px-4 rounded-full text-sm transition-colors ${active ? 'bg-mimo-noche text-mimo-warm font-bold' : 'bg-white border border-mimo-muted hover:border-mimo-noche'}`}
                                >
                                    {s}
                                </button>
                            );
                        })}
                    </div>
                    <label className="flex flex-col gap-1.5 mt-1">
                        <Label>Otros (separados por coma)</Label>
                        <input className={inputCls} value={servicesOther} onChange={(e) => setServicesOther(e.target.value)} placeholder="Ej.: Homeopatía, Nutrición, Odontología" />
                    </label>
                </div>
            </div>
            <FormActions saving={saving} onSave={save} onClose={onClose} msg={msg} err={err} />
        </Card>
    );
}

// Edición para users (no vet): nombre y foto. Al guardar actualiza Redux
// para reflejar los cambios sin volver a entrar.
function UserEditForm({ user, token, dispatch, onClose }) {
    const [name, setName] = useState(user.name || '');
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState('');
    const [err, setErr] = useState('');
    const [uploading, setUploading] = useState(false);
    const [avatarPreview, setAvatarPreview] = useState(user.avatar_url || '');

    const uploadAvatar = async (file) => {
        setErr('');
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('image', file);
            const res = await fetch(`${API}/api/users/me/avatar`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: fd,
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'No se pudo subir la imagen.');
            setAvatarPreview(data.avatar_url);
            dispatch(updateUserData({ avatar_url: data.avatar_url }));
        } catch (e) {
            setErr(e.message);
        } finally {
            setUploading(false);
        }
    };

    const save = async () => {
        setSaving(true);
        setMsg('');
        setErr('');
        try {
            const res = await fetch(`${API}/api/users/me`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ name: name.trim() }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'No se pudo guardar.');
            dispatch(updateUserData({ name: data.name, avatar_url: data.avatar_url }));
            setMsg('Guardado.');
            setTimeout(() => onClose?.(), 800);
        } catch (e) {
            setErr(e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card className="flex flex-col gap-5">
            <p className={kicker}>Editar perfil</p>
            <ImagePick
                label="Foto de perfil"
                preview={avatarPreview}
                fallback={<div className="h-16 w-16 rounded-full bg-mimo-violeta flex items-center justify-center text-mimo-warm font-display font-black text-2xl">{(user.name || '?').charAt(0).toUpperCase()}</div>}
                busy={uploading}
                disabled={uploading}
                onPick={uploadAvatar}
            />
            <label className="flex flex-col gap-1.5">
                <Label>Nombre</Label>
                <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1.5">
                <Label>Email</Label>
                <input className={`${inputCls} opacity-60 cursor-not-allowed`} value={user.email || ''} disabled readOnly />
                <span className="text-[13px]">Para cambiar tu email escribinos a {CONTACT_EMAIL}.</span>
            </label>
            <FormActions saving={saving} disabled={!name.trim()} onSave={save} onClose={onClose} msg={msg} err={err} />
        </Card>
    );
}

// ------------------------------------------------------------------------- //
// Página principal
// ------------------------------------------------------------------------- //

function Profile() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const token = useSelector((s) => s.user.token);
    const user = useSelector((s) => s.user.data);
    const messages = useSelector((s) => s.inbox.messages);
    const notifList = useSelector((s) => s.notifications.list);

    const isVet = !!user?.has_vet;
    const isShelter = !!user?.has_shelter;

    // --- Reports --- //
    const [reports, setReports] = useState([]);
    const [reportsPage, setReportsPage] = useState(1);
    const [reportsTotalPages, setReportsTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    // --- Alertas — mismos 3 controles para user y vet --- //
    // - vet: fuente = /api/vets/me/dashboard (receives_lost / receives_found / alert_radius_km).
    // - user: fuente = /api/users/me (notify_lost / notify_found / notify_radius_km).
    const [vetDash, setVetDash] = useState(null);
    const [vetLoaded, setVetLoaded] = useState(false);
    const [editing, setEditing] = useState(false);
    const [receivesLost, setReceivesLost] = useState(false);
    const [receivesFound, setReceivesFound] = useState(false);
    const [radius, setRadius] = useState(5);
    const [savingAlerts, setSavingAlerts] = useState(false);
    const [alertsMsg, setAlertsMsg] = useState('');

    // Bandeja: chats + coincidencias, lo más nuevo arriba.
    const items = useMemo(() => {
        const chats = (messages || []).map((m) => ({
            kind: 'chat',
            key: `chat-${m.pet_id}-${m.other_user_id}`,
            sortDate: m.created_at,
            ...m,
        }));
        const matches = (notifList || [])
            .filter((n) => n.type === 'match')
            .map((n) => ({ kind: 'match', key: `match-${n.id}`, sortDate: n.created_at, ...n }));
        return [...chats, ...matches].sort((a, b) => new Date(b.sortDate) - new Date(a.sortDate));
    }, [messages, notifList]);

    const isChatUnread = (m) => {
        const unread = m.is_read === false || m.is_read === 'false' || m.is_read === 0;
        return unread && Number(m.receiver_id) === Number(user?.id);
    };
    const unreadCount = (messages || []).filter(isChatUnread).length
        + (notifList || []).filter((n) => n.type === 'match' && !n.read_at).length;

    const fetchReports = async (pageNum = 1, append = false) => {
        if (!token) { navigate('/login'); return; }
        if (pageNum === 1) setLoading(true);
        else setLoadingMore(true);
        try {
            const res = await fetch(`${API}/api/pets/my-reports?page=${pageNum}&limit=10`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('No se pudieron cargar tus reportes.');
            const data = await res.json();
            setReports((prev) => (append ? [...prev, ...data.reports] : data.reports));
            setReportsPage(data.page);
            setReportsTotalPages(data.totalPages);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const fetchVetDashboard = async () => {
        try {
            const res = await fetch(`${API}/api/vets/me/dashboard`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) return;
            const data = await res.json();
            setVetDash(data);
            setReceivesLost(data.vet.receives_lost);
            setReceivesFound(data.vet.receives_found);
            setRadius(data.vet.alert_radius_km);
        } catch { /* silencioso */ }
        finally { setVetLoaded(true); }
    };

    // Preferencias de alertas del user. De paso hidrata avatar_url en Redux
    // (users que entraron antes de que el server lo devolviera).
    const fetchUserNotify = async () => {
        try {
            const res = await fetch(`${API}/api/users/me`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) return;
            const data = await res.json();
            setReceivesLost(!!data.notify_lost);
            setReceivesFound(!!data.notify_found);
            if (Number.isFinite(data.notify_radius_km)) setRadius(data.notify_radius_km);
            if (data.avatar_url && data.avatar_url !== user?.avatar_url) {
                dispatch(updateUserData({ avatar_url: data.avatar_url }));
            }
        } catch { /* silencioso */ }
    };

    useEffect(() => {
        if (!token) return;
        fetchReports();
        if (isVet) fetchVetDashboard();
        else fetchUserNotify();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, isVet]);

    const handleLogout = () => {
        dispatch(clearCredentials());
        navigate('/app');
    };

    // Soft-delete: los datos quedan y la cuenta se reactiva si vuelve a entrar
    // o a registrarse con el mismo email. Los reportes no se borran.
    const handleDeleteAccount = async () => {
        const ok = window.confirm(
            'Eliminar tu cuenta.\n\n' +
            'Tus datos y tus reportes se conservan y podés recuperarla ' +
            'iniciando sesión con este mismo email más adelante.\n\n' +
            '¿Continuar?'
        );
        if (!ok) return;
        try {
            const res = await fetch(`${API}/api/users/me`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('No se pudo eliminar la cuenta.');
            dispatch(clearCredentials());
            navigate('/app');
        } catch (err) {
            alert(err.message);
        }
    };

    const handleOpenChat = (msg) => {
        dispatch(openChat({
            pet_id: msg.pet_id,
            petPhoto: msg.photo_url,
            otherUserId: msg.other_user_id,
            otherUserName: msg.other_user_name,
        }));
    };

    const handleOpenMatch = (item) => {
        if (!item.read_at) dispatch(markNotificationRead(item.id));
        const petId = item.data?.pet_id;
        if (petId) navigate(`/pet/${petId}`);
    };

    const vet = vetDash?.vet;

    const saveAlerts = async () => {
        setSavingAlerts(true);
        setAlertsMsg('');
        try {
            const url = isVet && vet ? `${API}/api/vets/me/alerts` : `${API}/api/users/notify-nearby`;
            const body = isVet && vet
                ? { receives_lost: receivesLost, receives_found: receivesFound, alert_radius_km: radius }
                : { notify_lost: receivesLost, notify_found: receivesFound, notify_radius_km: radius };
            const res = await fetch(url, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(body),
            });
            if (!res.ok) throw new Error();
            setAlertsMsg('Guardado.');
            setTimeout(() => setAlertsMsg(''), 2500);
        } catch {
            setAlertsMsg('No se pudo guardar.');
        } finally {
            setSavingAlerts(false);
        }
    };

    if (loading || (isVet && !vetLoaded)) {
        return (
            <div className="flex-1 bg-mimo-warm" aria-label="Cargando">
                <div className="max-w-[1200px] mx-auto px-4 md:px-6 xl:px-0 pt-9 pb-20 flex flex-col lg:flex-row gap-7 animate-pulse">
                    <div className="w-full lg:w-[340px] h-[380px] rounded-[32px] bg-mimo-muted" />
                    <div className="flex-1 flex flex-col gap-5">
                        <div className="h-28 rounded-3xl bg-mimo-muted" />
                        <div className="h-64 rounded-3xl bg-mimo-muted" />
                    </div>
                </div>
            </div>
        );
    }

    if (!user) return null;

    // Refugio: panel propio.
    if (isShelter) return <ShelterPanel />;

    const displayName = isVet && vet?.name ? vet.name : (user.name || 'Usuario');
    const avatarSrc = isVet && vet ? vet.logo_url : user.avatar_url;
    const initial = displayName.trim().charAt(0).toUpperCase();
    const successRate = vetDash && vetDash.stats.total_pets > 0
        ? Math.round((vetDash.stats.resolved_pets / vetDash.stats.total_pets) * 100)
        : null;
    const radiusOptions = RADIUS_PRESETS.includes(radius) ? RADIUS_PRESETS : [...RADIUS_PRESETS, radius].sort((a, b) => a - b);
    // Contadores de la tarjeta: solo con todos los reportes cargados, para no mostrar un número a medias.
    const allLoaded = reportsPage >= reportsTotalPages;
    const activeCount = reports.filter((r) => !r.resolved_at).length;
    const reunitedCount = reports.filter((r) => r.resolved_at).length;

    return (
        <div className="flex-1 bg-mimo-warm font-sans text-mimo-noche">
            <main className="max-w-[1200px] mx-auto px-4 md:px-6 xl:px-0 pt-9 pb-20 flex flex-col lg:flex-row gap-7 items-start">

                {/* ------------------------ TARJETA DE LA CUENTA ------------------------ */}
                <aside className="w-full lg:w-[340px] lg:sticky lg:top-[100px] shrink-0 flex flex-col gap-4">
                    <section
                        className="rounded-[32px] p-7 flex flex-col gap-4 text-mimo-warm"
                        style={{ background: isVet ? C.noche : C.coral }}
                    >
                        <p className={kicker}>{isVet ? 'Mi cuenta · Veterinaria' : 'Mi cuenta'}</p>
                        {avatarSrc ? (
                            <img src={avatarSrc} alt="" referrerPolicy="no-referrer" className={`w-[84px] h-[84px] object-cover bg-white ${isVet ? 'rounded-[24px]' : 'rounded-full'}`} />
                        ) : isVet ? (
                            <span className="w-[84px] h-[84px] rounded-[24px] bg-white text-mimo-noche flex items-center justify-center font-display font-black text-[40px]">{initial}</span>
                        ) : (
                            <span className="w-[84px] h-[84px] rounded-full bg-mimo-violeta flex items-center justify-center font-display font-black text-[40px]">{initial}</span>
                        )}
                        <div className="flex flex-col gap-1.5 min-w-0">
                            <h1 className="m-0 font-display font-black text-[30px] leading-[1.05] break-words">{displayName}</h1>
                            {user.email && <span className="text-[15px] break-all opacity-90">{user.email}</span>}
                        </div>
                        {isVet && vet && (
                            <div className="flex flex-col items-start gap-2.5">
                                <TierChip vet={vet} />
                                {!vet.approved && (
                                    <span className="px-3 py-1 rounded-full bg-mimo-coral text-[13px] font-bold">Pendiente de aprobación</span>
                                )}
                                {vet.approved && (
                                    <Link to={`/vets/${vet.slug}`} className="flex items-center gap-1 text-[15px] font-bold underline hover:opacity-80">
                                        Ver perfil público <ArrowRight size={16} strokeWidth={2} />
                                    </Link>
                                )}
                            </div>
                        )}
                        {!isVet && allLoaded && reports.length > 0 && (
                            <div className="flex gap-8 pt-4 border-t border-white/30">
                                <span className="flex flex-col">
                                    <b className="font-display font-black text-[28px] leading-none">{activeCount}</b>
                                    <span className="text-[13px]">{activeCount === 1 ? 'reporte activo' : 'reportes activos'}</span>
                                </span>
                                <span className="flex flex-col">
                                    <b className="font-display font-black text-[28px] leading-none">{reunitedCount}</b>
                                    <span className="text-[13px]">{reunitedCount === 1 ? 'reencuentro' : 'reencuentros'}</span>
                                </span>
                            </div>
                        )}
                        <button
                            onClick={() => setEditing((v) => !v)}
                            className="self-start h-10 px-4 rounded-full border border-white/50 font-bold text-[15px] flex items-center gap-1.5 hover:bg-white/10"
                        >
                            <Pencil size={16} strokeWidth={2} />
                            {editing ? 'Cerrar edición' : 'Editar'}
                        </button>
                    </section>

                    <button
                        onClick={handleLogout}
                        className="h-[52px] rounded-2xl border-2 border-mimo-noche font-bold text-[15px] flex items-center justify-center gap-2 hover:bg-white"
                    >
                        <LogOut size={18} strokeWidth={2} />
                        Cerrar sesión
                    </button>
                    <button onClick={handleDeleteAccount} className="self-center text-[15px] font-bold underline hover:text-mimo-coral">
                        Eliminar cuenta
                    </button>
                </aside>

                {/* ------------------------------ CONTENIDO ------------------------------ */}
                <div className="w-full flex-1 min-w-0 flex flex-col gap-6">
                    {editing && (
                        isVet && vet ? (
                            <VetEditForm vet={vet} token={token} onClose={() => setEditing(false)} onSaved={fetchVetDashboard} />
                        ) : (
                            <UserEditForm user={user} token={token} dispatch={dispatch} onClose={() => setEditing(false)} />
                        )
                    )}

                    {isVet && vetDash && (
                        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3.5">
                            <StatTile label="Mascotas publicadas" value={vetDash.stats.total_pets} accent={C.coral} />
                            <StatTile label="Reencontradas" value={vetDash.stats.resolved_pets} hint={successRate !== null ? `${successRate}% tasa` : null} accent={C.teal} />
                            <StatTile
                                label="Alertas"
                                value={vetDash.stats.total_alerts}
                                hint={vetDash.stats.unread_alerts > 0 ? `${vetDash.stats.unread_alerts} sin leer` : 'Al día'}
                                accent={C.sol}
                            />
                            <StatTile label="Radio" value={`${vet.alert_radius_km} km`} accent={C.violeta} />
                        </div>
                    )}

                    {isVet && vet?.is_sponsor && vetDash?.ad_stats_30d && (
                        <Card className="flex flex-col gap-4">
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                                <h2 className="m-0 font-display font-black text-2xl">Métricas de publicidad</h2>
                                <span className="text-sm">
                                    Últimos 30 días{adRadiusOf(vet) ? ` · alcance ${adRadiusOf(vet)} km` : ''}
                                </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                                {[
                                    ['Impresiones', vetDash.ad_stats_30d.impressions, null],
                                    ['Clicks en tu card', vetDash.ad_stats_30d.ad_clicks, null],
                                    ['Contactos', vetDash.ad_stats_30d.contact_clicks, 'WhatsApp, teléfono, web e Instagram'],
                                ].map(([lbl, val, hint]) => (
                                    <div key={lbl} className="rounded-3xl p-[18px] flex flex-col gap-1.5 border-t-4 border-mimo-noche bg-mimo-warm">
                                        <span className="text-xs font-bold tracking-[.08em] uppercase">{lbl}</span>
                                        <b className="font-display font-black text-[32px] leading-none">{Number(val).toLocaleString('es-UY')}</b>
                                        {hint && <span className="text-[13px]">{hint}</span>}
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

                    {isVet && vet && !vet.is_sponsor && (
                        <section className="rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-mimo-noche" style={{ background: C.sol }}>
                            <div className="flex flex-col gap-1.5 max-w-lg">
                                <p className="m-0 flex items-center gap-2 font-display font-black text-2xl">
                                    <Star size={22} strokeWidth={2} fill="currentColor" />
                                    Sumate como Socio Mimo
                                </p>
                                <p className="m-0 text-[15px] leading-normal">
                                    Card destacada en el directorio, publicidad en el feed cerca de tu clínica, chip de socio en cada publicación y métricas.
                                </p>
                            </div>
                            <a href={mailtoContact('Quiero ser Socio Mimo')} className="shrink-0 h-12 px-5 rounded-2xl bg-mimo-noche text-mimo-warm font-bold text-[15px] flex items-center justify-center hover:bg-mimo-nocheAlt">
                                Contactar
                            </a>
                        </section>
                    )}

                    {/* Registros */}
                    <section className="flex flex-col gap-3.5">
                        <div className="flex items-center justify-between gap-4">
                            <h2 className="m-0 font-display font-black text-2xl md:text-[28px]">{isVet ? 'Mis reportes' : 'Mis registros'}</h2>
                            <Link to="/reportar" className="h-11 px-[18px] rounded-2xl bg-mimo-coral hover:bg-mimo-coralDark text-mimo-muted font-bold text-[15px] flex items-center gap-1.5">
                                <Plus size={18} strokeWidth={2} />
                                Nuevo reporte
                            </Link>
                        </div>
                        {reports.length === 0 ? (
                            <Card className="text-center text-[15px]">Todavía no publicaste ningún reporte.</Card>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
                                    {reports.map((r) => {
                                        const st = REPORT_STATUS[petStatusKey(r)];
                                        const barrio = r.address ? String(r.address).split(',')[0].trim() : '';
                                        const title = r.status === 'lost' ? r.name || 'Sin nombre' : ['Encontrada', barrio].filter(Boolean).join(' · ');
                                        return (
                                            <Link key={r.id} to={`/pet/${r.id}`} className="group bg-white rounded-3xl p-3 flex items-center gap-3.5 hover:shadow-card">
                                                <span className="w-16 h-16 rounded-2xl bg-mimo-muted overflow-hidden shrink-0 flex items-center justify-center">
                                                    {r.photo_url ? <img src={r.photo_url} alt="" className="w-full h-full object-cover" /> : <Dog size={28} strokeWidth={1.5} opacity={0.35} />}
                                                </span>
                                                <span className="flex-1 min-w-0 flex flex-col items-start gap-1">
                                                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold text-mimo-muted" style={{ background: st.color }}>{st.label}</span>
                                                    <b className="text-[17px] leading-tight line-clamp-2 group-hover:text-mimo-coral">{title}</b>
                                                    <span className="text-sm">Ver publicación</span>
                                                </span>
                                                <ChevronRight size={20} strokeWidth={2} className="shrink-0" />
                                            </Link>
                                        );
                                    })}
                                </div>
                                {reportsPage < reportsTotalPages && (
                                    <button
                                        onClick={() => fetchReports(reportsPage + 1, true)}
                                        disabled={loadingMore}
                                        className="self-center h-[52px] px-6 rounded-2xl border-2 border-mimo-noche font-bold text-[15px] hover:bg-white disabled:opacity-50"
                                    >
                                        {loadingMore ? 'Cargando…' : 'Cargar más'}
                                    </button>
                                )}
                            </>
                        )}
                    </section>

                    {/* Bandeja de entrada */}
                    <Card className="flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-4 pb-2">
                            <h2 className="m-0 font-display font-black text-2xl md:text-[28px]">Bandeja de entrada</h2>
                            {unreadCount > 0 && (
                                <span className="px-3 py-1 rounded-full bg-mimo-coral text-mimo-muted text-[13px] font-bold whitespace-nowrap">{unreadCount} sin leer</span>
                            )}
                        </div>
                        {items.length === 0 ? (
                            <p className="m-0 py-8 text-center text-[15px] border-t border-mimo-muted">Todavía no tenés mensajes.</p>
                        ) : (
                            items.map((item) => {
                                if (item.kind === 'chat') {
                                    const unread = isChatUnread(item);
                                    const state = chatPetState(item);
                                    const mine = Number(item.sender_id) === Number(user?.id);
                                    return (
                                        <button key={item.key} onClick={() => handleOpenChat(item)} className="w-full text-left flex gap-3.5 items-start py-3.5 border-t border-mimo-muted hover:bg-mimo-warm/60 rounded-xl -mx-1 px-1">
                                            <span className="relative w-[52px] h-[52px] shrink-0">
                                                <span className="block w-full h-full rounded-2xl bg-mimo-muted overflow-hidden">
                                                    {item.photo_url && <img src={item.photo_url} alt="" className="w-full h-full object-cover" />}
                                                </span>
                                                {state && <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white" style={{ background: state.color }} />}
                                            </span>
                                            <span className="flex-1 min-w-0 flex flex-col">
                                                <span className="flex items-baseline justify-between gap-3">
                                                    <b className="text-[17px] truncate">{item.other_user_name || 'Usuario'}</b>
                                                    <span className={`text-[13px] shrink-0 ${unread ? 'font-bold' : ''}`}>{shortTime(item.created_at)}</span>
                                                </span>
                                                {state && <span className="text-[13px] font-bold truncate">{state.about}</span>}
                                                <span className="flex items-center justify-between gap-3">
                                                    <span className={`text-[15px] truncate ${unread ? 'font-bold' : ''}`}>
                                                        {mine ? 'Vos: ' : ''}{item.content || (item.image_url ? 'Foto' : '')}
                                                    </span>
                                                    {unread && <span className="w-2.5 h-2.5 rounded-full bg-mimo-coral shrink-0" />}
                                                </span>
                                            </span>
                                        </button>
                                    );
                                }
                                const unread = !item.read_at;
                                const photo = item.data?.photo_url;
                                return (
                                    <button key={item.key} onClick={() => handleOpenMatch(item)} className="w-full text-left flex gap-3.5 items-start py-3.5 border-t border-mimo-muted hover:bg-mimo-warm/60 rounded-xl -mx-1 px-1">
                                        <span className="w-[52px] h-[52px] shrink-0 rounded-2xl bg-mimo-muted overflow-hidden">
                                            {photo && <img src={photo} alt="" className="w-full h-full object-cover" />}
                                        </span>
                                        <span className="flex-1 min-w-0 flex flex-col">
                                            <span className="flex items-baseline justify-between gap-3">
                                                <b className="text-[17px] text-mimo-violeta">Posible coincidencia</b>
                                                <span className="text-[13px] shrink-0">{shortTime(item.created_at)}</span>
                                            </span>
                                            <span className="flex items-center justify-between gap-3">
                                                <span className={`text-[15px] ${unread ? 'font-bold' : ''}`}>
                                                    Reportaron una mascota parecida{item.data?.match_name ? ` a ${item.data.match_name}` : ''}. ¿Es la tuya?
                                                </span>
                                                {unread && <span className="w-2.5 h-2.5 rounded-full bg-mimo-violeta shrink-0" />}
                                            </span>
                                        </span>
                                    </button>
                                );
                            })
                        )}
                    </Card>

                    {/* Alertas recientes (vet) */}
                    {isVet && vetDash && (
                        <Card className="flex flex-col gap-2">
                            <div className="flex items-center justify-between gap-4 pb-2">
                                <h2 className="m-0 font-display font-black text-2xl md:text-[28px]">Alertas recientes</h2>
                                {vetDash.stats.unread_alerts > 0 && (
                                    <span className="px-3 py-1 rounded-full bg-mimo-coral text-mimo-muted text-[13px] font-bold">{vetDash.stats.unread_alerts} sin leer</span>
                                )}
                            </div>
                            {vetDash.recent_alerts.length === 0 ? (
                                <p className="m-0 py-8 text-center text-[15px] border-t border-mimo-muted">Sin alertas por ahora.</p>
                            ) : (
                                vetDash.recent_alerts.map((a) => {
                                    const isLostAlert = a.type === 'nearby_vet_lost';
                                    const petId = a.data?.pet_id;
                                    return (
                                        <Link key={a.id} to={petId ? `/pet/${petId}` : '#'} className="flex items-center gap-3.5 py-3.5 border-t border-mimo-muted hover:bg-mimo-warm/60 rounded-xl -mx-1 px-1">
                                            <span className="w-[52px] h-[52px] shrink-0 rounded-2xl bg-mimo-muted overflow-hidden">
                                                {a.pet_photo && <img src={a.pet_photo} alt="" className="w-full h-full object-cover" />}
                                            </span>
                                            <span className="flex-1 min-w-0 flex flex-col">
                                                <span className="text-[13px] font-bold" style={{ color: isLostAlert ? C.coral : '#1FA88E' }}>
                                                    {isLostAlert ? 'Perdida cerca' : 'Encontrada cerca'}
                                                </span>
                                                <b className="text-[17px] truncate">{a.pet_name || 'Sin nombre'}</b>
                                                <span className="text-sm truncate">{a.pet_address || 'Sin ubicación'}</span>
                                            </span>
                                            {!a.read_at && <span className="w-2.5 h-2.5 rounded-full bg-mimo-coral shrink-0" />}
                                        </Link>
                                    );
                                })
                            )}
                        </Card>
                    )}

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
                        {/* Configuración de alertas: mismos controles para user y vet;
                            cambia el endpoint al guardar. */}
                        <Card className="flex flex-col">
                            <p className={`${kicker} flex items-center gap-2 pb-3`}>
                                <Bell size={16} strokeWidth={2} />
                                Configuración de alertas
                            </p>
                            <div className="flex items-center justify-between gap-4 py-3.5">
                                <span className="flex flex-col">
                                    <b className="text-[17px]">Mascotas perdidas</b>
                                    <span className="text-sm leading-snug">Recibir alerta cuando reporten una perdida en tu radio.</span>
                                </span>
                                <Toggle checked={receivesLost} onChange={setReceivesLost} label="Alertas de mascotas perdidas" />
                            </div>
                            <div className="flex items-center justify-between gap-4 py-3.5 border-t border-mimo-muted">
                                <span className="flex flex-col">
                                    <b className="text-[17px]">Mascotas encontradas</b>
                                    <span className="text-sm leading-snug">Recibir alerta cuando reporten una encontrada.</span>
                                </span>
                                <Toggle checked={receivesFound} onChange={setReceivesFound} label="Alertas de mascotas encontradas" />
                            </div>
                            <div className="flex flex-col gap-3 py-3.5 border-t border-mimo-muted">
                                <span className="flex items-baseline justify-between">
                                    <b className="text-[17px]">Radio de alerta</b>
                                    <b className="font-display font-black text-2xl">{radius} km</b>
                                </span>
                                <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${radiusOptions.length}, minmax(0, 1fr))` }}>
                                    {radiusOptions.map((r) => (
                                        <button
                                            key={r}
                                            type="button"
                                            onClick={() => setRadius(r)}
                                            aria-pressed={radius === r}
                                            className={`h-11 rounded-xl text-[15px] font-bold transition-colors ${radius === r ? 'bg-mimo-noche text-mimo-warm' : 'bg-mimo-warm hover:bg-mimo-muted'}`}
                                        >
                                            {r} km
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <button
                                onClick={saveAlerts}
                                disabled={savingAlerts}
                                className="mt-2 h-[52px] rounded-2xl bg-mimo-noche text-mimo-warm font-bold text-[15px] hover:bg-mimo-nocheAlt disabled:opacity-50"
                            >
                                {savingAlerts ? 'Guardando…' : 'Guardar cambios'}
                            </button>
                            {alertsMsg && <p className="m-0 mt-2.5 text-center text-sm font-bold">{alertsMsg}</p>}
                        </Card>

                        <LinkedAccounts />
                    </div>
                </div>
            </main>
        </div>
    );
}

export default Profile;
