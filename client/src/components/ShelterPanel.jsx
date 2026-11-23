import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Pencil, LogOut, Plus, Check, Trash2, ArrowRight, Camera, X, ChevronLeft, ChevronRight, FileText, PawPrint } from 'lucide-react';
import { clearCredentials } from '../store/userSlice';
import { CONTACT_EMAIL, mailtoContact } from '../utils/links';
import { C } from '../utils/theme';
import LinkedAccounts from './LinkedAccounts';

const API = import.meta.env.VITE_API_URL || '';

const SPECIES_LABEL = { dog: 'Perro', cat: 'Gato', other: 'Otro' };
const SIZE_LABEL = { small: 'Chico', medium: 'Mediano', large: 'Grande' };
const AGE_LABEL = { puppy: 'Cachorro', young: 'Joven', adult: 'Adulto', senior: 'Senior' };
const MAX_PHOTOS = 6;

const kicker = 'm-0 text-xs font-bold tracking-[.1em] uppercase';
const inputCls = 'w-full h-[52px] px-4 rounded-2xl bg-white border border-mimo-muted focus:border-mimo-noche outline-none text-[15px] placeholder:text-mimo-noche/60';

function Field({ label, hint, required, children }) {
    return (
        <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold tracking-[.08em] uppercase">
                {label}{required ? <span className="text-mimo-coral"> *</span> : null}
            </span>
            {children}
            {hint ? <span className="text-[13px]">{hint}</span> : null}
        </label>
    );
}

function Pills({ value, onChange, options }) {
    return (
        <div className="flex flex-wrap gap-2">
            {options.map(([v, l]) => (
                <button
                    key={v}
                    type="button"
                    onClick={() => onChange(v)}
                    aria-pressed={value === v}
                    className={`h-10 px-4 rounded-full text-sm transition-colors ${value === v ? 'bg-mimo-noche text-mimo-warm font-bold' : 'bg-white border border-mimo-muted hover:border-mimo-noche'}`}
                >
                    {l}
                </button>
            ))}
        </div>
    );
}

const iconBtn = 'w-7 h-7 rounded-full bg-mimo-noche/70 hover:bg-mimo-noche text-mimo-warm flex items-center justify-center disabled:opacity-30';

