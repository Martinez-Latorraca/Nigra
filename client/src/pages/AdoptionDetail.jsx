import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
    ChevronLeft, ChevronRight, MapPin, MessageCircle, Mail, Share2, Syringe, Scissors, Heart, Check, PawPrint,
} from 'lucide-react';
import { C } from '../utils/theme';
import { adoptionShareMessage } from '../utils/shareText';

const API = import.meta.env.VITE_API_URL || '';
const SITE_URL = 'https://mimo.uy';

const SPECIES_LABEL = { dog: 'Perro', cat: 'Gato', other: 'Otro' };
const SIZE_LABEL = { small: 'Chico', medium: 'Mediano', large: 'Grande' };
const AGE_LABEL = { puppy: 'Cachorro', young: 'Joven', adult: 'Adulto', senior: 'Senior', unknown: 'Sin dato' };
const SEX_LABEL = { male: 'Macho', female: 'Hembra', unknown: 'Sin dato' };

function Trait({ icon: Icon, children }) {
    return (
        <span className="flex items-center gap-1.5 px-3.5 py-[7px] rounded-full bg-white border border-mimo-muted text-sm font-medium">
            {Icon && <Icon size={15} strokeWidth={2} />}
            {children}
        </span>
    );
}

const label = 'm-0 text-xs font-bold tracking-[.08em] uppercase';

