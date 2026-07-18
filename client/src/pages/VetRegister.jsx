import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

const API = import.meta.env.VITE_API_URL || '';

const SERVICE_SUGGESTIONS = [
    'Consulta general', 'Vacunación', 'Cirugía', 'Emergencias 24h',
    'Peluquería', 'Baño', 'Guardería', 'Radiografías',
    'Análisis clínicos', 'Odontología', 'Adopciones',
];

function Field({ label, hint, required, children }) {
    return (
        <div>
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-gray-500">
                {label}
                {required ? <span className="text-[#FF5C6C]"> *</span> : null}
            </label>
            {children}
            {hint ? <div className="mt-1.5 text-[11px] text-gray-400">{hint}</div> : null}
        </div>
    );
}

const inputCls =
    'w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 placeholder:text-gray-300 focus:border-gray-900 focus:outline-none focus:ring-0';

export default function VetRegister() {
    const token = useSelector((s) => s.user?.token);
    const user = useSelector((s) => s.user?.data);
    const navigate = useNavigate();
    const [checking, setChecking] = useState(true);
    const [form, setForm] = useState({
        name: '', city: '', address: '',
        email: user?.email || '',
        phone: '', whatsapp: '', website: '', instagram: '',
        bio: '',
        services: [],
    });
    const [serviceInput, setServiceInput] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Al montar, chequeamos si el user YA tiene una vet — si sí, mandamos al
    // dashboard directo (no permitir doble registro).
    useEffect(() => {
        if (!token) { navigate('/login'); return; }
        fetch(`${API}/api/vets/me`, { headers: { Authorization: `Bearer ${token}` } })
            .then((r) => {
                if (r.ok) navigate('/vets/dashboard');
                else setChecking(false);
            })
            .catch(() => setChecking(false));
    }, [token, navigate]);

    const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const addService = (name) => {
        const clean = String(name).trim();
        if (!clean) return;
        setForm((f) => (f.services.includes(clean) ? f : { ...f, services: [...f.services, clean] }));
        setServiceInput('');
    };
    const removeService = (name) =>
        setForm((f) => ({ ...f, services: f.services.filter((s) => s !== name) }));

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            const body = { ...form };
            for (const k of Object.keys(body)) {
                if (body[k] === '' || body[k] === null) delete body[k];
            }
            const res = await fetch(`${API}/api/vets`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'No se pudo registrar.');
            navigate('/vets/dashboard');
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (checking) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#F5F5F7]">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 animate-pulse">
                    Verificando
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F5F5F7] pb-20 font-sans text-gray-900">
            <div className="mx-auto w-full max-w-2xl px-6 pt-16">
                <Link to="/vets" className="text-xs font-semibold text-gray-400 hover:text-black">
                    ← Volver al directorio
                </Link>
                <span className="mt-4 block text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
                    Registro Vet
                </span>
                <h1 className="mt-2 text-4xl font-semibold tracking-tighter text-black md:text-5xl">
                    Registrá tu veterinaria.
                </h1>
                <p className="mt-4 max-w-lg text-sm leading-relaxed text-gray-500">
                    Los datos institucionales son independientes de tu cuenta personal — el mail que
                    pongas acá se muestra público como contacto de la vet, no reemplaza tu login.
                    Después de crearla, un admin la aprueba para que aparezca en el directorio.
                </p>

                <form
                    onSubmit={submit}
                    className="mt-10 space-y-6 rounded-[32px] border border-gray-100 bg-white p-8"
                >
                    <Field label="Nombre de la veterinaria" required>
                        <input
                            required
                            className={inputCls}
                            value={form.name}
                            onChange={update('name')}
                            placeholder="Veterinaria Amigo"
                            maxLength={120}
                        />
                    </Field>

                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <Field label="Ciudad">
                            <input
                                className={inputCls}
                                value={form.city}
                                onChange={update('city')}
                                placeholder="Montevideo"
                                maxLength={80}
                            />
                        </Field>
                        <Field label="Dirección">
                            <input
                                className={inputCls}
                                value={form.address}
                                onChange={update('address')}
                                placeholder="Bv. Artigas 1234"
                                maxLength={200}
                            />
                        </Field>
                    </div>

                    <Field
                        label="Email de contacto"
                        hint="Este es el mail público que verán los users. No es tu login."
                    >
                        <input
                            type="email"
                            className={inputCls}
                            value={form.email}
                            onChange={update('email')}
                            placeholder="contacto@vetamigo.com"
                            maxLength={150}
                        />
                    </Field>

                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <Field label="Teléfono">
                            <input
                                className={inputCls}
                                value={form.phone}
                                onChange={update('phone')}
                                placeholder="24000000"
                                maxLength={30}
                            />
                        </Field>
                        <Field label="WhatsApp" hint="Con código de país, sin +.">
                            <input
                                className={inputCls}
                                value={form.whatsapp}
                                onChange={update('whatsapp')}
                                placeholder="59899000000"
                                maxLength={30}
                            />
                        </Field>
                    </div>

                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <Field label="Sitio web">
                            <input
                                type="url"
                                className={inputCls}
                                value={form.website}
                                onChange={update('website')}
                                placeholder="https://vetamigo.com"
                                maxLength={200}
                            />
                        </Field>
                        <Field label="Instagram" hint="Sin @">
                            <input
                                className={inputCls}
                                value={form.instagram}
                                onChange={update('instagram')}
                                placeholder="vetamigo"
                                maxLength={80}
                            />
                        </Field>
                    </div>

                    <Field label="Bio" hint="Contá quiénes son y qué hacen. Máx 2000 caracteres.">
                        <textarea
                            className={`${inputCls} min-h-[120px] resize-y`}
                            value={form.bio}
                            onChange={update('bio')}
                            placeholder="Veterinaria familiar en Pocitos, especialistas en emergencias y adopciones responsables."
                            maxLength={2000}
                        />
                    </Field>

                    <Field label="Servicios" hint="Presioná Enter o el + para agregar. Máx 30.">
                        <div className="flex flex-wrap gap-2">
                            {form.services.map((s) => (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => removeService(s)}
                                    className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 transition-all hover:bg-gray-200"
                                >
                                    {s}
                                    <span className="text-gray-400">×</span>
                                </button>
                            ))}
                        </div>
                        <div className="mt-3 flex gap-2">
                            <input
                                className={inputCls}
                                value={serviceInput}
                                onChange={(e) => setServiceInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') { e.preventDefault(); addService(serviceInput); }
                                }}
                                placeholder="Agregar servicio"
                                maxLength={80}
                            />
                            <button
                                type="button"
                                onClick={() => addService(serviceInput)}
                                className="rounded-2xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-200"
                            >
                                Agregar
                            </button>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {SERVICE_SUGGESTIONS.filter((s) => !form.services.includes(s)).slice(0, 6).map((s) => (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => addService(s)}
                                    className="rounded-full border border-dashed border-gray-200 px-3 py-1 text-[11px] font-semibold text-gray-400 hover:border-gray-400 hover:text-gray-600"
                                >
                                    + {s}
                                </button>
                            ))}
                        </div>
                    </Field>

                    {error ? (
                        <div className="rounded-2xl bg-red-50 p-3 text-center text-xs font-semibold text-red-500">
                            {error}
                        </div>
                    ) : null}

                    <button
                        type="submit"
                        disabled={saving || !form.name.trim()}
                        className="w-full rounded-full bg-black py-4 text-sm font-semibold text-white transition-all hover:bg-gray-800 disabled:opacity-40"
                    >
                        {saving ? 'Registrando…' : 'Registrar veterinaria'}
                    </button>
                    <div className="text-center text-[11px] text-gray-400">
                        Después de crear queda pendiente de aprobación por un admin antes de aparecer
                        en el directorio público.
                    </div>
                </form>
            </div>
        </div>
    );
}
