import { useState } from 'react';
import { MP_DONATION_URL, INSTAGRAM_URL, CONTACT_EMAIL } from '../utils/links';

// Landing de mimo.uy (handoff de diseño: "Landing mimo.uy · escritorio").
// La app todavía no está en las tiendas: el objetivo de la página es sumar
// gente a la lista de espera (POST /api/waitlist, solo email).
// Los fondos de red de pins y el pin de marca están en /public/landing.

const API = import.meta.env.VITE_API_URL || '';

const C = {
  coral: '#FF5C6C',
  teal: '#3ECFB2',
  sol: '#FFB830',
  violeta: '#9B6DFF',
  noche: '#1A1A2E',
  noche2: '#262642',
  linea: '#33334F',
  crema: '#FFF6F0',
  arena: '#F0EBE8',
  lavanda: '#B4B4C6',
};

// Íconos Lucide (trazo) usados en el diseño.
const ICONS = {
  mapPin: <><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" /><circle cx="12" cy="10" r="3" /></>,
  mail: <><path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7" /><rect x="2" y="4" width="20" height="16" rx="2" /></>,
  smartphone: <><rect width="14" height="20" x="5" y="2" rx="2" ry="2" /><path d="M12 18h.01" /></>,
  play: <path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z" />,
  scan: <><path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" /><path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" /><circle cx="12" cy="12" r="3" /><path d="m16 16-1.9-1.9" /></>,
  handshake: <path d="M19.414 14.414C21 12.828 22 11.5 22 9.5a5.5 5.5 0 0 0-9.591-3.676.6.6 0 0 1-.818.001A5.5 5.5 0 0 0 2 9.5c0 2.3 1.5 4 3 5.5l5.535 5.362a2 2 0 0 0 2.879.052 2.12 2.12 0 0 0-.004-3 2.124 2.124 0 1 0 3-3 2.124 2.124 0 0 0 3.004 0 2 2 0 0 0 0-2.828l-1.881-1.882a2.41 2.41 0 0 0-3.409 0l-1.71 1.71a2 2 0 0 1-2.828 0 2 2 0 0 1 0-2.828l2.823-2.762" />,
  camera: <><path d="M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z" /><circle cx="12" cy="13" r="3" /></>,
  bell: <><path d="M10.268 21a2 2 0 0 0 3.464 0" /><path d="M22 8c0-2.3-.8-4.3-2-6" /><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" /><path d="M4 2C2.8 3.7 2 5.7 2 8" /></>,
  map: <><path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z" /><path d="M15 5.764v15" /><path d="M9 3.236v15" /></>,
  heart: <path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5" />,
  houseHeart: <><path d="M8.62 13.8A2.25 2.25 0 1 1 12 10.836a2.25 2.25 0 1 1 3.38 2.966l-2.626 2.856a.998.998 0 0 1-1.507 0z" /><path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></>,
  stethoscope: <><path d="M11 2v2" /><path d="M5 2v2" /><path d="M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1" /><path d="M8 15a6 6 0 0 0 12 0v-3" /><circle cx="20" cy="10" r="2" /></>,
  check: <path d="M20 6 9 17l-5-5" />,
  star: <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" />,
  arrowRight: <><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></>,
  coffee: <><path d="M10 2v2" /><path d="M14 2v2" /><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1" /><path d="M6 2v2" /></>,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  atSign: <><circle cx="12" cy="12" r="4" /><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8" /></>,
};

function Icon({ name, size = 24, color = 'currentColor', fill = 'none', className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      {ICONS[name]}
    </svg>
  );
}