// Crear (pet = null) o editar una mascota en adopción.
function AdoptionPetForm({ pet, onCancel, onSaved, token }) {
    const [form, setForm] = useState(() => ({
        name: pet?.name || '',
        species: pet?.species || 'dog',
        sex: pet?.sex || 'unknown',
        age_group: pet?.age_group || 'unknown',
        size: pet?.size || 'medium',
        color: pet?.color || '',
        description: pet?.description || '',
        vaccinated: !!pet?.vaccinated,
        neutered: !!pet?.neutered,
    }));
    const [photos, setPhotos] = useState(() => (Array.isArray(pet?.photos) ? pet.photos : []));
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const editing = !!pet;

    const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
    const upd = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    // Sube una foto. Con replaceIndex reemplaza esa posición; si no, agrega al final.
    const uploadPhoto = async (file, replaceIndex = null) => {
        setUploading(true);
        setError('');
        try {
            const fd = new FormData();
            fd.append('photo', file);
            const res = await fetch(`${API}/api/adoption-pets/upload-photo`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: fd,
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'No se pudo subir la foto.');
            setPhotos((p) => {
                if (replaceIndex === null) return [...p, data.url];
                const next = [...p];
                next[replaceIndex] = data.url;
                return next;
            });
        } catch (err) {
            setError(err.message);
        } finally {
            setUploading(false);
        }
    };

    const removePhotoAt = (i) => setPhotos((p) => p.filter((_, idx) => idx !== i));
    const movePhoto = (i, dir) => setPhotos((p) => {
        const j = i + dir;
        if (j < 0 || j >= p.length) return p;
        const next = [...p];
        [next[i], next[j]] = [next[j], next[i]];
        return next;
    });

    const submit = async (e) => {
        e.preventDefault();
        if (photos.length === 0) return setError('Subí al menos una foto.');
        setSaving(true);
        setError('');
        try {
            const url = editing ? `${API}/api/adoption-pets/${pet.id}` : `${API}/api/adoption-pets`;
            const res = await fetch(url, {
                method: editing ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ ...form, photos }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'No se pudo guardar.');
            onSaved(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={submit} className="bg-white rounded-3xl p-5 md:p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between gap-4">
                <h3 className="m-0 font-display font-black text-2xl">{editing ? 'Editar publicación' : 'Nueva mascota'}</h3>
                <button type="button" onClick={onCancel} className="text-[15px] font-bold underline hover:text-mimo-coral">Cancelar</button>
            </div>

            <div className="flex flex-col gap-2">
                <span className="text-xs font-bold tracking-[.08em] uppercase">Fotos <span className="text-mimo-coral">*</span></span>
                <div className="flex flex-wrap gap-3">
                    {photos.map((url, i) => (
                        <div key={`${url}-${i}`} className="relative w-28 h-28 rounded-[18px] overflow-hidden bg-mimo-muted">
                            <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                            {i === 0 && <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-full bg-mimo-noche/80 text-mimo-warm text-[11px] font-bold">Principal</span>}
                            <div className="absolute top-1.5 right-1.5 flex gap-1">
                                <button type="button" onClick={() => movePhoto(i, -1)} disabled={i === 0} aria-label="Mover a la izquierda" className={iconBtn}><ChevronLeft size={14} strokeWidth={2.5} /></button>
                                <button type="button" onClick={() => movePhoto(i, 1)} disabled={i === photos.length - 1} aria-label="Mover a la derecha" className={iconBtn}><ChevronRight size={14} strokeWidth={2.5} /></button>
                                <button type="button" onClick={() => removePhotoAt(i)} aria-label="Quitar foto" className={iconBtn}><X size={14} strokeWidth={2.5} /></button>
                            </div>
                            <label className="absolute bottom-1.5 right-1.5 w-7 h-7 rounded-full bg-mimo-noche/70 hover:bg-mimo-noche text-mimo-warm flex items-center justify-center cursor-pointer" aria-label="Reemplazar foto">
                                <Camera size={14} strokeWidth={2.5} />
                                <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0], i)} />
                            </label>
                        </div>
                    ))}
                    {photos.length < MAX_PHOTOS && (
                        <label className="w-28 h-28 rounded-[18px] border-2 border-dashed border-mimo-violeta bg-white flex items-center justify-center cursor-pointer hover:bg-mimo-warm" aria-label="Agregar foto">
                            {uploading ? <span className="text-sm font-bold">Subiendo…</span> : <Plus size={26} strokeWidth={2} />}
                            <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])} />
                        </label>
                    )}
                </div>
                <span className="text-[13px]">Hasta {MAX_PHOTOS}. La primera es la principal.</span>
            </div>

            <Field label="Nombre">
                <input className={inputCls} value={form.name} onChange={upd('name')} placeholder="Firulais" maxLength={60} />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="flex flex-col gap-2"><span className="text-xs font-bold tracking-[.08em] uppercase">Especie</span>
                    <Pills value={form.species} onChange={set('species')} options={[['dog', 'Perro'], ['cat', 'Gato'], ['other', 'Otro']]} /></div>
                <div className="flex flex-col gap-2"><span className="text-xs font-bold tracking-[.08em] uppercase">Sexo</span>
                    <Pills value={form.sex} onChange={set('sex')} options={[['male', 'Macho'], ['female', 'Hembra'], ['unknown', 'Sin dato']]} /></div>
                <div className="flex flex-col gap-2"><span className="text-xs font-bold tracking-[.08em] uppercase">Edad</span>
                    <Pills value={form.age_group} onChange={set('age_group')} options={[['puppy', 'Cachorro'], ['young', 'Joven'], ['adult', 'Adulto'], ['senior', 'Senior'], ['unknown', 'Sin dato']]} /></div>
                <div className="flex flex-col gap-2"><span className="text-xs font-bold tracking-[.08em] uppercase">Tamaño</span>
                    <Pills value={form.size} onChange={set('size')} options={[['small', 'Chico'], ['medium', 'Mediano'], ['large', 'Grande']]} /></div>
            </div>

            <Field label="Color">
                <input className={inputCls} value={form.color} onChange={upd('color')} placeholder="Marrón, blanco…" maxLength={30} />
            </Field>

            <Field label="Descripción" hint="Su historia, carácter y qué hogar necesita. Hasta 2000 caracteres.">
                <textarea className={`${inputCls} h-auto min-h-[120px] py-3.5 resize-y`} value={form.description} onChange={upd('description')} maxLength={2000} />
            </Field>

            <div className="flex flex-wrap gap-2">
                {[['vaccinated', 'Vacunado'], ['neutered', 'Castrado']].map(([k, l]) => (
                    <button
                        key={k}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, [k]: !f[k] }))}
                        aria-pressed={form[k]}
                        className={`h-10 px-4 rounded-full text-sm flex items-center gap-1.5 transition-colors ${form[k] ? 'bg-mimo-noche text-mimo-warm font-bold' : 'bg-white border border-mimo-muted hover:border-mimo-noche'}`}
                    >
                        {form[k] && <Check size={15} strokeWidth={2.5} />}
                        {l}
                    </button>
                ))}
            </div>

            {error && <p className="m-0 text-sm font-bold text-mimo-coral" role="alert">{error}</p>}

            <button
                type="submit"
                disabled={saving || uploading}
                className="h-[52px] rounded-2xl bg-mimo-noche text-mimo-warm font-bold text-[15px] hover:bg-mimo-nocheAlt disabled:opacity-50"
            >
                {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Publicar'}
            </button>
        </form>
    );
}

