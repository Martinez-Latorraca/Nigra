import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Building2, Map as MapIcon, MapPin, Phone, MessageCircle, Globe, AtSign, Plus, Check, Clock, Star } from 'lucide-react';
import { C } from '../utils/theme';
import { mailtoContact } from '../utils/links';
import { SectionBand } from '../components/ui';

const API = import.meta.env.VITE_API_URL || '';

// Mismo catálogo que el perfil y el directorio (Profile.jsx / Vets.jsx). Lo
// que no está en la lista va en "Otros servicios".
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

const inputCls = 'flex-1 min-w-0 bg-transparent outline-none text-[15px] placeholder:text-mimo-noche/60';

function Field({ label, required, icon, hint, className = '', children }) {
    const Icon = icon;
    return (
        <label className={`flex flex-col gap-1.5 min-w-0 ${className}`}>
            <span className="text-xs font-bold tracking-[.08em] uppercase">
                {label}{required && <span className="text-mimo-coral"> *</span>}
            </span>
            <span className="flex items-center gap-2.5 h-[52px] px-4 rounded-2xl bg-white border border-mimo-muted focus-within:border-mimo-noche">
                {Icon && <Icon size={18} strokeWidth={2} className="shrink-0" />}
                {children}
            </span>
            {hint && <span className="text-[13px]">{hint}</span>}
        </label>
    );
}

function Section({ title, children }) {
    return (
        <section className="bg-white rounded-3xl p-5 md:p-7 flex flex-col gap-5">
            <h2 className="m-0 font-display font-black text-2xl">{title}</h2>
            {children}
        </section>
    );
}

