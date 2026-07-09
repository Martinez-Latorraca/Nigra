import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const FACEBOOK_APP_ID = import.meta.env.VITE_FACEBOOK_APP_ID;

function loadScript(src, id) {
    return new Promise((resolve, reject) => {
        if (document.getElementById(id)) return resolve();
        const s = document.createElement('script');
        s.src = src;
        s.id = id;
        s.async = true;
        s.defer = true;
        s.onload = resolve;
        s.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
        document.body.appendChild(s);
    });
}

const PROVIDERS = [
    { id: 'google', label: 'Google', color: '#EA4335' },
    { id: 'facebook', label: 'Facebook', color: '#1877F2' },
];

export default function LinkedAccounts() {
    const token = useSelector(s => s.user.token);
    const [links, setLinks] = useState([]);
    const [hasPassword, setHasPassword] = useState(false);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(null);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const googleReadyRef = useRef(false);

    const fetchLinks = async () => {
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/links`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('No se pudieron cargar las cuentas.');
            const data = await res.json();
            setLinks(data.links || []);
            setHasPassword(!!data.hasPassword);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { if (token) fetchLinks(); }, [token]);

    // Google Identity Services: carga y espera.
    useEffect(() => {
        if (!GOOGLE_CLIENT_ID) return;
        loadScript('https://accounts.google.com/gsi/client', 'gsi-script')
            .then(() => { googleReadyRef.current = true; })
            .catch(() => {});
    }, []);

    // Facebook SDK
    useEffect(() => {
        if (!FACEBOOK_APP_ID) return;
        window.fbAsyncInit = function () {
            window.FB.init({ appId: FACEBOOK_APP_ID, cookie: true, xfbml: false, version: 'v19.0' });
        };
        loadScript('https://connect.facebook.net/en_US/sdk.js', 'fb-sdk').catch(() => {});
    }, []);

    const linkedSet = new Set(links.map(l => l.provider));

    const callLink = async (provider, body) => {
        setError(''); setNotice('');
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/link/${provider}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'No se pudo vincular la cuenta.');
            setNotice(`${provider} vinculada correctamente.`);
            await fetchLinks();
        } catch (e) {
            setError(e.message);
        } finally {
            setBusy(null);
        }
    };

    const startGoogle = () => {
        if (!googleReadyRef.current || !window.google) {
            setError('Google todavía no cargó, probá en unos segundos.');
            return;
        }
        setBusy('google');
        window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: (resp) => callLink('google', { idToken: resp.credential }),
        });
        window.google.accounts.id.prompt();
    };

    const startFacebook = () => {
        if (!window.FB) {
            setError('Facebook todavía no cargó, probá en unos segundos.');
            return;
        }
        setBusy('facebook');
        window.FB.login(
            (resp) => {
                if (resp.authResponse?.accessToken) {
                    callLink('facebook', { accessToken: resp.authResponse.accessToken });
                } else {
                    setBusy(null);
                }
            },
            { scope: 'public_profile,email', auth_type: 'rerequest' }
        );
    };

    const unlink = async (provider) => {
        setError(''); setNotice('');
        setBusy(provider);
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/link/${provider}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'No se pudo desvincular la cuenta.');
            setNotice(`${provider} desvinculada.`);
            await fetchLinks();
        } catch (e) {
            setError(e.message);
        } finally {
            setBusy(null);
        }
    };

    const startLink = (id) => (id === 'google' ? startGoogle() : startFacebook());

    if (!GOOGLE_CLIENT_ID && !FACEBOOK_APP_ID) return null;

    return (
        <div className="bg-white rounded-[40px] p-8 border border-gray-100">
            <p className="text-[11px] font-bold text-gray-300 uppercase tracking-[0.2em] mb-4">Cuentas vinculadas</p>
            {loading ? (
                <p className="text-xs text-gray-400">Cargando…</p>
            ) : (
                <div className="space-y-3">
                    {PROVIDERS.filter(p => (p.id === 'google' && GOOGLE_CLIENT_ID) || (p.id === 'facebook' && FACEBOOK_APP_ID)).map(p => {
                        const isLinked = linkedSet.has(p.id);
                        const isOnlyMethod = isLinked && !hasPassword && links.length === 1;
                        return (
                            <div key={p.id} className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <span
                                        className="w-2 h-2 rounded-full"
                                        style={{ background: isLinked ? '#22c55e' : '#e5e7eb' }}
                                    />
                                    <span className="text-sm font-semibold text-gray-900">{p.label}</span>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                        {isLinked ? 'Conectada' : 'No conectada'}
                                    </span>
                                </div>
                                {isLinked ? (
                                    <button
                                        onClick={() => unlink(p.id)}
                                        disabled={busy === p.id || isOnlyMethod}
                                        title={isOnlyMethod ? 'Es tu único método de login' : ''}
                                        className="text-[10px] font-bold text-gray-400 hover:text-red-500 uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        Desvincular
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => startLink(p.id)}
                                        disabled={busy === p.id}
                                        className="text-[10px] font-bold text-gray-900 hover:text-pet-primary uppercase tracking-widest disabled:opacity-30"
                                    >
                                        {busy === p.id ? 'Conectando…' : 'Conectar'}
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
            {error && <div className="mt-4 p-3 bg-red-50 text-red-500 rounded-2xl text-xs font-semibold">{error}</div>}
            {notice && <div className="mt-4 p-3 bg-green-50 text-green-600 rounded-2xl text-xs font-semibold">{notice}</div>}
        </div>
    );
}