function PetRow({ pet, onMarkAdopted, onDelete, onEdit }) {
    const adopted = !!pet.adopted_at;
    const meta = [SPECIES_LABEL[pet.species], SIZE_LABEL[pet.size], AGE_LABEL[pet.age_group]].filter(Boolean).join(' · ');
    const ghost = 'h-10 px-4 rounded-xl border border-mimo-muted bg-white text-[15px] font-bold flex items-center gap-1.5 hover:border-mimo-noche';
    return (
        <div className="bg-white rounded-3xl p-3 flex flex-col sm:flex-row sm:items-center gap-3.5">
            <div className="flex items-center gap-3.5 flex-1 min-w-0">
                <span className="w-[72px] h-[72px] rounded-[18px] bg-mimo-muted overflow-hidden shrink-0 flex items-center justify-center">
                    {pet.photos?.[0] ? <img src={pet.photos[0]} alt="" className="w-full h-full object-cover" /> : <PawPrint size={28} strokeWidth={1.5} opacity={0.35} />}
                </span>
                <span className="flex-1 min-w-0 flex flex-col items-start gap-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold text-mimo-muted" style={{ background: adopted ? C.noche : C.violeta }}>
                        {adopted ? 'Adoptado' : 'En adopción'}
                    </span>
                    <Link to={`/adoptions/${pet.id}`} className="text-[17px] font-bold truncate max-w-full hover:text-mimo-coral">{pet.name || 'Sin nombre'}</Link>
                    {meta && <span className="text-sm">{meta}</span>}
                </span>
            </div>
            <div className="flex flex-wrap gap-2">
                {!adopted && (
                    <button onClick={() => onMarkAdopted(pet.id)} className="h-10 px-4 rounded-xl bg-mimo-teal text-mimo-noche text-[15px] font-bold flex items-center gap-1.5 hover:opacity-90">
                        <Check size={17} strokeWidth={2.5} />
                        Adoptado
                    </button>
                )}
                <button onClick={() => onEdit(pet)} className={ghost}><Pencil size={16} strokeWidth={2} />Editar</button>
                <button onClick={() => onDelete(pet.id)} className={`${ghost} hover:text-mimo-coral`}><Trash2 size={16} strokeWidth={2} />Borrar</button>
            </div>
        </div>
    );
}