// Logo: pin + "mimo", con solo el punto de la i en Coral.
function Logo({ size = 34, color = C.noche }) {
  return (
    <span className="flex items-center gap-2.5" aria-label="mimo">
      <img src="/landing/pin.svg" alt="" width={size * 1.18} height={size * 1.45} />
      <span
        className="font-display font-extrabold leading-none"
        style={{ fontSize: size, color }}
        aria-hidden="true"
      >
        m
        <span
          style={{
            background: `linear-gradient(to bottom, ${C.coral} 0, ${C.coral} 0.47em, ${color} 0.47em)`,
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          i
        </span>
        mo
      </span>
    </span>
  );
}

function Eyebrow({ color, children }) {
  return (
    <p className="m-0 text-sm font-bold uppercase" style={{ color, letterSpacing: '.12em' }}>
      {children}
    </p>
  );
}

function SectionTitle({ eyebrow, color, title, sub }) {
  return (
    <div className="flex flex-col gap-3">
      <Eyebrow color={color}>{eyebrow}</Eyebrow>
      <h2 className="m-0 font-display font-black text-[36px] md:text-[52px] leading-[1.05] max-w-[820px]">{title}</h2>
      {sub ? <p className="m-0 text-[17px] md:text-[19px] leading-normal max-w-[680px]">{sub}</p> : null}
    </div>
  );
}

// "Próximamente en …": todavía no hay link a las tiendas.
function StoreBadge({ icon, store, light }) {
  return (
    <span
      aria-disabled="true"
      className="flex items-center gap-3 h-[60px] pl-[18px] pr-[22px] rounded-[18px]"
      style={
        light
          ? { background: '#FFFFFF', color: C.noche, border: `1px solid ${C.arena}` }
          : { background: C.noche, color: C.crema }
      }
    >
      <Icon name={icon} size={26} color={light ? C.noche : C.crema} />
      <span className="flex flex-col leading-[1.1]">
        <span className="text-xs font-medium">Próximamente en</span>
        <span className="font-display font-black text-[19px]">{store}</span>
      </span>
    </span>
  );
}

function WaitlistForm({ dark }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | done | error
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (status === 'sending') return;
    setStatus('sending');
    setError('');
    try {
      const res = await fetch(`${API}/api/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo registrar. Probá de nuevo.');
      setStatus('done');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  };

  if (status === 'done') {
    return (
      <p
        role="status"
        className="m-0 flex items-center gap-2.5 h-[60px] px-[18px] rounded-[18px] text-[17px] font-bold max-w-[520px]"
        style={dark ? { background: C.noche2, color: C.crema } : { background: '#FFFFFF', color: C.noche }}
      >
        <Icon name="check" size={22} color={C.teal} />
        ¡Listo! Te avisamos cuando salga.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2 w-full max-w-[520px]">
      <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2.5 w-full">
        <label
          className="w-full sm:w-auto sm:flex-1 flex items-center gap-2.5 h-[60px] shrink-0 px-[18px] rounded-[18px] box-border"
          style={dark ? { background: C.noche2, border: `1px solid ${C.linea}` } : { background: '#FFFFFF', border: `1px solid ${C.arena}` }}
        >
          <Icon name="mail" size={20} color={dark ? C.crema : C.noche} />
          <span className="sr-only">Tu email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            className="flex-1 min-w-0 border-0 outline-none bg-transparent text-[17px]"
            style={{ color: dark ? C.crema : C.noche }}
          />
        </label>
        <button
          type="submit"
          disabled={status === 'sending'}
          className="h-[60px] px-[26px] border-0 rounded-[18px] text-[17px] font-bold cursor-pointer disabled:opacity-60 disabled:cursor-wait"
          style={{ background: C.coral, color: C.arena }}
        >
          {status === 'sending' ? 'Enviando…' : 'Avisame'}
        </button>
      </form>
      {status === 'error' ? (
        <p role="alert" className="m-0 text-sm font-bold" style={{ color: dark ? C.crema : C.noche }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

function Phone({ src, alt, w, h, rotate = 0 }) {
  return (
    <div
      className="shrink-0 rounded-[44px] p-2.5"
      style={{ width: w, height: h, background: C.noche, boxSizing: 'content-box', transform: `rotate(${rotate}deg)` }}
    >
      <div className="w-full h-full rounded-[34px] overflow-hidden" style={{ background: C.crema }}>
        <img src={src} alt={alt} className="w-full block" loading="lazy" />
      </div>
    </div>
  );
}

const STEPS = [
  { n: 1, color: C.coral, icon: 'camera', title: 'Sacá una foto de la cara', text: 'Orejas y hocico dentro de la silueta. Es lo que mejor distingue a cada perro o gato.' },
  { n: 2, color: C.sol, icon: 'scan', title: 'Buscamos coincidencias', text: 'Comparamos la foto con los reportes de mascotas perdidas y encontradas cerca tuyo.' },
  { n: 3, color: C.teal, icon: 'bell', title: 'Avisamos en tu zona', text: 'Si no aparece, publicás el reporte y le llega una alerta a vecinos, veterinarias y refugios.' },
  { n: 4, color: C.violeta, icon: 'handshake', title: 'Se reencuentran', text: 'Hablás por el chat de Mimo, sin compartir tu teléfono, y coordinan el reencuentro.' },
];

// "Mapa en vivo": los refugios no van al mapa (no tienen ubicación pública).
const FEATURES = [
  { color: C.sol, icon: 'map', title: 'Mapa en vivo', text: 'Reportes y veterinarias cerca tuyo, con tu radio de alertas.' },
  { color: C.violeta, icon: 'heart', title: 'En adopción', text: 'Mascotas de refugios que esperan una familia, con filtros por especie y tamaño.' },
  { color: C.teal, icon: 'houseHeart', title: 'Refugios aliados', text: 'Protectoras verificadas que publican sus animales y reciben ayuda.' },
  { color: C.noche, icon: 'stethoscope', title: 'Veterinarias', text: 'Clínicas que reciben alertas y atienden a mascotas encontradas.' },
];

const TIERS = [
  { name: 'Basic', km: 5, color: C.coral },
  { name: 'Pro', km: 20, color: C.violeta },
  { name: 'Nation', km: 50, color: C.sol },
];

const FAQ = [
  { q: '¿Cuánto cuesta usar Mimo?', a: 'Nada. Reportar, buscar, chatear y recibir alertas es gratis para todas las personas. Las veterinarias pueden pagar un plan para destacarse, y los refugios se registran sin costo.' },
  { q: '¿Cómo funciona la búsqueda por foto?', a: 'Le sacás una foto a la cara de la mascota (orejas y hocico) y Mimo la compara con los reportes cercanos. Te muestra las más parecidas ordenadas por porcentaje.' },
  { q: '¿Se muestra mi teléfono o mi dirección?', a: 'No. El contacto es por el chat de Mimo y en el mapa se muestra la zona del reporte, no tu casa. Vos decidís qué compartir.' },
  { q: '¿Cuándo sale la app?', a: 'Muy pronto, para iPhone y Android. Dejanos tu email arriba y te avisamos el día del lanzamiento.' },
  { q: 'Tengo una veterinaria o un refugio, ¿cómo me sumo?', a: 'Registrate desde la app eligiendo el tipo de cuenta. Los refugios pasan por una verificación antes de aparecer en el directorio.' },
];

const navLink = 'text-base font-bold no-underline hover:opacity-80';

export default function Landing() {
  return (
    <div className="flex flex-col font-sans overflow-x-hidden" style={{ background: C.crema, color: C.noche }}>
      {/* HERO */}
      <section className="relative overflow-hidden pb-[260px] lg:pb-[300px]" style={{ background: C.crema }}>
        <img
          src="/landing/red-hero.svg"
          alt=""
          aria-hidden="true"
          className="absolute left-0 bottom-0 w-full min-w-[900px] h-auto pointer-events-none select-none"
        />
        <nav aria-label="Principal" className="relative z-[2] flex items-center justify-between px-5 md:px-10 xl:px-20 py-6">
          <a href="/" className="no-underline">
            <Logo size={34} />
          </a>
          <div className="flex items-center gap-9">
            <a href="#como" className={`${navLink} hidden lg:inline`} style={{ color: C.noche }}>Cómo funciona</a>
            <a href="#vets" className={`${navLink} hidden lg:inline`} style={{ color: C.noche }}>Vets y refugios</a>
            <a href="#apoyar" className={`${navLink} hidden lg:inline`} style={{ color: C.noche }}>Apoyar</a>
            <a href="#faq" className={`${navLink} hidden lg:inline`} style={{ color: C.noche }}>Preguntas</a>
            <a
              href="#descargar"
              className="hidden sm:flex items-center h-12 px-[22px] rounded-2xl text-base font-bold no-underline"
              style={{ background: C.coral, color: C.arena }}
            >
              Avisame cuando salga
            </a>
          </div>
        </nav>

        <div className="relative z-[1] flex flex-col lg:flex-row items-start justify-between gap-12 px-5 md:px-10 xl:px-20 pt-8 lg:pt-16">
          <div id="descargar" className="w-full lg:w-[640px] flex flex-col gap-7 lg:pt-[30px] scroll-mt-6">
            <span className="self-start flex items-center gap-2 min-h-9 py-1.5 px-4 rounded-full bg-white text-sm font-bold" style={{ letterSpacing: '.04em' }}>
              <Icon name="mapPin" size={16} color={C.coral} />
              Comunidad de reencuentro animal · Uruguay
            </span>
            <h1 className="m-0 font-display font-black text-[44px] md:text-[68px] leading-[1.04]" style={{ letterSpacing: '-0.01em' }}>
              Que cada mascota vuelva a casa.
            </h1>
            <p className="m-0 text-lg md:text-[21px] leading-normal max-w-[560px]">
              Reportá una mascota perdida o encontrada con una foto. Mimo la compara con los reportes cercanos y avisa a
              vecinos, veterinarias y refugios de tu zona.
            </p>
            <div className="flex flex-col gap-3">
              <p className="m-0 text-[15px] font-bold">La app sale muy pronto. Dejanos tu email y te avisamos el día que esté disponible.</p>
              <WaitlistForm />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <StoreBadge icon="smartphone" store="App Store" />
              <StoreBadge icon="play" store="Google Play" />
            </div>
          </div>

          <div className="relative w-full max-w-[520px] h-[700px] mx-auto lg:mx-0 hidden md:block">
            <div className="absolute left-[140px] top-0">
              <Phone src="/landing/app-home.png" alt="Pantalla de inicio de la app Mimo" w={300} h={620} />
            </div>
            <div className="absolute left-0 top-[330px] w-[250px] p-3.5 rounded-[22px] bg-white flex gap-3 items-center" style={{ boxShadow: '0 20px 40px rgba(26,26,46,.12)' }}>
              <span className="flex items-center justify-center w-11 h-11 rounded-[14px] shrink-0" style={{ background: C.coral }}>
                <Icon name="scan" size={22} color={C.arena} />
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-bold">Posible coincidencia</span>
                <span className="text-[13px]">92 % de parecido · a 0,6 km</span>
              </span>
            </div>
            <div className="absolute right-0 top-[520px] w-[230px] p-3.5 rounded-[22px] flex gap-3 items-center" style={{ background: C.violeta, color: C.arena, boxShadow: '0 20px 40px rgba(26,26,46,.12)' }}>
              <Icon name="handshake" size={26} color={C.arena} />
              <span className="flex flex-col gap-0.5">
                <span className="font-display font-black text-[17px]">¡Volvió a casa!</span>
                <span className="text-[13px]">Caso cerrado en 2 días</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section id="como" className="px-5 md:px-10 xl:px-20 py-20 md:py-[120px] flex flex-col gap-12" style={{ background: C.crema }}>
        <SectionTitle
          eyebrow="Cómo funciona"
          color={C.coral}
          title="De una foto al reencuentro, en cuatro pasos"
          sub="Perdiste a tu mascota o encontraste una en la calle: el camino es el mismo."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {STEPS.map((s) => (
            <div key={s.n} className="flex flex-col gap-4 p-7 rounded-[28px] bg-white">
              <div className="flex items-center justify-between">
                <span className="flex items-center justify-center w-[60px] h-[60px] rounded-[20px]" style={{ background: s.color }}>
                  <Icon name={s.icon} size={28} color={C.arena} />
                </span>
                <span className="font-display font-black text-[44px]" style={{ color: s.color }}>{s.n}</span>
              </div>
              <h3 className="mt-2 mb-0 font-display font-black text-2xl leading-[1.15]">{s.title}</h3>
              <p className="m-0 text-base leading-normal">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TODO EN UNA APP */}
      <section className="px-5 md:px-10 xl:px-20 pb-20 md:pb-[120px] flex flex-col lg:flex-row items-center gap-12 lg:gap-20" style={{ background: C.crema }}>
        <div className="hidden md:flex shrink-0 gap-6 items-end">
          <Phone src="/landing/app-mapa.png" alt="Mapa de la app Mimo" w={260} h={540} rotate={-4} />
          <Phone src="/landing/app-adopcion.png" alt="Mascotas en adopción en la app Mimo" w={240} h={500} rotate={4} />
        </div>
        <div className="flex-1 flex flex-col gap-8">
          <SectionTitle eyebrow="Todo en una app" color={C.violeta} title="Una comunidad entera buscando con vos" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex gap-[18px] p-6 rounded-3xl bg-white">
                <span className="flex items-center justify-center w-[52px] h-[52px] rounded-2xl shrink-0" style={{ background: f.color }}>
                  <Icon name={f.icon} size={24} color={f.color === C.noche ? C.crema : C.arena} />
                </span>
                <span className="flex flex-col gap-1">
                  <span className="font-display font-black text-[21px]">{f.title}</span>
                  <span className="text-base leading-[1.45]">{f.text}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* VETS Y REFUGIOS */}
      <section id="vets" className="px-5 md:px-10 xl:px-20 py-20 md:py-[120px] flex flex-col gap-12 bg-white">
        <SectionTitle
          eyebrow="Para veterinarias y refugios"
          color={C.teal}
          title="Sumate a la red que ayuda a que vuelvan a casa"
          sub="Registrarse es gratis. Las veterinarias pueden destacarse como Socio Mimo."
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-8 md:p-10 rounded-[32px] flex flex-col gap-[22px]" style={{ background: C.noche, color: C.crema }}>
            <span className="flex items-center justify-center w-16 h-16 rounded-[20px]" style={{ background: C.noche2 }}>
              <Icon name="stethoscope" size={30} color={C.crema} />
            </span>
            <h3 className="m-0 font-display font-black text-[34px]">Veterinarias</h3>
            <ul className="m-0 p-0 list-none flex flex-col gap-2.5">
              {[
                'Recibí alertas de mascotas perdidas y encontradas en tu radio.',
                'Aparecé en el directorio y en el mapa con tu ficha, horarios y servicios.',
                'Como Socio Mimo: card destacada, badge y métricas de alcance.',
              ].map((t) => (
                <li key={t} className="flex gap-2.5 items-start text-base leading-[1.45]">
                  <Icon name="check" size={20} color={C.teal} />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <div className="flex gap-2.5">
              {TIERS.map((t) => (
                <span key={t.name} className="flex-1 min-w-0 flex flex-col gap-0.5 py-3.5 px-3 sm:px-4 rounded-[18px]" style={{ background: t.color, color: C.arena }}>
                  <span className="flex items-center gap-1.5 text-[13px] font-bold">
                    <Icon name="star" size={13} color={C.arena} fill={C.arena} />
                    {t.name}
                  </span>
                  <span className="font-display font-black text-xl sm:text-2xl whitespace-nowrap">{t.km} km</span>
                  <span className="text-xs">de alcance</span>
                </span>
              ))}
            </div>
            <a
              href="#descargar"
              className="self-start flex items-center gap-2 h-14 px-[26px] rounded-[18px] text-base font-bold no-underline"
              style={{ background: C.crema, color: C.noche }}
            >
              Registrá tu veterinaria
              <Icon name="arrowRight" size={18} color={C.noche} />
            </a>
          </div>
          <div className="p-8 md:p-10 rounded-[32px] flex flex-col gap-[22px]" style={{ background: C.teal, color: C.arena }}>
            <span className="flex items-center justify-center w-16 h-16 rounded-[20px]" style={{ background: 'rgba(255,255,255,.22)' }}>
              <Icon name="houseHeart" size={30} color={C.arena} />
            </span>
            <h3 className="m-0 font-display font-black text-[34px]">Refugios y protectoras</h3>
            <ul className="m-0 p-0 list-none flex flex-col gap-2.5">
              {[
                'Publicá tus mascotas en adopción con fotos, datos y estado de salud.',
                'Recibí consultas de adoptantes por WhatsApp o email.',
                'Contá tu historia y sumá donaciones y voluntarios.',
              ].map((t) => (
                <li key={t} className="flex gap-2.5 items-start text-base leading-[1.45]">
                  <Icon name="check" size={20} color={C.arena} />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <p className="m-0 text-[15px] leading-normal">Verificamos cada refugio antes de publicarlo en el directorio.</p>
            <a
              href="#descargar"
              className="mt-auto self-start flex items-center gap-2 h-14 px-[26px] rounded-[18px] text-base font-bold no-underline"
              style={{ background: C.noche, color: C.crema }}
            >
              Registrá tu refugio
              <Icon name="arrowRight" size={18} color={C.crema} />
            </a>
          </div>
        </div>
      </section>

      {/* APOYAR */}
      <section id="apoyar" className="px-5 md:px-10 xl:px-20 py-20 md:py-[120px]" style={{ background: C.crema }}>
        <div className="relative overflow-hidden flex flex-col lg:flex-row lg:items-center justify-between gap-8 lg:gap-12 px-7 py-10 md:px-16 md:py-14 rounded-[36px]" style={{ background: C.coral, color: C.arena }}>
          <div className="flex flex-col gap-4 max-w-[700px]">
            <span className="flex items-center justify-center w-16 h-16 rounded-[20px]" style={{ background: 'rgba(255,255,255,.22)' }}>
              <Icon name="coffee" size={30} color={C.arena} />
            </span>
            <h2 className="m-0 font-display font-black text-[34px] md:text-[48px] leading-[1.05]">Mimo es gratis gracias a la comunidad</h2>
            <p className="m-0 text-[17px] md:text-[19px] leading-normal">
              Cada búsqueda por foto tiene un costo. Si podés, un cafecito nos ayuda a seguir conectando familias con sus mascotas.
            </p>
          </div>
          <div className="shrink-0 flex flex-col gap-3 items-stretch">
            <a
              href={MP_DONATION_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2.5 h-[60px] px-[30px] rounded-[18px] text-[17px] font-bold no-underline"
              style={{ background: C.crema, color: C.noche }}
            >
              <Icon name="heart" size={20} color={C.coral} />
              Donar por Mercado Pago
            </a>
            <a href="#vets" className="text-center text-[15px] font-bold" style={{ color: C.arena }}>
              O sumá tu veterinaria como Socio Mimo
            </a>
          </div>
        </div>
      </section>

      {/* PREGUNTAS */}
      <section id="faq" className="px-5 md:px-10 xl:px-20 pb-20 md:pb-[120px] flex flex-col lg:flex-row gap-10 lg:gap-20 items-start" style={{ background: C.crema }}>
        <div className="lg:basis-[380px] shrink-0">
          <SectionTitle
            eyebrow="Preguntas frecuentes"
            color={C.sol}
            title="Lo que más nos preguntan"
            sub={
              <>
                ¿Te quedó otra duda? Escribinos a{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} className="font-bold" style={{ color: C.noche }}>
                  {CONTACT_EMAIL}
                </a>
                .
              </>
            }
          />
        </div>
        <div className="flex-1 w-full flex flex-col gap-3">
          {FAQ.map((f, i) => (
            <details key={f.q} open={i === 0} className="group rounded-[22px] bg-white px-[26px] py-[22px]">
              <summary className="list-none flex items-center justify-between gap-4 cursor-pointer font-display font-black text-[19px] md:text-[21px] [&::-webkit-details-marker]:hidden">
                {f.q}
                <Icon name="chevronDown" size={22} color={C.noche} className="transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-3 mb-0 text-[17px] leading-[1.55] max-w-[900px]">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* SUMATE */}
      <section className="relative overflow-hidden px-5 md:px-20 pt-[110px] pb-[300px] md:pb-[400px] flex flex-col items-center gap-6 text-center" style={{ background: C.noche, color: C.crema }}>
        <img
          src="/landing/red-cta.svg"
          alt=""
          aria-hidden="true"
          className="absolute left-0 bottom-0 w-full min-w-[900px] h-auto pointer-events-none select-none"
        />
        <div aria-hidden="true" className="absolute left-0 right-0 bottom-0 h-[140px]" style={{ background: `linear-gradient(to bottom, rgba(26,26,46,0), ${C.noche})` }} />
        <div className="relative flex flex-col items-center gap-6 w-full">
          <img src="/landing/pin.svg" alt="" width={64} height={78} />
          <h2 className="m-0 font-display font-black text-[38px] md:text-[56px] leading-[1.05] max-w-[820px]">Sumate antes del lanzamiento</h2>
          <p className="m-0 text-[17px] md:text-[19px] leading-normal max-w-[600px]">Te avisamos cuando Mimo esté en las tiendas. Sin spam: un solo mail.</p>
          <WaitlistForm dark />
          <div className="flex flex-wrap justify-center gap-3">
            <StoreBadge icon="smartphone" store="App Store" light />
            <StoreBadge icon="play" store="Google Play" light />
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-5 md:px-20 pt-[72px] pb-10 flex flex-col gap-14" style={{ background: C.noche, color: C.crema }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr] gap-12 items-start">
          <div className="flex flex-col gap-[18px] max-w-[380px]">
            <Logo size={30} color={C.crema} />
            <p className="m-0 text-base leading-[1.55]">Comunidad de reencuentro animal. Hecha en Uruguay para que cada mascota vuelva a casa.</p>
            <span className="self-start flex items-center gap-2 h-[34px] px-3.5 rounded-full text-[13px] font-bold" style={{ background: C.noche2 }}>
              <Icon name="smartphone" size={16} color={C.crema} />
              Próximamente en iPhone y Android
            </span>
          </div>
          <FooterCol title="Mimo" links={[['Cómo funciona', '#como'], ['Preguntas frecuentes', '#faq'], ['Apoyar', '#apoyar']]} />
          <FooterCol title="Sumate" links={[['Veterinarias', '#vets'], ['Refugios', '#vets'], ['Socio Mimo', '#vets']]} />
          <div className="flex flex-col gap-3.5">
            <p className="m-0 text-[13px] font-bold uppercase" style={{ letterSpacing: '.1em', color: C.lavanda }}>Contacto</p>
            <a href={`mailto:${CONTACT_EMAIL}`} className="flex items-center gap-2.5 text-[15px] font-medium no-underline [overflow-wrap:anywhere]" style={{ color: C.crema }}>
              <Icon name="mail" size={18} color={C.crema} />
              {CONTACT_EMAIL}
            </a>
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-base font-medium no-underline" style={{ color: C.crema }}>
              <Icon name="atSign" size={18} color={C.crema} />
              somos.mimo.uy
            </a>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-7 text-sm" style={{ borderTop: `1px solid ${C.linea}`, color: C.lavanda }}>
          <span>© 2026 Mimo · mimo.uy</span>
          <a href="/privacy" className="no-underline" style={{ color: C.lavanda }}>Privacidad</a>
        </div>
      </footer>
    </div>
  );
}

function FooterCol({ title, links }) {
  return (
    <div className="flex flex-col gap-3.5">
      <p className="m-0 text-[13px] font-bold uppercase" style={{ letterSpacing: '.1em', color: C.lavanda }}>{title}</p>
      {links.map(([label, href]) => (
        <a key={label} href={href} className="text-base font-medium no-underline" style={{ color: C.crema }}>
          {label}
        </a>
      ))}
    </div>
  );
}
