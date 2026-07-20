import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { clearCredentials, updateUserData } from '../store/userSlice';
import { openChat } from '../store/chatSlice';
import { markNotificationRead } from '../store/notificationsSlice';
import LinkedAccounts from '../components/LinkedAccounts';
import MimoLogo from '../components/MimoLogo';

const API = import.meta.env.VITE_API_URL || '';

const STATUS_LABEL = { lost: 'Perdida', found: 'Encontrada', resolved: 'Reencontrada' };

// Catálogo de servicios comunes de una veterinaria. El vet marca los que
// ofrece con checkboxes; lo que no está en la lista se agrega libre en
// 'Otros'. Los strings guardados hoy que no coincidan con el catálogo
// migran silenciosamente a 'Otros' (backward-compat).
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

// ------------------------------------------------------------------------- //
// Sub-componentes locales
// ------------------------------------------------------------------------- //

function Card({ title, kicker, children, className = '' }) {
    return (
        <div className={`bg-mimo-warm rounded-[32px] border border-mimo-muted p-6 md:p-8 shadow-card ${className}`}>
            {kicker ? (
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-mimo-quiet mb-4">{kicker}</div>
            ) : null}
            {title ? (
                <h2 className="font-display font-extrabold text-2xl md:text-3xl text-mimo-noche tracking-tight mb-6">{title}</h2>
            ) : null}
            {children}
        </div>
    );
}

// Avatar del hero: si hay src (logo vet o avatar_url del user desde OAuth),
// muestra la foto; si no, un círculo coral con la primera inicial del nombre.
function ProfileAvatar({ src, name }) {
    const initial = (name || '?').trim().charAt(0).toUpperCase();
    const cls = 'w-20 h-20 md:w-24 md:h-24 rounded-3xl shadow-mimo flex-shrink-0';
    if (src) {
        return <img src={src} alt="" referrerPolicy="no-referrer" className={`${cls} object-cover`} />;
    }
    return (
        <div className={`${cls} bg-mimo-coral flex items-center justify-center text-white font-display font-black text-4xl`}>
            {initial}
        </div>
    );
}

