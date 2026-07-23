import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { clearCredentials } from '../store/userSlice';
import MimoLogo from './MimoLogo';
import LinkedAccounts from './LinkedAccounts';

const API = import.meta.env.VITE_API_URL || '';

const SPECIES_LABEL = { dog: 'Perro', cat: 'Gato', other: 'Otro' };
const SIZE_LABEL = { small: 'Chico', medium: 'Mediano', large: 'Grande' };
const AGE_LABEL = { puppy: 'Cachorro', young: 'Joven', adult: 'Adulto', senior: 'Senior', unknown: '—' };
const MAX_PHOTOS = 6;

const inputCls =
    'w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 placeholder:text-gray-300 focus:border-gray-900 focus:outline-none focus:ring-0';

function Field({ label, hint, required, children }) {
    return (
        <div>
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-gray-500">
                {label}{required ? <span className="text-mimo-coral"> *</span> : null}
            </label>
            {children}
            {hint ? <div className="mt-1.5 text-[11px] text-gray-400">{hint}</div> : null}
        </div>
    );
}

// Form para crear o editar una mascota en adopción. Modo controlado por `pet`
// (null = crear, objeto = editar).
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
    const [photos, setPhotos] = useState(() => Array.isArray(pet?.photos) ? pet.photos : []);
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const editing = !!pet;

    const upd = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

    const uploadPhoto = async (file) => {
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
            setPhotos((p) => [...p, data.url]);
        } catch (err) {
            setError(err.message);
        } finally {
            setUploading(false);
        }
    };

    const removePhoto = (url) => setPhotos((p) => p.filter((x) => x !== url));

    const submit = async (e) => {
        e.preventDefault();
        if (photos.length === 0) return setError('Subí al menos una foto.');
        setSaving(true);
        setError('');
        try {
            const body = { ...form, photos };
            const url = editing ? `${API}/api/adoption-pets/${pet.id}` : `${API}/api/adoption-pets`;
            const method = editing ? 'PATCH' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(body),
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
        <form onSubmit={submit} className="space-y-6 rounded-[32px] border border-gray-100 bg-white p-8">
            <div className="flex items-center justify-between">
                <h3 className="font-display font-black text-2xl text-mimo-noche">
                    {editing ? 'Editar publicación' : 'Nueva publicación'}
                </h3>
                <button type="button" onClick={onCancel} className="text-xs font-semibold text-gray-400 hover:text-black">
                    Cancelar
                </button>
            </div>

            <Field label="Fotos" required hint={`Hasta ${MAX_PHOTOS}. La primera es la principal.`}>
                <div className="flex flex-wrap gap-3">
                    {photos.map((url) => (
                        <div key={url} className="relative h-24 w-24 rounded-2xl overflow-hidden group">
                            <img src={url} alt="" className="h-full w-full object-cover" />
                            <button
                                type="button"
                                onClick={() => removePhoto(url)}
                                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity"
                            >
                                Quitar
                            </button>
                        </div>
                    ))}
                    {photos.length < MAX_PHOTOS ? (
                        <label className="h-24 w-24 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center text-xs font-semibold text-gray-400 hover:border-gray-400 hover:text-gray-600 cursor-pointer">
                            {uploading ? '…' : '+ Foto'}
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])}
                                disabled={uploading}
                            />
                        </label>
                    ) : null}
                </div>
            </Field>

            <Field label="Nombre">
                <input className={inputCls} value={form.name} onChange={upd('name')} placeholder="Firulais" maxLength={60} />
            </Field>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <Field label="Especie" required>
                    <select className={inputCls} value={form.species} onChange={upd('species')}>
                        <option value="dog">Perro</option>
                        <option value="cat">Gato</option>
                        <option value="other">Otro</option>
                    </select>
                </Field>
                <Field label="Sexo">
                    <select className={inputCls} value={form.sex} onChange={upd('sex')}>
                        <option value="unknown">Sin dato</option>
                        <option value="male">Macho</option>
                        <option value="female">Hembra</option>
                    </select>
                </Field>
                <Field label="Edad">
                    <select className={inputCls} value={form.age_group} onChange={upd('age_group')}>
                        <option value="unknown">Sin dato</option>
                        <option value="puppy">Cachorro</option>
                        <option value="young">Joven</option>
                        <option value="adult">Adulto</option>
                        <option value="senior">Senior</option>
                    </select>
                </Field>
                <Field label="Tamaño">
                    <select className={inputCls} value={form.size} onChange={upd('size')}>
                        <option value="small">Chico</option>
                        <option value="medium">Mediano</option>
                        <option value="large">Grande</option>
                    </select>
                </Field>
            </div>

            <Field label="Color">
                <input className={inputCls} value={form.color} onChange={upd('color')} placeholder="Marrón, blanco…" maxLength={30} />
            </Field>

            <Field label="Descripción" hint="Contá su historia, personalidad, necesidades. Máx 2000.">
                <textarea className={`${inputCls} min-h-[120px] resize-y`} value={form.description} onChange={upd('description')} maxLength={2000} />
            </Field>

            <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <input type="checkbox" checked={form.vaccinated} onChange={upd('vaccinated')} className="h-4 w-4" />
                    Vacunado
                </label>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <input type="checkbox" checked={form.neutered} onChange={upd('neutered')} className="h-4 w-4" />
                    Castrado
                </label>
            </div>

            {error ? (
                <div className="rounded-2xl bg-red-50 p-3 text-center text-xs font-semibold text-red-500">{error}</div>
            ) : null}

            <button
                type="submit"
                disabled={saving || uploading}
                className="w-full rounded-full bg-mimo-noche py-4 text-sm font-display font-extrabold uppercase tracking-widest text-white transition-all hover:opacity-90 disabled:opacity-40"
            >
                {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Publicar'}
            </button>
        </form>
    );
}

