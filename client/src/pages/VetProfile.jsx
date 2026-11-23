import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { trackContactClick } from '../utils/vetTracking';
import { tierOf } from '../utils/sponsorTiers';
import { C } from '../utils/theme';
import { TierChip } from '../components/ui';
import {
    ProfileCover, ProfileHeader, ContactList, HoursCard, TextCard, ProfileSkeleton, ProfileNotFound, cardLabel,
} from '../components/ProfilePage';

const API = import.meta.env.VITE_API_URL || '';
const SITE_URL = 'https://mimo.uy';

export default function VetProfile() {
    const { slug } = useParams();
    const [vet, setVet] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetch(`${API}/api/vets/${slug}`)
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error('not_found'))))
            .then((data) => setVet(data))
            .catch(() => setError('No pudimos encontrar esta veterinaria.'))
            .finally(() => setLoading(false));
    }, [slug]);

    useEffect(() => {
        if (!vet) return;
        document.title = `${vet.name} · Mimo`;
        return () => { document.title = 'Mimo - Comunidad de Reencuentro Animal'; };
    }, [vet]);

    if (loading) return <ProfileSkeleton />;
    if (error || !vet) {
        return <ProfileNotFound message={error || 'No pudimos encontrar esta veterinaria.'} backTo="/vets" backLabel="Ver veterinarias" />;
    }

    const whatsappHref = vet.whatsapp ? `https://wa.me/${String(vet.whatsapp).replace(/[^\d]/g, '')}` : null;
    const color = tierOf(vet)?.color || C.noche;
    const onContact = () => trackContactClick(vet.id);
    const hasHours = vet.hours && Object.keys(vet.hours).length > 0;

    return (
        <div className="flex-1 bg-mimo-warm font-sans text-mimo-noche">
            <ProfileCover coverUrl={vet.cover_url} backTo="/vets" backLabel="Veterinarias" color={C.noche} />

            <main className="relative max-w-[1200px] mx-auto px-4 md:px-6 xl:px-0 -mt-20 pb-20 flex flex-col gap-5">
                {/* Las vets sí publican dirección: es un comercio. */}
                <ProfileHeader
                    logoUrl={vet.logo_url}
                    name={vet.name}
                    color={color}
                    kicker="Veterinaria"
                    badge={<TierChip vet={vet} />}
                    place={[vet.address, vet.city].filter(Boolean).join(' · ') || null}
                    whatsappHref={whatsappHref}
                    onContact={onContact}
                    shareText={`${vet.name} en Mimo.`}
                    shareUrl={`${SITE_URL}/vets/${vet.slug}`}
                />

                <div className="flex flex-col lg:flex-row gap-5 items-start">
                    <div className="w-full lg:flex-[1.6] min-w-0 flex flex-col gap-5">
                        {vet.bio && <TextCard title="Sobre la clínica">{vet.bio}</TextCard>}

                        {(vet.services?.length > 0 || hasHours) && (
                            <div className="flex flex-col md:flex-row gap-5 items-start">
                                {vet.services?.length > 0 && (
                                    <section className="w-full md:flex-1 bg-white rounded-3xl p-[22px] flex flex-col gap-3">
                                        <p className={cardLabel}>Servicios</p>
                                        <div className="flex flex-wrap gap-2">
                                            {vet.services.map((s) => (
                                                <span key={s} className="px-3.5 py-[7px] rounded-full bg-mimo-warm text-sm">{s}</span>
                                            ))}
                                        </div>
                                    </section>
                                )}
                                {hasHours && <div className="w-full md:flex-1"><HoursCard hours={vet.hours} /></div>}
                            </div>
                        )}
                    </div>

                    <div className="w-full lg:flex-1 min-w-0 flex flex-col gap-5">
                        <ContactList entity={vet} color={C.noche} onClick={onContact} />
                    </div>
                </div>
            </main>
        </div>
    );
}