// Datos del refugio + logo y portada.
function ShelterEditForm({ shelter, onSaved, onClose, onUpload, token }) {
    const [form, setForm] = useState(() => ({
        name: shelter.name || '',
        city: shelter.city || '',
        // Sin dirección: no se pide ni se guarda (ver PUBLIC_COLUMNS en
        // shelterController). Publicar el domicilio de un refugio expone a
        // las personas y a los animales.
        phone: shelter.phone || '',
        whatsapp: shelter.whatsapp || '',
        website: shelter.website || '',
        instagram: shelter.instagram || '',
        email: shelter.email || '',
        bio: shelter.bio || '',
    }));
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(null);
    const [msg, setMsg] = useState('');
    const upd = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const upload = async (field, file) => {
        setUploading(field);
        await onUpload(field, file);
        setUploading(null);
    };

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMsg('');
        try {
            const body = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ''));
            const res = await fetch(`${API}/api/shelters/me`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'No se pudo guardar.');
            onSaved(data);
        } catch (err) {
            setMsg(err.message);
        } finally {
            setSaving(false);
        }
    };

    const imgPick = (field, label, preview, wide) => (
        <div className="flex flex-col gap-2">
            <span className="text-xs font-bold tracking-[.08em] uppercase">{label}</span>
            <div className="flex items-center gap-3">
                {preview ? (
                    <img src={preview} alt="" className={`h-16 ${wide ? 'w-24' : 'w-16'} rounded-2xl object-cover bg-mimo-muted`} />
                ) : (
                    <div className={`h-16 ${wide ? 'w-24' : 'w-16'} rounded-2xl bg-mimo-muted`} />
                )}
                <label className={`h-10 px-4 rounded-xl border-2 border-mimo-noche text-sm font-bold flex items-center gap-1.5 ${uploading ? 'opacity-50' : 'cursor-pointer hover:bg-mimo-warm'}`}>
                    <Camera size={16} strokeWidth={2} />
                    {uploading === field ? 'Subiendo…' : 'Cambiar'}
                    <input type="file" accept="image/*" className="hidden" disabled={!!uploading} onChange={(e) => e.target.files?.[0] && upload(field, e.target.files[0])} />
                </label>
            </div>
        </div>
    );

    return (
        <form onSubmit={submit} className="bg-white rounded-3xl p-5 md:p-6 flex flex-col gap-5">
            <p className={kicker}>Editar datos del refugio</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {imgPick('logo', 'Logo', shelter.logo_url)}
                {imgPick('cover', 'Portada', shelter.cover_url, true)}
            </div>
            <Field label="Nombre" required>
                <input className={inputCls} value={form.name} onChange={upd('name')} maxLength={120} required />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Ciudad"><input className={inputCls} value={form.city} onChange={upd('city')} maxLength={80} /></Field>
                <Field label="Teléfono"><input className={inputCls} value={form.phone} onChange={upd('phone')} maxLength={30} /></Field>
                <Field label="WhatsApp"><input className={inputCls} value={form.whatsapp} onChange={upd('whatsapp')} maxLength={30} /></Field>
                <Field label="Email"><input type="email" className={inputCls} value={form.email} onChange={upd('email')} maxLength={150} /></Field>
                <Field label="Sitio web"><input type="url" className={inputCls} value={form.website} onChange={upd('website')} maxLength={200} /></Field>
                <Field label="Instagram" hint="Sin @"><input className={inputCls} value={form.instagram} onChange={upd('instagram')} maxLength={80} /></Field>
            </div>
            <Field label="Sobre el refugio">
                <textarea className={`${inputCls} h-auto min-h-[110px] py-3.5 resize-y`} value={form.bio} onChange={upd('bio')} maxLength={2000} />
            </Field>
            <div className="flex flex-col sm:flex-row gap-2.5">
                <button type="submit" disabled={saving} className="flex-1 h-[52px] rounded-2xl bg-mimo-noche text-mimo-warm font-bold text-[15px] hover:bg-mimo-nocheAlt disabled:opacity-50">
                    {saving ? 'Guardando…' : 'Guardar cambios'}
                </button>
                <button type="button" onClick={onClose} className="h-[52px] px-6 rounded-2xl border-2 border-mimo-noche font-bold text-[15px] hover:bg-mimo-warm">Cancelar</button>
            </div>
            {msg && <p className="m-0 text-sm font-bold text-mimo-coral" role="alert">{msg}</p>}
        </form>
    );
}

