import { useState, useRef } from 'react';
import { Search, LoaderCircle } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || '';

// Buscador de dirección o barrio (mismo endpoint que la app: /api/geo/search).
export default function AddressSearch({ onSelect, placeholder = 'Dirección o barrio' }) {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const timer = useRef(null);

    const onChange = (text) => {
        setQuery(text);
        clearTimeout(timer.current);
        if (text.trim().length < 3) {
            setSuggestions([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        timer.current = setTimeout(async () => {
            try {
                const r = await fetch(`${API}/api/geo/search?q=${encodeURIComponent(text)}`);
                const data = r.ok ? await r.json() : [];
                setSuggestions(Array.isArray(data) ? data : []);
            } catch {
                setSuggestions([]);
            } finally {
                setLoading(false);
            }
        }, 600);
    };

    const choose = (item) => {
        setQuery(item.display_name);
        setSuggestions([]);
        onSelect(parseFloat(item.lat), parseFloat(item.lon), item.display_name);
    };

    return (
        <div className="relative flex-1 min-w-0">
            <label className="flex items-center gap-2.5 h-[52px] px-4 rounded-2xl bg-white border border-mimo-muted focus-within:border-mimo-noche">
                <Search size={18} strokeWidth={2} className="shrink-0" />
                <input
                    value={query}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    aria-label={placeholder}
                    className="flex-1 min-w-0 bg-transparent outline-none text-[15px] placeholder:text-mimo-noche/60"
                />
                {loading && <LoaderCircle size={18} strokeWidth={2} className="shrink-0 animate-spin" />}
            </label>
            {suggestions.length > 0 && (
                <ul className="absolute z-[1100] left-0 right-0 top-[58px] m-0 p-0 list-none bg-white rounded-2xl border border-mimo-muted shadow-card overflow-hidden">
                    {suggestions.map((s, i) => (
                        <li key={String(s.place_id)}>
                            <button
                                type="button"
                                onClick={() => choose(s)}
                                className={`w-full text-left px-4 py-3 text-sm hover:bg-mimo-warm ${i > 0 ? 'border-t border-mimo-muted' : ''}`}
                            >
                                {s.display_name}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