export default function AdoptionDetail() {
    const { id } = useParams();
    const [pet, setPet] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activePhoto, setActivePhoto] = useState(0);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        fetch(`${API}/api/adoption-pets/${id}`)
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error('not_found'))))
            .then((data) => setPet(data))
            .catch(() => setError('No pudimos encontrar esta publicación.'))
            .finally(() => setLoading(false));
    }, [id]);

    useEffect(() => {
        if (!pet) return;
        document.title = `${pet.name || 'En adopción'} · Mimo`;
        return () => { document.title = 'Mimo - Comunidad de Reencuentro Animal'; };
    }, [pet]);

    if (loading) {
        return (
            <div className="flex-1 bg-mimo-warm">
                <div className="w-full max-w-[1200px] mx-auto px-4 md:px-6 xl:px-0 pt-7 pb-20 flex flex-col gap-6 animate-pulse" aria-label="Cargando">
                    <div className="h-10 w-36 rounded-full bg-mimo-muted" />
                    <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
                        <div className="w-full lg:flex-[0_0_620px] h-[340px] lg:h-[520px] rounded-[32px] bg-mimo-muted" />
                        <div className="flex-1 flex flex-col gap-4">
                            <div className="h-7 w-28 rounded-full bg-mimo-muted" />
                            <div className="h-12 w-2/3 rounded-2xl bg-mimo-muted" />
                            <div className="h-28 rounded-3xl bg-mimo-muted" />
                            <div className="h-56 rounded-3xl bg-mimo-muted" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !pet) {
        return (
            <div className="flex-1 bg-mimo-warm flex flex-col items-center justify-center p-6 text-center text-mimo-noche">
                <p className="font-display font-black text-7xl m-0">404</p>
                <p className="mt-3 mb-8 text-base">{error}</p>
                <Link to="/adoptions" className="h-12 px-6 rounded-[18px] bg-mimo-noche text-mimo-warm font-bold flex items-center">
                    Ver mascotas en adopción
                </Link>
            </div>
        );
    }

    const photos = Array.isArray(pet.photos) ? pet.photos : [];
    const adopted = !!pet.adopted_at;
    const name = pet.name || 'Sin nombre';
    const whatsappHref = pet.shelter_whatsapp
        ? `https://wa.me/${String(pet.shelter_whatsapp).replace(/[^\d]/g, '')}?text=Hola,%20me%20interesa%20adoptar%20a%20${encodeURIComponent(pet.name || 'esta mascota')}`
        : null;
    const emailHref = pet.shelter_email
        ? `mailto:${pet.shelter_email}?subject=Consulta%20por%20adopci%C3%B3n%20-%20${encodeURIComponent(pet.name || 'mascota')}`
        : null;

    // Difundir una adopción es la forma más directa de que aparezca alguien.
    // navigator.share no existe en la mayoría de las compus: ahí se copia el texto.
    const handleShare = async () => {
        const text = adoptionShareMessage(pet, SITE_URL);
        if (navigator.share) {
            try { await navigator.share({ text }); } catch { /* cancelado */ }
            return;
        }
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch {
            window.prompt('Copiá el texto para compartir:', text);
        }
    };

    const outlineBtn = 'flex-1 h-[52px] px-4 rounded-2xl border-2 border-mimo-noche font-bold text-[15px] flex items-center justify-center gap-2 hover:bg-mimo-warm transition-colors whitespace-nowrap';

    return (
        <div className="flex-1 bg-mimo-warm font-sans text-mimo-noche">
            <main className="w-full max-w-[1200px] mx-auto px-4 md:px-6 xl:px-0 pt-7 pb-20 flex flex-col gap-6">
                <Link
                    to="/adoptions"
                    className="self-start flex items-center gap-1.5 h-10 pl-2.5 pr-4 rounded-full text-sm font-bold text-mimo-muted hover:opacity-90"
                    style={{ background: C.violeta }}
                >
                    <ChevronLeft size={18} strokeWidth={2} />
                    Adopciones
                </Link>

                <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">
                    {/* Fotos */}
                    <div className="w-full lg:flex-[0_0_620px] flex flex-col gap-3.5">
                        <div className="relative h-[340px] sm:h-[460px] lg:h-[520px] rounded-[32px] bg-mimo-muted overflow-hidden flex items-center justify-center">
                            {photos[activePhoto] ? (
                                <img src={photos[activePhoto]} alt={name} className="absolute inset-0 w-full h-full object-cover" />
                            ) : (
                                <PawPrint size={72} strokeWidth={1.5} color={C.noche} opacity={0.35} />
                            )}
                            {adopted && (
                                <div className="absolute inset-0 bg-mimo-noche/50 flex items-center justify-center">
                                    <span className="flex items-center gap-2 h-11 px-5 rounded-full bg-mimo-warm text-mimo-noche font-bold">
                                        <Check size={20} strokeWidth={3} />
                                        Ya fue adoptado
                                    </span>
                                </div>
                            )}
                        </div>
                        {photos.length > 1 && (
                            <div className="flex gap-3 flex-wrap">
                                {photos.map((url, i) => (
                                    <button
                                        key={`${url}-${i}`}
                                        aria-label={`Foto ${i + 1}`}
                                        onClick={() => setActivePhoto(i)}
                                        className="w-24 h-24 rounded-[20px] bg-mimo-muted overflow-hidden box-border"
                                        style={i === activePhoto ? { border: `3px solid ${C.violeta}` } : undefined}
                                    >
                                        <img src={url} alt="" className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Datos */}
                    <div className="w-full flex-1 min-w-0 flex flex-col gap-5">
                        <span
                            className="self-start px-3 py-1 rounded-full text-mimo-muted text-[13px] font-bold"
                            style={{ background: adopted ? C.noche : C.violeta }}
                        >
                            {adopted ? 'Adoptado' : 'En adopción'}
                        </span>
                        <h1 className="m-0 font-display font-black text-4xl md:text-5xl leading-[1.05] break-words">{name}</h1>
                        <div className="flex flex-wrap gap-2">
                            {SPECIES_LABEL[pet.species] && <Trait>{SPECIES_LABEL[pet.species]}</Trait>}
                            {pet.size && <Trait>{SIZE_LABEL[pet.size]}</Trait>}
                            {pet.age_group && pet.age_group !== 'unknown' && <Trait>{AGE_LABEL[pet.age_group]}</Trait>}
                            {pet.sex && pet.sex !== 'unknown' && <Trait>{SEX_LABEL[pet.sex]}</Trait>}
                            {pet.color && <Trait>{pet.color}</Trait>}
                            {pet.vaccinated && <Trait icon={Syringe}>Vacunado</Trait>}
                            {pet.neutered && <Trait icon={Scissors}>Castrado</Trait>}
                        </div>

                        {pet.description && (
                            <section className="bg-white rounded-3xl p-5 flex flex-col gap-2">
                                <p className={label}>Sobre {name}</p>
                                <p className="m-0 text-base leading-[1.55] whitespace-pre-line break-words">{pet.description}</p>
                            </section>
                        )}

                        {/* Final feliz (Adopcion-adoptado.dc.html) */}
                        {adopted && (
                            <section className="rounded-3xl p-5 flex flex-col gap-2.5 text-mimo-muted" style={{ background: C.violeta }}>
                                <p className={`${label} flex items-center gap-1.5`}>
                                    <Heart size={15} strokeWidth={2} />
                                    Final feliz
                                </p>
                                <p className="m-0 font-display font-black text-2xl">{name} ya encontró familia.</p>
                                <p className="m-0 text-[15px] leading-[1.5]">
                                    Compartilo para que más gente conozca al refugio. Hay otras mascotas esperando.
                                </p>
                                <Link
                                    to="/adoptions"
                                    className="mt-1 h-12 rounded-[14px] bg-mimo-warm text-mimo-noche font-bold flex items-center justify-center hover:opacity-90"
                                >
                                    Ver otras en adopción
                                </Link>
                            </section>
                        )}

                        {/* Refugio */}
                        <section className="bg-white rounded-3xl p-5 flex flex-col gap-3.5">
                            <p className={label}>Refugio</p>
                            <Link to={`/shelters/${pet.shelter_slug}`} className="flex items-center gap-3.5 group">
                                {pet.shelter_logo ? (
                                    <img src={pet.shelter_logo} alt="" className="w-[52px] h-[52px] rounded-2xl object-cover bg-mimo-muted shrink-0" />
                                ) : (
                                    <span className="w-[52px] h-[52px] rounded-2xl flex items-center justify-center font-display font-black text-[22px] text-mimo-muted shrink-0" style={{ background: C.teal }}>
                                        {pet.shelter_name?.charAt(0) || '?'}
                                    </span>
                                )}
                                <span className="flex-1 min-w-0 flex flex-col">
                                    <b className="text-[17px] truncate group-hover:text-mimo-coral">{pet.shelter_name}</b>
                                    {pet.shelter_city && (
                                        <span className="flex items-center gap-1 text-sm">
                                            <MapPin size={14} strokeWidth={2} />
                                            {pet.shelter_city}
                                        </span>
                                    )}
                                </span>
                                <ChevronRight size={20} strokeWidth={2} />
                            </Link>

                            {/* Sin "Llamar": el contacto con el refugio va por WhatsApp o
                                mail, que dejan la conversación escrita. */}
                            {!adopted && whatsappHref && (
                                <a
                                    href={whatsappHref}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="h-14 px-5 rounded-2xl bg-mimo-noche hover:bg-mimo-nocheAlt text-mimo-warm font-bold text-[15px] flex items-center justify-center gap-2 transition-colors"
                                >
                                    <MessageCircle size={18} strokeWidth={2} />
                                    Contactar por WhatsApp
                                </a>
                            )}
                            <div className="flex gap-2.5">
                                {!adopted && emailHref && (
                                    <a href={emailHref} className={outlineBtn}>
                                        <Mail size={18} strokeWidth={2} />
                                        Email
                                    </a>
                                )}
                                {/* Va siempre, incluso adoptada, para compartir el final feliz. */}
                                <button onClick={handleShare} className={outlineBtn}>
                                    <Share2 size={18} strokeWidth={2} />
                                    {copied ? 'Texto copiado' : 'Compartir'}
                                </button>
                            </div>
                        </section>
                    </div>
                </div>
            </main>
        </div>
    );
}
