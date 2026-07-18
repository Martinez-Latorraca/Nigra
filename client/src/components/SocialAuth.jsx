import { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { setCredentials } from '../store/userSlice';

// Whitelist replicada del Login: solo permitimos redirects a paths internos
// conocidos post-OAuth (evita open-redirect).
const ALLOWED_REDIRECTS = new Set([
    '/app', '/reportar', '/buscar', '/profile',
    '/vets', '/vets/register', '/vets/dashboard',
]);

function safeRedirect(raw) {
    if (!raw) return null;
    if (!raw.startsWith('/') || raw.startsWith('//')) return null;
    return ALLOWED_REDIRECTS.has(raw) ? raw : null;
}

// IDs públicos (van al navegador). Se inyectan en build: ver Dockerfile / .env.
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

export default function SocialAuth() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const redirectTo = safeRedirect(searchParams.get('redirect'));
    const googleBtnRef = useRef(null);
    const [error, setError] = useState('');

    const exchange = async (path, body) => {
        setError('');
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}${path}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'No se pudo iniciar sesión');
            dispatch(setCredentials({ user: data.user, token: data.token }));
            navigate(redirectTo || '/app');
        } catch (e) {
            setError(e.message);
        }
    };

    // Google Identity Services
    useEffect(() => {
        if (!GOOGLE_CLIENT_ID) return;
        let cancelled = false;
        loadScript('https://accounts.google.com/gsi/client', 'gsi-script')
            .then(() => {
                if (cancelled || !window.google || !googleBtnRef.current) return;
                window.google.accounts.id.initialize({
                    client_id: GOOGLE_CLIENT_ID,
                    callback: (resp) => exchange('/api/auth/google', { idToken: resp.credential }),
                });
                window.google.accounts.id.renderButton(googleBtnRef.current, {
                    theme: 'outline',
                    size: 'large',
                    shape: 'pill',
                    text: 'continue_with',
                    width: 320,
                });
            })
            .catch(() => setError('No se pudo cargar Google.'));
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Facebook JS SDK
    useEffect(() => {
        if (!FACEBOOK_APP_ID) return;
        window.fbAsyncInit = function () {
            window.FB.init({ appId: FACEBOOK_APP_ID, cookie: true, xfbml: false, version: 'v19.0' });
        };
        loadScript('https://connect.facebook.net/en_US/sdk.js', 'fb-sdk').catch(() => {});
    }, []);

    const handleFacebook = () => {
        if (!window.FB) {
            setError('Facebook todavía no terminó de cargar, probá de nuevo.');
            return;
        }
        window.FB.login(
            (resp) => {
                if (resp.authResponse?.accessToken) {
                    exchange('/api/auth/facebook', { accessToken: resp.authResponse.accessToken });
                }
            },
            { scope: 'public_profile,email' }
        );
    };

    if (!GOOGLE_CLIENT_ID && !FACEBOOK_APP_ID) return null;

    return (
        <div className="mt-8">
            <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-300">o continuá con</span>
                <div className="flex-1 h-px bg-gray-100" />
            </div>

            <div className="flex flex-col items-center gap-3">
                {GOOGLE_CLIENT_ID && <div ref={googleBtnRef} className="flex justify-center" />}
                {FACEBOOK_APP_ID && (
                    <button
                        type="button"
                        onClick={handleFacebook}
                        className="w-full max-w-[320px] flex items-center justify-center gap-3 py-3 rounded-full bg-[#1877F2] text-white font-semibold text-sm hover:bg-[#166FE5] transition-all"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z" />
                        </svg>
                        Continuar con Facebook
                    </button>
                )}
            </div>

            {error && (
                <div className="mt-4 p-3 bg-red-50 text-red-500 rounded-2xl text-xs font-semibold text-center">
                    {error}
                </div>
            )}
        </div>
    );
}
