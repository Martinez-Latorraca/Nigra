import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, PawPrint } from 'lucide-react';
import { C } from '../utils/theme';
import { StatusChip } from '../components/ui';
import {
    ProfileCover, ProfileHeader, ContactList, HoursCard, TextCard, ProfileSkeleton, ProfileNotFound, cardLabel,
} from '../components/ProfilePage';

const API = import.meta.env.VITE_API_URL || '';
const SITE_URL = 'https://mimo.uy';

const SPECIES_LABEL = { dog: 'Perro', cat: 'Gato', other: 'Otro' };
const SIZE_LABEL = { small: 'Chico', medium: 'Mediano', large: 'Grande' };
const AGE_LABEL = { puppy: 'Cachorro', young: 'Joven', adult: 'Adulto', senior: 'Senior' };

function PetMiniCard({ pet }) {
    const photo = pet.photos?.[0];
    const adopted = !!pet.adopted_at;
    const meta = [SPECIES_LABEL[pet.species], SIZE_LABEL[pet.size] || AGE_LABEL[pet.age_group]].filter(Boolean).join(' · ');
    return (
        <Link to={`/adoptions/${pet.id}`} className="group flex flex-col gap-1.5 min-w-0">
            <div className="relative h-[150px] rounded-[18px] bg-mimo-muted overflow-hidden flex items-center justify-center">
                {photo ? (
                    <img src={photo} alt={pet.name || ''} loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                    <PawPrint size={40} strokeWidth={1.5} color={C.noche} opacity={0.35} />
                )}
                <span className="absolute top-2 left-2">
                    <StatusChip color={adopted ? C.noche : C.violeta} small>{adopted ? 'Adoptado' : 'En adopción'}</StatusChip>
                </span>
            </div>
            <b className="text-[15px] truncate group-hover:text-mimo-coral">{pet.name || 'Sin nombre'}</b>
            {meta && <span className="text-[13px]">{meta}</span>}
        </Link>
    );
}

export default function ShelterProfile() {
    const { slug } = useParams();
    const [shelter, setShelter] = useState(null);
    const [pets, setPets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetch(`${API}/api/shelters/${slug}`)
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error('not_found'))))
            .then((data) => {
                setShelter(data);
                // Segundo fetch: adopciones activas del refugio.
                return fetch(`${API}/api/adoption-pets?shelter_id=${data.id}&limit=6`);
            })
            .then((r) => (r?.ok ? r.json() : { pets: [] }))
            .then((d) => setPets(d.pets || []))
            .catch(() => setError('No pudimos encontrar este refugio.'))
            .finally(() => setLoading(false));
    }, [slug]);

    useEffect(() => {
        if (!shelter) return;
        document.title = `${shelter.name} · Mimo`;
        return () => { document.title = 'Mimo - Comunidad de Reencuentro Animal'; };
    }, [shelter]);

    if (loading) return <ProfileSkeleton />;
    if (error || !shelter) {
        return <ProfileNotFound message={error || 'No pudimos encontrar este refugio.'} backTo="/shelters" backLabel="Ver refugios" />;
    }

    const whatsappHref = shelter.whatsapp ? `https://wa.me/${String(shelter.whatsapp).replace(/[^\d]/g, '')}` : null;

    return (
        <div className="flex-1 bg-mimo-warm font-sans text-mimo-noche">
            <ProfileCover coverUrl={shelter.cover_url} backTo="/shelters" backLabel="Refugios" color={C.teal} />

            <main className="relative max-w-[1200px] mx-auto px-4 md:px-6 xl:px-0 -mt-20 pb-20 flex flex-col gap-5">
                {/* Solo ciudad: la dirección de un refugio no se publica (suele ser
                    un domicilio particular con animales). */}
                <ProfileHeader
                    logoUrl={shelter.logo_url}
                    name={shelter.name}
                    color={C.teal}
                    kicker="Refugio"
                    place={shelter.city ? shelter.city.charAt(0).toUpperCase() + shelter.city.slice(1).toLowerCase() : null}
                    whatsappHref={whatsappHref}
                    shareText={`${shelter.name} en Mimo: mascotas en adopción y cómo ayudar.`}
                    shareUrl={`${SITE_URL}/shelters/${shelter.slug}`}
                />

                <div className="flex flex-col lg:flex-row gap-5 items-start">
                    <div className="w-full lg:flex-[1.6] min-w-0 flex flex-col gap-5">
                        {shelter.bio && <TextCard title="Sobre nosotros">{shelter.bio}</TextCard>}

                        <section className="bg-white rounded-3xl p-[22px] flex flex-col gap-3">
                            <div className="flex items-center justify-between gap-4">
                                <p className={cardLabel}>En adopción</p>
                                {pets.length > 0 && (
                                    <Link to={`/adoptions?refugio=${shelter.id}`} className="flex items-center gap-1 text-[13px] font-bold underline hover:text-mimo-coral">
                                        Ver todas <ArrowRight size={14} strokeWidth={2} />
                                    </Link>
                                )}
                            </div>
                            {pets.length === 0 ? (
                                <p className="m-0 py-6 text-center text-[15px]">Este refugio todavía no tiene mascotas publicadas.</p>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                                    {pets.map((p) => <PetMiniCard key={p.id} pet={p} />)}
                                </div>
                            )}
                        </section>

                        <HoursCard hours={shelter.hours} />
                    </div>

                    <div className="w-full lg:flex-1 min-w-0 flex flex-col gap-5">
                        <ContactList entity={shelter} color={C.teal} />
                    </div>
                </div>
            </main>
        </div>
    );
}