function StatTile({ label, value, hint, accent }) {
    return (
        <div
            className="bg-mimo-warm rounded-[24px] border border-mimo-muted p-5 shadow-card"
            style={{ borderTop: `4px solid ${accent}` }}
        >
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-mimo-quiet">{label}</div>
            <div className="mt-2 font-display font-black text-4xl text-mimo-noche tracking-tight">{value}</div>
            {hint ? <div className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-mimo-quiet">{hint}</div> : null}
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
    // Servicios: separamos los que están en el catálogo (checkboxes) de los que
    // no (van al textarea 'Otros'). Los cargados hoy libres se detectan por
    // exclusión y quedan editables en 'Otros'.
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
            // Preservamos el orden del catálogo + append de otros para tener
            // un output estable ante el usuario.
            const services = [
                ...SERVICE_CATALOG.filter((s) => servicesSelected.has(s)),
                ...otros,
            ];
            const body = { ...form, services };
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

    const input = 'w-full rounded-2xl border border-mimo-muted bg-mimo-muted px-4 py-3 text-sm text-mimo-noche focus:border-mimo-coral focus:outline-none';
    const label = 'text-[10px] font-bold uppercase tracking-[0.2em] text-mimo-quiet';

    return (
        <Card kicker="Editar perfil vet" className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                    <div className={`${label} mb-2`}>Logo</div>
                    <div className="flex items-center gap-3">
                        {logoPreview ? (
                            <img src={logoPreview} alt="" className="h-16 w-16 rounded-2xl object-cover" />
                        ) : (
                            <div className="h-16 w-16 rounded-2xl bg-mimo-coral flex items-center justify-center text-white font-black text-2xl">
                                {vet.name.charAt(0)}
                            </div>
                        )}
                        <label className="cursor-pointer rounded-full border border-mimo-muted px-4 py-2 text-xs font-display font-extrabold uppercase tracking-widest text-mimo-noche hover:bg-mimo-muted">
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
                    <div className={`${label} mb-2`}>Portada</div>
                    <div className="flex items-center gap-3">
                        {coverPreview ? (
                            <img src={coverPreview} alt="" className="h-16 w-24 rounded-2xl object-cover" />
                        ) : (
                            <div className="h-16 w-24 rounded-2xl bg-mimo-muted" />
                        )}
                        <label className="cursor-pointer rounded-full border border-mimo-muted px-4 py-2 text-xs font-display font-extrabold uppercase tracking-widest text-mimo-noche hover:bg-mimo-muted">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <div className={`${label} mb-2`}>Nombre</div>
                    <input className={input} value={form.name} onChange={update('name')} />
                </div>
                <div>
                    <div className={`${label} mb-2`}>Teléfono</div>
                    <input className={input} value={form.phone} onChange={update('phone')} placeholder="+598 …" />
                </div>
                <div>
                    <div className={`${label} mb-2`}>WhatsApp</div>
                    <input className={input} value={form.whatsapp} onChange={update('whatsapp')} placeholder="+598 …" />
                </div>
                <div>
                    <div className={`${label} mb-2`}>Sitio web</div>
                    <input className={input} value={form.website} onChange={update('website')} placeholder="https://…" />
                </div>
                <div>
                    <div className={`${label} mb-2`}>Instagram</div>
                    <input className={input} value={form.instagram} onChange={update('instagram')} placeholder="@handle" />
                </div>
                <div>
                    <div className={`${label} mb-2`}>Ciudad</div>
                    <input className={input} value={form.city} onChange={update('city')} />
                </div>
                <div className="md:col-span-2">
                    <div className={`${label} mb-2`}>Dirección</div>
                    <input className={input} value={form.address} onChange={update('address')} />
                </div>
                <div className="md:col-span-2">
                    <div className={`${label} mb-2`}>Sobre la clínica</div>
                    <textarea
                        className={`${input} min-h-[100px]`}
                        value={form.bio}
                        onChange={update('bio')}
                        placeholder="Contá qué hacen, especialidades, horarios…"
                    />
                </div>
                <div className="md:col-span-2">
                    <div className={`${label} mb-2`}>Servicios</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {SERVICE_CATALOG.map((s) => {
                            const active = servicesSelected.has(s);
                            return (
                                <button
                                    type="button"
                                    key={s}
                                    onClick={() => toggleService(s)}
                                    className={`rounded-2xl border px-3 py-2.5 text-sm font-semibold text-left transition-colors ${active
                                        ? 'border-mimo-coral bg-mimo-coral text-white'
                                        : 'border-mimo-muted bg-mimo-muted text-mimo-ink hover:border-mimo-coral/40'}`}
                                >
                                    {active ? '✓ ' : ''}{s}
                                </button>
                            );
                        })}
                    </div>
                    <div className="mt-4">
                        <div className={`${label} mb-2`}>Otros (separá por coma)</div>
                        <input
                            className={input}
                            value={servicesOther}
                            onChange={(e) => setServicesOther(e.target.value)}
                            placeholder="Ej: Homeopatía, Nutrición, Odontología…"
                        />
                    </div>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <button
                    onClick={save}
                    disabled={saving}
                    className="flex-1 rounded-full bg-mimo-coral text-white py-4 text-sm font-display font-extrabold uppercase tracking-widest hover:bg-mimo-coralDark disabled:opacity-50"
                >
                    {saving ? 'Guardando…' : 'Guardar cambios'}
                </button>
                <button
                    onClick={onClose}
                    className="rounded-full border border-mimo-muted text-mimo-ink px-6 py-4 text-sm font-display font-extrabold uppercase tracking-widest hover:bg-mimo-muted"
                >
                    Cerrar
                </button>
            </div>
            {msg ? <div className="mt-3 rounded-2xl bg-mimo-teal/10 p-3 text-center text-xs font-bold text-mimo-tealDark">{msg}</div> : null}
            {err ? <div className="mt-3 rounded-2xl bg-mimo-coral/10 p-3 text-center text-xs font-bold text-mimo-coral">{err}</div> : null}
        </Card>
    );
}

// Form de edición para users normales (no vet). Cambia nombre y foto de
// perfil (avatar_url via Cloudinary). Al guardar despacha updateUserData
// para reflejar los cambios en Redux sin re-login.
function UserEditForm({ user, token, dispatch, onClose }) {
    const [name, setName] = useState(user.name || '');
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState('');
    const [err, setErr] = useState('');
    const [uploading, setUploading] = useState(false);
    const [avatarPreview, setAvatarPreview] = useState(user.avatar_url || '');

    const inputCls = 'w-full rounded-2xl border border-mimo-muted bg-mimo-muted px-4 py-3 text-sm text-mimo-noche focus:border-mimo-coral focus:outline-none';
    const labelCls = 'text-[10px] font-display font-extrabold uppercase tracking-[0.2em] text-mimo-quiet';

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
        <Card kicker="Editar perfil" className="mb-8">
            <div className="mb-6">
                <div className={`${labelCls} mb-2`}>Foto de perfil</div>
                <div className="flex items-center gap-3">
                    {avatarPreview ? (
                        <img src={avatarPreview} referrerPolicy="no-referrer" alt="" className="h-16 w-16 rounded-2xl object-cover" />
                    ) : (
                        <div className="h-16 w-16 rounded-2xl bg-mimo-coral flex items-center justify-center text-white font-display font-black text-2xl">
                            {(user.name || '?').charAt(0).toUpperCase()}
                        </div>
                    )}
                    <label className="cursor-pointer rounded-full border border-mimo-muted px-4 py-2 text-xs font-display font-extrabold uppercase tracking-widest text-mimo-noche hover:bg-mimo-muted">
                        {uploading ? 'Subiendo…' : 'Cambiar'}
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={uploading}
                            onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])}
                        />
                    </label>
                </div>
            </div>

            <div>
                <div className={`${labelCls} mb-2`}>Nombre</div>
                <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="mt-4">
                <div className={`${labelCls} mb-2`}>Email</div>
                <input className={`${inputCls} opacity-60 cursor-not-allowed`} value={user.email || ''} disabled readOnly />
                <div className="mt-1 text-[11px] text-mimo-quiet">Para cambiar tu email escribinos a somos.mimo.app@gmail.com.</div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <button
                    onClick={save}
                    disabled={saving || !name.trim()}
                    className="flex-1 rounded-full bg-mimo-coral text-white py-4 text-sm font-display font-extrabold uppercase tracking-widest hover:bg-mimo-coralDark disabled:opacity-50"
                >
                    {saving ? 'Guardando…' : 'Guardar cambios'}
                </button>
                <button
                    onClick={onClose}
                    className="rounded-full border border-mimo-muted text-mimo-ink px-6 py-4 text-sm font-display font-extrabold uppercase tracking-widest hover:bg-mimo-muted"
                >
                    Cerrar
                </button>
            </div>
            {msg ? <div className="mt-3 rounded-2xl bg-mimo-teal/10 p-3 text-center text-xs font-bold text-mimo-tealDark">{msg}</div> : null}
            {err ? <div className="mt-3 rounded-2xl bg-mimo-coral/10 p-3 text-center text-xs font-bold text-mimo-coral">{err}</div> : null}
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

    // --- Reports (user) --- //
    const [reports, setReports] = useState([]);
    const [reportsPage, setReportsPage] = useState(1);
    const [reportsTotalPages, setReportsTotalPages] = useState(1);
    const [reportsTotal, setReportsTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    // --- Alertas — unificado para user y vet --- //
    // - vet: fuente = /api/vets/me/dashboard (receives_lost / receives_found / alert_radius_km).
    // - user: fuente = /api/users/me (notify_lost / notify_found / notify_radius_km).
    // Mismos 3 controles, distinto endpoint al guardar (branch en saveAlerts).
    const [vetDash, setVetDash] = useState(null);
    const [vetLoaded, setVetLoaded] = useState(false);
    const [editing, setEditing] = useState(false);
    const [receivesLost, setReceivesLost] = useState(false);
    const [receivesFound, setReceivesFound] = useState(false);
    const [radius, setRadius] = useState(5);
    const [savingAlerts, setSavingAlerts] = useState(false);
    const [alertsMsg, setAlertsMsg] = useState('');

    // Items unificados de inbox (chats + matches)
    const items = useMemo(() => {
        const chats = (messages || []).map((m) => ({
            kind: 'chat',
            key: `chat-${m.pet_id}-${m.other_user_id}`,
            sortDate: m.created_at,
            ...m,
        }));
        const matches = (notifList || [])
            .filter((n) => n.type === 'match')
            .map((n) => ({
                kind: 'match',
                key: `match-${n.id}`,
                sortDate: n.created_at,
                ...n,
            }));
        return [...chats, ...matches].sort((a, b) => new Date(b.sortDate) - new Date(a.sortDate));
    }, [messages, notifList]);

    const unreadChatCount = messages
        ? messages.filter((m) => {
              const isUnread = m.is_read === false || m.is_read === 'false' || m.is_read === 0;
              const isForMe = Number(m.receiver_id) === Number(user?.id);
              return isUnread && isForMe;
          }).length
        : 0;
    const unreadMatchCount = (notifList || []).filter((n) => n.type === 'match' && !n.read_at).length;
    const unreadCount = unreadChatCount + unreadMatchCount;

    // --- Fetch reports --- //
    const fetchReports = async (pageNum = 1, append = false) => {
        if (!token) { navigate('/login'); return; }
        if (pageNum === 1) setLoading(true);
        else setLoadingMore(true);
        try {
            const res = await fetch(`${API}/api/pets/my-reports?page=${pageNum}&limit=10`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Error al sincronizar reportes.');
            const data = await res.json();
            setReports((prev) => (append ? [...prev, ...data.reports] : data.reports));
            setReportsPage(data.page);
            setReportsTotalPages(data.totalPages);
            setReportsTotal(data.total);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    // --- Fetch vet dashboard --- //
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

    // --- Fetch user notification prefs (solo para el path user) --- //
    // Aprovechamos para hidratar avatar_url en Redux — así los users que ya
    // estaban logueados antes de que el server empezara a devolverlo ven la
    // foto sin re-login.
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

    // --- Handlers --- //
    const handleLogout = () => {
        dispatch(clearCredentials());
        navigate('/app');
    };

    // Soft-delete de la cuenta. Los datos quedan en la DB — si el user vuelve
    // a loguearse o registrarse con el mismo email, la cuenta se reactiva.
    // Los reportes de mascotas no se borran (siguen siendo útiles para la
    // comunidad).
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

    const handleDeleteReport = async (id) => {
        if (!window.confirm('¿Eliminar este registro permanentemente?')) return;
        try {
            const res = await fetch(`${API}/api/pets/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Error al eliminar');
            setReports((prev) => prev.filter((r) => r.id !== id));
        } catch (err) {
            alert(err.message);
        }
    };

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
            <div className="min-h-screen bg-mimo-muted flex items-center justify-center">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-mimo-quiet animate-pulse">
                    Cargando…
                </div>
            </div>
        );
    }

    if (!user) return null;

    // ------ Rendering ------ //
    const vet = vetDash?.vet;
    const displayName = isVet && vet?.name ? vet.name : (user.name || 'Usuario');
    const successRate = vetDash && vetDash.stats.total_pets > 0
        ? Math.round((vetDash.stats.resolved_pets / vetDash.stats.total_pets) * 100)
        : null;
    // El slider tiene cap si es una vet en plan ally (gate comercial).
    // Para users normales el radio no depende de ningún plan → 50 km máx.
    const maxRadius = isVet && vet?.plan === 'ally' ? 5 : 50;

    return (
        <div className="min-h-screen bg-mimo-muted text-mimo-noche">
            <div className="max-w-6xl mx-auto px-6 pt-12 pb-16">

                {/* -------------------------- HERO -------------------------- */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
                    <div className="flex items-center gap-5">
                        <ProfileAvatar
                            src={isVet && vet ? vet.logo_url : user.avatar_url}
                            name={displayName}
                        />
                        <div>
                            <h1 className="font-display font-black text-5xl md:text-7xl tracking-tight leading-none">
                                {displayName}
                            </h1>
                            <div className="flex flex-wrap items-center gap-3 mt-4">
                            {isVet && vet ? (
                                <>
                                    <span className="text-sm font-semibold text-mimo-ink">
                                        {vet.is_sponsor ? '⭐ Socio Mimo' : 'Aliada'}
                                    </span>
                                    {!vet.approved && (
                                        <span className="text-[10px] font-bold uppercase tracking-widest bg-mimo-coral/10 text-mimo-coral px-3 py-1 rounded-full">
                                            Pendiente de aprobación
                                        </span>
                                    )}
                                    {vet.approved && (
                                        <Link
                                            to={`/vets/${vet.slug}`}
                                            className="text-[10px] font-bold uppercase tracking-widest text-mimo-quiet hover:text-mimo-noche"
                                        >
                                            Ver perfil público →
                                        </Link>
                                    )}
                                </>
                            ) : (
                                <span className="text-sm font-semibold text-mimo-ink">Miembro Mimo</span>
                            )}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => setEditing((v) => !v)}
                        className="rounded-full bg-mimo-coral text-white px-8 py-3 text-sm font-display font-extrabold uppercase tracking-widest hover:bg-mimo-coralDark shadow-mimo"
                    >
                        {editing ? 'Cerrar' : 'Editar'}
                    </button>
                </div>

                {/* -------------------------- VET STATS -------------------------- */}
                {isVet && vetDash ? (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        <StatTile label="Mascotas publicadas" value={vetDash.stats.total_pets} accent="#FF5C6C" />
                        <StatTile
                            label="Reencontradas"
                            value={vetDash.stats.resolved_pets}
                            hint={successRate !== null ? `${successRate}% tasa` : null}
                            accent="#3ECFB2"
                        />
                        <StatTile
                            label="Alertas recibidas"
                            value={vetDash.stats.total_alerts}
                            hint={vetDash.stats.unread_alerts > 0 ? `${vetDash.stats.unread_alerts} sin leer` : 'al día'}
                            accent="#FFB830"
                        />
                        <StatTile
                            label="Radio de alerta"
                            value={`${vet.alert_radius_km} km`}
                            hint={vet.plan === 'ally' ? 'Ally · máx 5' : 'Socio Mimo'}
                            accent="#9B6DFF"
                        />
                    </div>
                ) : null}

                {/* -------------------------- SPONSOR CTA -------------------------- */}
                {isVet && vet && !vet.is_sponsor ? (
                    <div className="rounded-[32px] p-8 mb-8 text-mimo-warm bg-gradient-to-br from-mimo-sol to-mimo-coral shadow-mimo">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="max-w-lg">
                                <div className="text-[10px] font-display font-extrabold uppercase tracking-[0.2em] opacity-80">Sumate como</div>
                                <div className="mt-2 flex items-center gap-3 flex-wrap">
                                    <span className="font-display font-black text-3xl tracking-tight leading-none">Socio</span>
                                    <MimoLogo variant="wordmarkText" size={95} bg="dark" />
                                </div>
                                <p className="mt-3 text-sm opacity-90 leading-relaxed">
                                    Alcance de alertas hasta 50 km, card destacada en el directorio,
                                    badge visible en cada publicación y dashboard extendido.
                                </p>
                            </div>
                            <a
                                href="mailto:somos.mimo.app@gmail.com?subject=Quiero%20ser%20Socio%20Mimo"
                                className="rounded-full bg-mimo-noche text-white px-6 py-3 text-sm font-display font-extrabold uppercase tracking-widest hover:opacity-90"
                            >
                                Contactar
                            </a>
                        </div>
                    </div>
                ) : null}

                {/* -------------------------- EDIT FORM -------------------------- */}
                {editing ? (
                    isVet && vet ? (
                        <VetEditForm
                            vet={vet}
                            token={token}
                            onClose={() => setEditing(false)}
                            onSaved={fetchVetDashboard}
                        />
                    ) : (
                        <UserEditForm
                            user={user}
                            token={token}
                            dispatch={dispatch}
                            onClose={() => setEditing(false)}
                        />
                    )
                ) : null}

                {/* -------------------------- GRID 2 COLS -------------------------- */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Columna izquierda (span 2) */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* 1. Bandeja de entrada */}
                        <Card>
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="font-display font-extrabold text-2xl text-mimo-noche tracking-tight">Bandeja de entrada</h2>
                                <span
                                    className={`text-[9px] font-display font-extrabold px-3 py-1 rounded-full uppercase tracking-widest ${unreadCount > 0 ? 'bg-mimo-teal text-white animate-pulse' : 'bg-mimo-muted text-mimo-quiet'}`}
                                >
                                    {unreadCount > 0 ? `${unreadCount} Nuevos` : `${items.length} Activos`}
                                </span>
                            </div>
                            {items.length === 0 ? (
                                <div className="py-16 text-center text-sm text-mimo-quiet">No hay actividad reciente.</div>
                            ) : (
                                <div className="space-y-3">
                                    {items.map((item) => {
                                        if (item.kind === 'chat') {
                                            const isUnread = item.is_read === false || item.is_read === 'false' || item.is_read === 0;
                                            const isForMe = Number(item.receiver_id) === Number(user?.id);
                                            const hasUnread = isUnread && isForMe;
                                            return (
                                                <div
                                                    key={item.key}
                                                    onClick={() => handleOpenChat(item)}
                                                    className="group flex gap-4 items-center p-4 rounded-2xl border border-transparent hover:border-mimo-muted hover:bg-mimo-muted cursor-pointer transition-all"
                                                >
                                                    <div className={`w-12 h-12 bg-mimo-muted rounded-xl flex-shrink-0 overflow-hidden ${hasUnread ? 'ring-2 ring-mimo-teal/50' : ''}`}>
                                                        {item.photo_url ? <img src={item.photo_url} className="w-full h-full object-cover" alt="pet" /> : null}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className={`text-[9px] font-bold uppercase tracking-widest ${hasUnread ? 'text-mimo-tealDark' : 'text-mimo-quiet'}`}>
                                                            {hasUnread ? 'Nuevo mensaje' : (item.other_user_name || 'Consulta')}
                                                        </div>
                                                        <p className={`text-sm truncate ${hasUnread ? 'text-mimo-noche font-bold' : 'text-mimo-ink font-medium'}`}>
                                                            {item.sender_id === user.id ? <span className="text-mimo-quiet">Tú: </span> : null}
                                                            {item.content}
                                                        </p>
                                                    </div>
                                                    {hasUnread && <div className="w-2.5 h-2.5 bg-mimo-teal rounded-full flex-shrink-0" />}
                                                </div>
                                            );
                                        }
                                        // match
                                        const hasUnread = !item.read_at;
                                        const photo = item.data?.photo_url;
                                        return (
                                            <div
                                                key={item.key}
                                                onClick={() => handleOpenMatch(item)}
                                                className="group flex gap-4 items-center p-4 rounded-2xl border border-transparent hover:border-mimo-muted hover:bg-mimo-muted cursor-pointer transition-all"
                                            >
                                                <div className={`w-12 h-12 bg-mimo-muted rounded-xl flex-shrink-0 overflow-hidden ${hasUnread ? 'ring-2 ring-mimo-violeta/50' : ''}`}>
                                                    {photo ? <img src={photo} className="w-full h-full object-cover" alt="posible match" /> : null}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-[9px] font-bold uppercase tracking-widest text-mimo-violeta">Posible coincidencia</div>
                                                    <p className={`text-sm truncate ${hasUnread ? 'text-mimo-noche font-bold' : 'text-mimo-ink font-medium'}`}>
                                                        Reportaron una mascota similar{item.data?.match_name ? ` a ${item.data.match_name}` : ''}. ¿Es la tuya?
                                                    </p>
                                                </div>
                                                {hasUnread && <div className="w-2.5 h-2.5 bg-mimo-violeta rounded-full flex-shrink-0" />}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </Card>

                        {/* 2. Alertas recientes (solo si es vet) */}
                        {isVet && vetDash ? (
                            <Card>
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="font-display font-extrabold text-2xl text-mimo-noche tracking-tight">Alertas recientes</h2>
                                    <span
                                        className={`text-[9px] font-display font-extrabold px-3 py-1 rounded-full uppercase tracking-widest ${vetDash.stats.unread_alerts > 0 ? 'bg-mimo-coral text-white animate-pulse' : 'bg-mimo-muted text-mimo-quiet'}`}
                                    >
                                        {vetDash.stats.unread_alerts > 0 ? `${vetDash.stats.unread_alerts} sin leer` : `${vetDash.recent_alerts.length} activas`}
                                    </span>
                                </div>
                                {vetDash.recent_alerts.length === 0 ? (
                                    <div className="py-10 text-center text-sm text-mimo-quiet">Sin alertas por ahora.</div>
                                ) : (
                                    <div className="space-y-3">
                                        {vetDash.recent_alerts.map((a) => {
                                            const isLost = a.type === 'nearby_vet_lost';
                                            const petId = a.data?.pet_id;
                                            return (
                                                <Link
                                                    key={a.id}
                                                    to={petId ? `/pet/${petId}` : '#'}
                                                    className="flex items-center gap-4 rounded-2xl border border-mimo-muted p-3 hover:bg-mimo-muted transition-colors"
                                                >
                                                    <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-mimo-muted">
                                                        {a.pet_photo ? <img src={a.pet_photo} className="h-full w-full object-cover" alt="" /> : null}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="text-[10px] font-display font-extrabold uppercase tracking-widest" style={{ color: isLost ? '#FF5C6C' : '#3ECFB2' }}>
                                                            {isLost ? 'Perdida cerca' : 'Encontrada cerca'}
                                                        </div>
                                                        <div className="mt-0.5 text-sm font-bold text-mimo-noche truncate">{a.pet_name || 'Sin nombre'}</div>
                                                        <div className="text-xs text-mimo-quiet truncate">{a.pet_address || 'Sin ubicación'}</div>
                                                    </div>
                                                    {!a.read_at && <div className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-mimo-coral" />}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                )}
                            </Card>
                        ) : null}

                        {/* 3. Mis reportes */}
                        <Card>
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="font-display font-extrabold text-2xl text-mimo-noche tracking-tight">Mis reportes</h2>
                                <span className="text-[9px] font-display font-extrabold px-3 py-1 rounded-full uppercase tracking-widest bg-mimo-muted text-mimo-quiet">
                                    {reportsTotal} totales
                                </span>
                            </div>
                            {reports.length === 0 ? (
                                <div className="py-10 text-center text-sm text-mimo-quiet">Todavía no publicaste ningún reporte.</div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {reports.map((report) => (
                                            <div key={report.id} className="group flex items-center gap-4 rounded-2xl border border-mimo-muted p-4 hover:shadow-mimo transition-shadow">
                                                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-mimo-muted flex-shrink-0">
                                                    {report.photo_url ? <img src={report.photo_url} className="w-full h-full object-cover" alt="pet" /> : null}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className={`text-[9px] font-bold uppercase tracking-widest mb-1 ${report.resolved_at ? 'text-mimo-teal' : report.status === 'lost' ? 'text-mimo-coral' : 'text-mimo-quiet'}`}>
                                                        {report.resolved_at ? 'Reencontrada ✓' : report.status === 'lost' ? 'Buscando' : 'Registrado'}
                                                    </div>
                                                    <h4 className="text-sm font-bold text-mimo-noche truncate leading-tight mb-2">{report.description || 'Sin descripción'}</h4>
                                                    <button
                                                        onClick={() => handleDeleteReport(report.id)}
                                                        className="text-[9px] font-bold uppercase tracking-widest text-mimo-quiet hover:text-mimo-coral transition-colors"
                                                    >
                                                        Eliminar
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {reportsPage < reportsTotalPages && (
                                        <div className="flex justify-center mt-6">
                                            <button
                                                onClick={() => fetchReports(reportsPage + 1, true)}
                                                disabled={loadingMore}
                                                className="px-8 py-3 bg-mimo-noche text-white text-[10px] font-display font-extrabold uppercase tracking-widest rounded-full hover:opacity-90 disabled:opacity-50"
                                            >
                                                {loadingMore ? 'Cargando…' : `Cargar más (${reportsPage} de ${reportsTotalPages})`}
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </Card>
                    </div>

                    {/* Columna derecha */}
                    <div className="space-y-6">

                        {/* Configuración de alertas — mismos 3 controles para user y vet.
                            La diferencia real está en el endpoint (branch en saveAlerts) y en
                            el cap del radio (solo si vet en plan ally). */}
                        <Card kicker="Configuración de alertas">
                            <div className="space-y-3">
                                <label className="flex items-center justify-between rounded-2xl border border-mimo-muted p-4 cursor-pointer hover:bg-mimo-muted">
                                    <div className="pr-4">
                                        <div className="text-sm font-bold text-mimo-noche">Mascotas perdidas</div>
                                        <div className="text-xs text-mimo-quiet mt-1">Recibir alertas cuando reporten una perdida en tu radio.</div>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={receivesLost}
                                        onChange={(e) => setReceivesLost(e.target.checked)}
                                        className="h-5 w-5 accent-mimo-coral"
                                    />
                                </label>
                                <label className="flex items-center justify-between rounded-2xl border border-mimo-muted p-4 cursor-pointer hover:bg-mimo-muted">
                                    <div className="pr-4">
                                        <div className="text-sm font-bold text-mimo-noche">Mascotas encontradas</div>
                                        <div className="text-xs text-mimo-quiet mt-1">Recibir alertas cuando reporten una encontrada.</div>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={receivesFound}
                                        onChange={(e) => setReceivesFound(e.target.checked)}
                                        className="h-5 w-5 accent-mimo-coral"
                                    />
                                </label>
                                <div className="rounded-2xl border border-mimo-muted p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm font-bold text-mimo-noche">Radio de alerta</div>
                                        <div className="text-2xl font-black text-mimo-coral font-display">{radius} km</div>
                                    </div>
                                    <input
                                        type="range"
                                        min={1}
                                        max={maxRadius}
                                        value={radius}
                                        onChange={(e) => setRadius(Number(e.target.value))}
                                        className="mt-3 w-full accent-mimo-coral"
                                    />
                                    {isVet && vet?.plan === 'ally' ? (
                                        <div className="mt-2 text-[11px] text-mimo-quiet">
                                            Plan gratis: hasta 5 km. <span className="font-bold text-mimo-solDark">Socio Mimo extiende a 50 km.</span>
                                        </div>
                                    ) : null}
                                </div>
                            </div>

                            <button
                                onClick={saveAlerts}
                                disabled={savingAlerts}
                                className="mt-6 w-full rounded-full bg-mimo-coral text-white py-4 text-sm font-display font-extrabold uppercase tracking-widest hover:bg-mimo-coralDark disabled:opacity-50 shadow-mimo"
                            >
                                {savingAlerts ? 'Guardando…' : 'Guardar cambios'}
                            </button>
                            {alertsMsg ? (
                                <div className="mt-3 text-center text-xs font-bold text-mimo-tealDark">{alertsMsg}</div>
                            ) : null}
                        </Card>

                        {/* Cuentas vinculadas */}
                        <LinkedAccounts />

                        {/* Sesión */}
                        <div className="space-y-3">
                            <button
                                onClick={handleLogout}
                                className="w-full rounded-full bg-mimo-teal text-white py-4 text-sm font-display font-extrabold uppercase tracking-widest hover:bg-mimo-tealDark transition-colors"
                            >
                                Cerrar sesión
                            </button>
                            <button
                                onClick={handleDeleteAccount}
                                className="w-full rounded-full bg-mimo-coral text-white py-4 text-sm font-display font-extrabold uppercase tracking-widest hover:bg-mimo-coralDark transition-colors"
                            >
                                Eliminar cuenta
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Profile;
