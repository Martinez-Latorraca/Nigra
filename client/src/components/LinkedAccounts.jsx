import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link2 } from 'lucide-react';

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

// Logos oficiales (handoff: "Logos").
function GoogleLogo() {
    return (
        <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
        </svg>
    );
}

function FacebookLogo() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#1877F2" d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z" />
        </svg>
    );
}

const PROVIDERS = [
    { id: 'google', label: 'Google' },
    { id: 'facebook', label: 'Facebook' },
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
    const nameOf = (provider) => (provider === 'google' ? 'Google' : 'Facebook');

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
            setNotice(`${nameOf(provider)} quedó vinculada.`);
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
            setNotice(`${nameOf(provider)} quedó desvinculada.`);
            await fetchLinks();
        } catch (e) {
            setError(e.message);
        } finally {
            setBusy(null);
        }
    };

    const startLink = (id) => (id === 'google' ? startGoogle() : startFacebook());

    if (!GOOGLE_CLIENT_ID && !FACEBOOK_APP_ID) return null;

    const visible = PROVIDERS.filter((p) => (p.id === 'google' && GOOGLE_CLIENT_ID) || (p.id === 'facebook' && FACEBOOK_APP_ID));

    return (
        <section className="bg-white rounded-3xl p-5 md:p-6 flex flex-col">
            <p className="m-0 text-xs font-bold tracking-[.1em] uppercase flex items-center gap-2">
                <Link2 size={16} strokeWidth={2} />
                Cuentas vinculadas
            </p>
            <p className="m-0 mt-2.5 mb-1 text-[15px]">Iniciá sesión más rápido con tus otras cuentas.</p>
            {loading ? (
                <p className="m-0 py-3 text-sm">Cargando…</p>
            ) : (
                visible.map((p, i) => {
                    const isLinked = linkedSet.has(p.id);
                    const isOnlyMethod = isLinked && !hasPassword && links.length === 1;
                    return (
                        <div key={p.id} className={`flex items-center justify-between gap-3 py-3.5 ${i > 0 ? 'border-t border-mimo-muted' : ''}`}>
                            <span className="flex items-center gap-3 min-w-0">
                                <span className="w-9 h-9 rounded-xl bg-mimo-warm flex items-center justify-center shrink-0">
                                    {p.id === 'google' ? <GoogleLogo /> : <FacebookLogo />}
                                </span>
                                <span className="flex flex-col">
                                    <b className="text-[17px]">{p.label}</b>
                                    <span className="text-[13px] flex items-center gap-1.5">
                                        {isLinked && <span className="w-2 h-2 rounded-full bg-mimo-teal" />}
                                        {isLinked ? 'Conectada' : 'No conectada'}
                                    </span>
                                </span>
                            </span>
                            {isLinked ? (
                                <button
                                    onClick={() => unlink(p.id)}
                                    disabled={busy === p.id || isOnlyMethod}
                                    title={isOnlyMethod ? 'Es tu único método para entrar' : ''}
                                    className="h-10 px-4 rounded-xl border-2 border-mimo-noche text-[15px] font-bold hover:bg-mimo-warm disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    Desvincular
                                </button>
                            ) : (
                                <button
                                    onClick={() => startLink(p.id)}
                                    disabled={busy === p.id}
                                    className="h-10 px-5 rounded-xl bg-mimo-noche text-mimo-warm text-[15px] font-bold hover:bg-mimo-nocheAlt disabled:opacity-50"
                                >
                                    {busy === p.id ? 'Conectando…' : 'Conectar'}
                                </button>
                            )}
                        </div>
                    );
                })
            )}
            {error && <p className="m-0 mt-2 text-sm font-bold text-mimo-coral" role="alert">{error}</p>}
            {notice && <p className="m-0 mt-2 text-sm font-bold">{notice}</p>}
        </section>
    );
}
