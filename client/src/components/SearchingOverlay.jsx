import { useEffect, useState } from 'react';
import { Lightbulb, Heart } from 'lucide-react';
import { MP_DONATION_URL } from '../utils/links';

const API = import.meta.env.VITE_API_URL || '';

// Pantalla de espera mientras se busca o se publica. Los slides (consejos y
// donación) vienen del servidor, igual que en la app (GET /api/ads/loading).
export default function SearchingOverlay({ title, audience }) {
    const [slides, setSlides] = useState([]);

    useEffect(() => {
        let alive = true;
        fetch(`${API}/api/ads/loading`)
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => { if (alive && Array.isArray(d?.slides)) setSlides(d.slides); })
            .catch(() => {});
        return () => { alive = false; };
    }, []);

    const visible = slides
        .filter((s) => s.type === 'consejo' || s.type === 'donacion')
        .filter((s) => !s.audience || s.audience === audience);

    return (
        <div className="fixed inset-0 z-[2000] bg-mimo-warm/95 flex items-center justify-center p-4 overflow-y-auto" role="status" aria-live="polite">
            <div className="w-full max-w-[520px] flex flex-col items-center gap-6 text-center text-mimo-noche">
                <img src="/landing/pin.svg" alt="" width={64} height={79} className="animate-bounce" />
                <p className="m-0 font-display font-black text-3xl">{title}</p>
                {visible.map((s) => (
                    <div key={s.id} className="w-full bg-white rounded-3xl p-5 text-left flex flex-col gap-2.5">
                        <p className="m-0 flex items-center gap-2 font-display font-black text-lg">
                            {s.type === 'donacion'
                                ? <Heart size={20} strokeWidth={2} className="text-mimo-coral shrink-0" />
                                : <Lightbulb size={20} strokeWidth={2} className="text-mimo-sol shrink-0" />}
                            {s.title}
                        </p>
                        {s.text && <p className="m-0 text-[15px] leading-normal">{s.text}</p>}
                        {Array.isArray(s.items) && (
                            <ul className="m-0 pl-5 text-[15px] leading-normal list-disc">
                                {s.items.map((it) => <li key={it}>{it}</li>)}
                            </ul>
                        )}
                        {s.type === 'donacion' && s.button_text && (
                            <a href={MP_DONATION_URL} target="_blank" rel="noopener noreferrer" className="self-start mt-1 h-11 px-5 rounded-2xl bg-mimo-coral text-mimo-muted font-bold text-[15px] flex items-center">
                                {s.button_text}
                            </a>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