function PetRow({ pet, onMarkAdopted, onDelete, onEdit }) {
    const adopted = !!pet.adopted_at;
    return (
        <div className={`flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 ${adopted ? 'opacity-60' : ''}`}>
            {pet.photos?.[0] ? (
                <img src={pet.photos[0]} alt="" className="h-16 w-16 rounded-xl object-cover" />
            ) : (
                <div className="h-16 w-16 rounded-xl bg-gray-100 flex items-center justify-center text-2xl">🐾</div>
            )}
            <div className="flex-1 min-w-0">
                <div className="font-display font-black text-base text-mimo-noche truncate">{pet.name || 'Sin nombre'}</div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                    {SPECIES_LABEL[pet.species]}
                    {pet.size ? ` · ${SIZE_LABEL[pet.size]}` : ''}
                    {pet.age_group && pet.age_group !== 'unknown' ? ` · ${AGE_LABEL[pet.age_group]}` : ''}
                    {adopted ? ' · ADOPTADO' : ''}
                </div>
            </div>
            <div className="flex gap-2">
                {!adopted ? (
                    <>
                        <button onClick={() => onEdit(pet)} className="text-xs font-semibold text-gray-500 hover:text-gray-900 px-3 py-1.5 rounded-full hover:bg-gray-100">
                            Editar
                        </button>
                        <button onClick={() => onMarkAdopted(pet.id)} className="text-xs font-semibold text-white bg-mimo-noche hover:opacity-90 px-3 py-1.5 rounded-full">
                            ✓ Adoptado
                        </button>
                    </>
                ) : null}
                <button onClick={() => onDelete(pet.id)} className="text-xs font-semibold text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-full">
                    Borrar
                </button>
            </div>
        </div>
    );
}

