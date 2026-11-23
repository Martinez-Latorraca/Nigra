import { C } from '../utils/theme';

// Logo de Mimo: pin de marca + "mimo" con el punto de la i en Coral.
// Mismo dibujo que el de la landing.
export default function Wordmark({ size = 28, color = C.noche }) {
    return (
        <span className="flex items-center gap-2.5" aria-label="mimo">
            <img src="/landing/pin.svg" alt="" width={Math.round(size * 1.14)} height={Math.round(size * 1.4)} />
            <span className="font-display font-extrabold leading-none" style={{ fontSize: size, color }} aria-hidden="true">
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