export default function ShelterPanel() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const token = useSelector((s) => s.user?.token);
    const [shelter, setShelter] = useState(null);
    const [pets, setPets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingShelter, setEditingShelter] = useState(false);
    const [creatingPet, setCreatingPet] = useState(false);
    const [editingPet, setEditingPet] = useState(null);

    const load = useCallback(async () => {
        try {
            const [r1, r2] = await Promise.all([
                fetch(`${API}/api/shelters/me`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API}/api/adoption-pets/mine`, { headers: { Authorization: `Bearer ${token}` } }),
            ]);
            if (r1.ok) setShelter(await r1.json());
            if (r2.ok) setPets((await r2.json()).pets || []);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => { load(); }, [load]);

    const handleLogout = () => {
        dispatch(clearCredentials());
        navigate('/login');
    };

    const uploadImage = async (field, file) => {
        const fd = new FormData();
        fd.append('image', file);
        fd.append('field', field);
        const res = await fetch(`${API}/api/shelters/me/image`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: fd,
        });
        if (res.ok) await load();
    };

    const markAdopted = async (id) => {
        await fetch(`${API}/api/adoption-pets/${id}/adopted`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
        load();
    };
    const removePet = async (id) => {
        if (!window.confirm('¿Borrar esta publicación?')) return;
        await fetch(`${API}/api/adoption-pets/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
        load();
    };

    // Eliminar cuenta = soft-delete del user (que en cascada oculta el refugio).
    // Se recupera registrándose de nuevo con el mismo email.
    const deleteAccount = async () => {
        if (!window.confirm('¿Eliminar tu cuenta? Se ocultan tus publicaciones activas y el perfil público del refugio.')) return;
        if (!window.confirm('Esta acción cierra la cuenta. Si te arrepentís, podés recuperarla registrándote de nuevo con el mismo email. ¿Confirmás?')) return;
        try {
            const res = await fetch(`${API}/api/users/me`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('No se pudo eliminar la cuenta.');
            dispatch(clearCredentials());
            navigate('/login');
        } catch (e) {
            alert(e.message);
        }
    };

    if (loading || !shelter) {
        return (
            <div className="flex-1 bg-mimo-warm" aria-label="Cargando">
                <div className="max-w-[1200px] mx-auto px-4 md:px-6 xl:px-0 pt-9 pb-20 flex flex-col lg:flex-row gap-7 animate-pulse">
                    <div className="w-full lg:w-[340px] h-[360px] rounded-[32px] bg-mimo-muted" />
                    <div className="flex-1 flex flex-col gap-5">
                        <div className="h-28 rounded-3xl bg-mimo-muted" />
                        <div className="h-48 rounded-3xl bg-mimo-muted" />
                    </div>
                </div>
            </div>
        );
    }

    const active = pets.filter((p) => !p.adopted_at && !p.deleted_at);
    const historical = pets.filter((p) => p.adopted_at || p.deleted_at);
    const adoptedCount = pets.filter((p) => p.adopted_at).length;
    const approved = shelter.approved;
    const formOpen = creatingPet || !!editingPet;

    return (
        <div className="flex-1 bg-mimo-warm font-sans text-mimo-noche">
            <main className="max-w-[1200px] mx-auto px-4 md:px-6 xl:px-0 pt-9 pb-20 flex flex-col lg:flex-row gap-7 items-start">
                <aside className="w-full lg:w-[340px] lg:sticky lg:top-[100px] shrink-0 flex flex-col gap-4">
                    <section className="rounded-[32px] p-7 flex flex-col gap-4 text-mimo-warm" style={{ background: C.teal }}>
                        <p className={kicker}>Mi refugio</p>
                        {shelter.logo_url ? (
                            <img src={shelter.logo_url} alt="" className="w-[84px] h-[84px] rounded-[24px] object-cover bg-white" />
                        ) : (
                            <span className="w-[84px] h-[84px] rounded-[24px] bg-white text-mimo-noche flex items-center justify-center font-display font-black text-[40px]">
                                {shelter.name.charAt(0).toUpperCase()}
                            </span>
                        )}
                        <div className="flex flex-col gap-1.5 min-w-0">
                            <h1 className="m-0 font-display font-black text-[30px] leading-[1.05] break-words">{shelter.name}</h1>
                            {shelter.city && <span className="text-[15px]">{shelter.city}</span>}
                        </div>
                        {!approved && <span className="self-start px-3 py-1 rounded-full bg-mimo-noche text-[13px] font-bold">Verificación pendiente</span>}
                        {approved && (
                            <Link to={`/shelters/${shelter.slug}`} className="flex items-center gap-1 text-[15px] font-bold underline hover:opacity-80">
                                Ver perfil público <ArrowRight size={16} strokeWidth={2} />
                            </Link>
                        )}
                        <button
                            onClick={() => setEditingShelter((v) => !v)}
                            className="self-start h-10 px-4 rounded-full border border-white/60 font-bold text-[15px] flex items-center gap-1.5 hover:bg-white/10"
                        >
                            <Pencil size={16} strokeWidth={2} />
                            {editingShelter ? 'Cerrar edición' : 'Editar'}
                        </button>
                    </section>
                    <button onClick={handleLogout} className="h-[52px] rounded-2xl border-2 border-mimo-noche font-bold text-[15px] flex items-center justify-center gap-2 hover:bg-white">
                        <LogOut size={18} strokeWidth={2} />
                        Cerrar sesión
                    </button>
                    <button onClick={deleteAccount} className="self-center text-[15px] font-bold underline hover:text-mimo-coral">Eliminar cuenta</button>
                </aside>

                <div className="w-full flex-1 min-w-0 flex flex-col gap-6">
                    {editingShelter && (
                        <ShelterEditForm
                            shelter={shelter}
                            token={token}
                            onUpload={uploadImage}
                            onClose={() => setEditingShelter(false)}
                            onSaved={(s) => { setShelter(s); setEditingShelter(false); }}
                        />
                    )}

                    {!approved && (
                        <section className="bg-white rounded-3xl p-5 md:p-6 flex items-start gap-3.5">
                            <span className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: C.sol }}>
                                <FileText size={22} strokeWidth={2} color={C.noche} />
                            </span>
                            <div className="flex flex-col gap-2 text-[15px] leading-normal">
                                <b className="font-display font-black text-xl">Falta verificar el refugio</b>
                                <span>
                                    Para publicar mascotas en adopción tenés que verificar que representás a un refugio o protectora.
                                    Mandá a <a href={mailtoContact('Verificación de refugio Mimo')} className="font-bold underline">{CONTACT_EMAIL}</a> los
                                    comprobantes que tengas (papeles de la ONG, cuenta bancaria a nombre del refugio, redes sociales) desde el email de tu cuenta.
                                </span>
                                <span>Mientras tanto podés completar los datos del refugio. Cuando un admin lo apruebe, ya podés publicar.</span>
                            </div>
                        </section>
                    )}

                    {/* Adopciones: solo si el refugio está aprobado (el server
                        también lo exige; escondemos botones que darían 403). */}
                    {approved && (
                        <>
                            <div className="grid grid-cols-2 gap-3.5">
                                <div className="bg-white rounded-3xl p-[18px] flex flex-col gap-1.5" style={{ borderTop: `4px solid ${C.violeta}` }}>
                                    <span className="text-xs font-bold tracking-[.08em] uppercase">En adopción</span>
                                    <b className="font-display font-black text-[32px] leading-none">{active.length}</b>
                                </div>
                                <div className="bg-white rounded-3xl p-[18px] flex flex-col gap-1.5" style={{ borderTop: `4px solid ${C.teal}` }}>
                                    <span className="text-xs font-bold tracking-[.08em] uppercase">Adoptadas</span>
                                    <b className="font-display font-black text-[32px] leading-none">{adoptedCount}</b>
                                    <span className="text-[13px]">desde que te sumaste</span>
                                </div>
                            </div>

                            <section className="flex flex-col gap-3.5">
                                <div className="flex items-center justify-between gap-4">
                                    <h2 className="m-0 font-display font-black text-2xl md:text-[28px]">Publicaciones activas</h2>
                                    {!formOpen && (
                                        <button onClick={() => setCreatingPet(true)} className="h-11 px-[18px] rounded-2xl text-mimo-muted font-bold text-[15px] flex items-center gap-1.5 hover:opacity-90" style={{ background: C.violeta }}>
                                            <Plus size={18} strokeWidth={2} />
                                            Nueva mascota
                                        </button>
                                    )}
                                </div>
                                {creatingPet ? (
                                    <AdoptionPetForm pet={null} token={token} onCancel={() => setCreatingPet(false)} onSaved={() => { setCreatingPet(false); load(); }} />
                                ) : editingPet ? (
                                    <AdoptionPetForm pet={editingPet} token={token} onCancel={() => setEditingPet(null)} onSaved={() => { setEditingPet(null); load(); }} />
                                ) : active.length === 0 ? (
                                    <p className="m-0 p-6 rounded-3xl bg-white text-center text-[15px]">Todavía no publicaste ninguna mascota en adopción.</p>
                                ) : (
                                    active.map((p) => <PetRow key={p.id} pet={p} onEdit={setEditingPet} onMarkAdopted={markAdopted} onDelete={removePet} />)
                                )}
                            </section>

                            {historical.length > 0 && !formOpen && (
                                <section className="flex flex-col gap-3.5">
                                    <h2 className="m-0 font-display font-black text-2xl md:text-[28px]">Historial</h2>
                                    {historical.map((p) => <PetRow key={p.id} pet={p} onEdit={setEditingPet} onMarkAdopted={markAdopted} onDelete={removePet} />)}
                                </section>
                            )}
                        </>
                    )}

                    <LinkedAccounts />
                </div>
            </main>
        </div>
    );
}