// Form muy compacto para editar el perfil del refugio.
function ShelterEditForm({ shelter, onSaved, token }) {
    const [form, setForm] = useState(() => ({
        name: shelter.name || '',
        city: shelter.city || '',
        address: shelter.address || '',
        phone: shelter.phone || '',
        whatsapp: shelter.whatsapp || '',
        website: shelter.website || '',
        instagram: shelter.instagram || '',
        email: shelter.email || '',
        bio: shelter.bio || '',
    }));
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState('');
    const upd = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

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
            setMsg('✓ Guardado');
        } catch (err) {
            setMsg(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={submit} className="space-y-4 rounded-[32px] border border-gray-100 bg-white p-8">
            <Field label="Nombre" required>
                <input className={inputCls} value={form.name} onChange={upd('name')} maxLength={120} required />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Ciudad"><input className={inputCls} value={form.city} onChange={upd('city')} maxLength={80} /></Field>
                <Field label="Dirección"><input className={inputCls} value={form.address} onChange={upd('address')} maxLength={200} /></Field>
                <Field label="Teléfono"><input className={inputCls} value={form.phone} onChange={upd('phone')} maxLength={30} /></Field>
                <Field label="WhatsApp"><input className={inputCls} value={form.whatsapp} onChange={upd('whatsapp')} maxLength={30} /></Field>
                <Field label="Email"><input type="email" className={inputCls} value={form.email} onChange={upd('email')} maxLength={150} /></Field>
                <Field label="Sitio web"><input type="url" className={inputCls} value={form.website} onChange={upd('website')} maxLength={200} /></Field>
            </div>
            <Field label="Instagram" hint="Sin @">
                <input className={inputCls} value={form.instagram} onChange={upd('instagram')} maxLength={80} />
            </Field>
            <Field label="Bio">
                <textarea className={`${inputCls} min-h-[100px] resize-y`} value={form.bio} onChange={upd('bio')} maxLength={2000} />
            </Field>
            <button
                type="submit"
                disabled={saving}
                className="w-full rounded-full bg-mimo-noche py-3 text-sm font-display font-extrabold uppercase tracking-widest text-white hover:opacity-90 disabled:opacity-40"
            >
                {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
            {msg ? <p className="text-center text-xs font-semibold text-gray-500">{msg}</p> : null}
        </form>
    );
}

export default function ShelterPanel() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const token = useSelector((s) => s.user?.token);
    const user = useSelector((s) => s.user?.data);
    const [shelter, setShelter] = useState(null);
    const [pets, setPets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingShelter, setEditingShelter] = useState(false);
    const [creatingPet, setCreatingPet] = useState(false);
    const [editingPet, setEditingPet] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
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
        if (res.ok) load();
    };

    const markAdopted = async (id) => {
        await fetch(`${API}/api/adoption-pets/${id}/adopted`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
        load();
    };
    const removePet = async (id) => {
        if (!confirm('¿Borrar esta publicación?')) return;
        await fetch(`${API}/api/adoption-pets/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
        load();
    };

    if (loading || !shelter) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-mimo-muted">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-mimo-quiet animate-pulse">Cargando</div>
            </div>
        );
    }

    const active = pets.filter((p) => !p.adopted_at && !p.deleted_at);
    const historical = pets.filter((p) => p.adopted_at || p.deleted_at);
    const approved = shelter.approved;

    return (
        <div className="min-h-screen bg-mimo-muted pb-20 font-sans text-mimo-noche">
            <div className="mx-auto w-full max-w-4xl px-6 pt-10">
                <div className="flex items-center justify-between mb-6">
                    <MimoLogo variant="wordmarkText" size={80} />
                    <Link to={`/shelters/${shelter.slug}`} className="text-xs font-semibold text-gray-400 hover:text-black">
                        Ver perfil público →
                    </Link>
                </div>

                {/* Hero */}
                <div className="rounded-[32px] border border-gray-100 bg-white p-6 flex items-center gap-4 mb-6">
                    <label className="relative h-20 w-20 rounded-2xl overflow-hidden bg-gray-100 flex items-center justify-center cursor-pointer group">
                        {shelter.logo_url ? (
                            <img src={shelter.logo_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                            <span className="text-3xl font-bold text-gray-400">{shelter.name.charAt(0)}</span>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition-opacity">
                            Cambiar
                        </div>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadImage('logo', e.target.files[0])} />
                    </label>
                    <div className="flex-1">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Refugio</div>
                        <div className="mt-1 flex items-center gap-2 flex-wrap">
                            <h1 className="font-display font-black text-3xl tracking-tight text-mimo-noche">{shelter.name}</h1>
                            {!approved ? (
                                <span className="rounded-full bg-yellow-100 text-yellow-800 px-3 py-1 text-[9px] font-bold uppercase tracking-widest">
                                    Pendiente
                                </span>
                            ) : null}
                        </div>
                        {shelter.city ? <p className="text-sm font-medium text-gray-500">📍 {shelter.city}</p> : null}
                    </div>
                </div>

                {!approved ? (
                    <div className="mb-6 rounded-2xl bg-yellow-50 border border-yellow-200 p-4 text-sm text-yellow-800">
                        Tu refugio está pendiente de aprobación por un admin. Podés completar tus datos y agregar publicaciones — se van a mostrar en el directorio público apenas te aprueben.
                    </div>
                ) : null}

                {/* Edit toggle */}
                <div className="mb-6">
                    <button
                        onClick={() => setEditingShelter(!editingShelter)}
                        className="w-full rounded-full bg-mimo-warm border border-gray-100 py-3 text-sm font-display font-extrabold uppercase tracking-widest text-mimo-noche hover:bg-mimo-muted"
                    >
                        {editingShelter ? 'Ocultar edición del refugio' : 'Editar datos del refugio'}
                    </button>
                    {editingShelter ? (
                        <div className="mt-4">
                            <ShelterEditForm
                                shelter={shelter}
                                token={token}
                                onSaved={(s) => { setShelter(s); setEditingShelter(false); }}
                            />
                        </div>
                    ) : null}
                </div>

                {/* Adopciones */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-display font-black text-2xl text-mimo-noche">Publicaciones activas</h2>
                        {!creatingPet && !editingPet ? (
                            <button
                                onClick={() => setCreatingPet(true)}
                                className="rounded-full bg-mimo-coral px-5 py-2 text-xs font-display font-extrabold uppercase tracking-widest text-white hover:bg-mimo-coralDark"
                            >
                                + Nueva
                            </button>
                        ) : null}
                    </div>

                    {creatingPet ? (
                        <AdoptionPetForm
                            pet={null}
                            token={token}
                            onCancel={() => setCreatingPet(false)}
                            onSaved={() => { setCreatingPet(false); load(); }}
                        />
                    ) : editingPet ? (
                        <AdoptionPetForm
                            pet={editingPet}
                            token={token}
                            onCancel={() => setEditingPet(null)}
                            onSaved={() => { setEditingPet(null); load(); }}
                        />
                    ) : (
                        <>
                            {active.length === 0 ? (
                                <p className="text-sm text-gray-500 text-center py-8">Todavía no publicaste ninguna mascota en adopción.</p>
                            ) : (
                                <div className="space-y-3">
                                    {active.map((p) => (
                                        <PetRow key={p.id} pet={p} onEdit={setEditingPet} onMarkAdopted={markAdopted} onDelete={removePet} />
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {historical.length > 0 && !creatingPet && !editingPet ? (
                    <div className="mb-6">
                        <h2 className="font-display font-black text-lg text-gray-500 mb-3">Historial</h2>
                        <div className="space-y-3">
                            {historical.map((p) => (
                                <PetRow key={p.id} pet={p} onEdit={setEditingPet} onMarkAdopted={markAdopted} onDelete={removePet} />
                            ))}
                        </div>
                    </div>
                ) : null}

                <LinkedAccounts />

                <div className="mt-6 space-y-2">
                    <button
                        onClick={handleLogout}
                        className="w-full rounded-full border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                        Cerrar sesión
                    </button>
                </div>
            </div>
        </div>
    );
}