export default function VetRegister() {
    const token = useSelector((s) => s.user?.token);
    const navigate = useNavigate();
    const [checking, setChecking] = useState(true);
    const [form, setForm] = useState({
        name: '', city: '', address: '',
        phone: '', whatsapp: '', website: '', instagram: '',
        bio: '',
    });
    const [services, setServices] = useState(() => new Set());
    const [otherServices, setOtherServices] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Si el user ya tiene una vet, va directo al perfil (no hay doble registro).
    useEffect(() => {
        if (!token) { navigate('/login?redirect=/vets/register'); return; }
        fetch(`${API}/api/vets/me`, { headers: { Authorization: `Bearer ${token}` } })
            .then((r) => {
                if (r.ok) navigate('/profile');
                else setChecking(false);
            })
            .catch(() => setChecking(false));
    }, [token, navigate]);

    const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
    const toggleService = (s) => setServices((prev) => {
        const next = new Set(prev);
        if (next.has(s)) next.delete(s);
        else next.add(s);
        return next;
    });

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            const otros = otherServices.split(',').map((s) => s.trim()).filter(Boolean);
            const body = { ...form, services: [...SERVICE_CATALOG.filter((s) => services.has(s)), ...otros] };
            for (const k of Object.keys(body)) {
                if (body[k] === '' || body[k] === null) delete body[k];
            }
            const res = await fetch(`${API}/api/vets`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'No se pudo registrar.');
            navigate('/profile');
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (checking) {
        return (
            <div className="flex-1 bg-mimo-warm animate-pulse" aria-label="Cargando">
                <div className="h-[240px] bg-mimo-noche rounded-b-[48px]" />
            </div>
        );
    }

    return (
        <div className="flex-1 bg-mimo-warm font-sans text-mimo-noche">
            <SectionBand
                color={C.noche}
                eyebrow="Registro vet"
                title="Registrá tu veterinaria"
                subtitle="Completá los datos que se mostrarán en el directorio público."
            />

            <form onSubmit={submit} className="max-w-[1200px] mx-auto px-4 md:px-6 xl:px-0 pt-9 pb-20 flex flex-col lg:flex-row gap-6 items-start">
                <div className="w-full flex-1 min-w-0 flex flex-col gap-5">
                    <Section title="La clínica">
                        <Field label="Nombre de la veterinaria" required icon={Building2}>
                            <input required className={inputCls} value={form.name} onChange={update('name')} placeholder="Veterinaria Amigo" maxLength={120} />
                        </Field>
                        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1.4fr] gap-4">
                            <Field label="Ciudad" icon={MapIcon}>
                                <input className={inputCls} value={form.city} onChange={update('city')} placeholder="Montevideo" maxLength={80} />
                            </Field>
                            <Field label="Dirección" icon={MapPin}>
                                <input className={inputCls} value={form.address} onChange={update('address')} placeholder="Bv. Artigas 1234" maxLength={200} />
                            </Field>
                        </div>
                    </Section>

                    <Section title="Contacto">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field label="Teléfono" icon={Phone}>
                                <input className={inputCls} value={form.phone} onChange={update('phone')} placeholder="24000000" maxLength={30} />
                            </Field>
                            <Field label="WhatsApp" icon={MessageCircle} hint="Con código de país, sin +.">
                                <input className={inputCls} value={form.whatsapp} onChange={update('whatsapp')} placeholder="59899000000" maxLength={30} />
                            </Field>
                            <Field label="Sitio web" icon={Globe}>
                                <input type="url" className={inputCls} value={form.website} onChange={update('website')} placeholder="https://vetamigo.com" maxLength={200} />
                            </Field>
                            <Field label="Instagram" icon={AtSign}>
                                <input className={inputCls} value={form.instagram} onChange={update('instagram')} placeholder="vetamigo" maxLength={80} />
                            </Field>
                        </div>
                    </Section>

                    <Section title="Sobre ustedes">
                        <label className="flex flex-col gap-1.5">
                            <span className="text-xs font-bold tracking-[.08em] uppercase">Bio</span>
                            <textarea
                                className="w-full min-h-[110px] px-4 py-3.5 rounded-2xl bg-white border border-mimo-muted focus:border-mimo-noche outline-none text-[15px] placeholder:text-mimo-noche/60 resize-y"
                                value={form.bio}
                                onChange={update('bio')}
                                placeholder="Veterinaria familiar en Pocitos, especialistas en emergencias."
                                maxLength={2000}
                            />
                        </label>
                        <div className="flex flex-col gap-2.5">
                            <span className="text-xs font-bold tracking-[.08em] uppercase">Servicios</span>
                            <div className="flex flex-wrap gap-2">
                                {SERVICE_CATALOG.map((s) => {
                                    const active = services.has(s);
                                    return (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => toggleService(s)}
                                            aria-pressed={active}
                                            className={`h-10 px-4 rounded-full text-sm flex items-center gap-1.5 transition-colors ${active ? 'bg-mimo-noche text-mimo-warm font-bold' : 'bg-white border border-mimo-muted hover:border-mimo-noche'}`}
                                        >
                                            {active && <Check size={15} strokeWidth={2.5} />}
                                            {s}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <Field label="Otros servicios" icon={Plus} hint="Separalos con comas.">
                            <input className={inputCls} value={otherServices} onChange={(e) => setOtherServices(e.target.value)} placeholder="Homeopatía, Nutrición, Odontología…" maxLength={300} />
                        </Field>
                    </Section>
                </div>

                <aside className="w-full lg:w-[340px] lg:sticky lg:top-[100px] shrink-0 flex flex-col gap-4">
                    <div className="bg-white rounded-3xl p-5 flex flex-col gap-3.5">
                        <button
                            type="submit"
                            disabled={saving || !form.name.trim()}
                            className="h-14 rounded-2xl bg-mimo-noche text-mimo-warm font-bold text-[15px] hover:bg-mimo-nocheAlt disabled:opacity-50"
                        >
                            {saving ? 'Registrando…' : 'Registrar veterinaria'}
                        </button>
                        {error && <p className="m-0 text-sm font-bold text-mimo-coral" role="alert">{error}</p>}
                        <p className="m-0 flex items-start gap-2 text-sm leading-snug">
                            <Clock size={16} strokeWidth={2} className="shrink-0 mt-0.5" />
                            Después de crear queda pendiente de aprobación por un admin antes de aparecer en el directorio.
                        </p>
                    </div>
                    <a href={mailtoContact('Quiero ser Socio Mimo')} className="rounded-3xl p-5 flex flex-col gap-1.5 text-mimo-muted hover:opacity-95" style={{ background: C.coral }}>
                        <b className="font-display font-black text-xl flex items-center gap-2">
                            <Star size={18} strokeWidth={2} fill="currentColor" />
                            ¿Querés destacarte?
                        </b>
                        <span className="text-sm leading-snug">Con Socio Mimo aparecés primero en el directorio y en Explorar. Escribinos.</span>
                    </a>
                </aside>
            </form>
        </div>
    );
}
