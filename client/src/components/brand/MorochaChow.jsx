// La morocha — chow chow negra que inspiró Mimo (proyecto originalmente Nigra).
// Ilustración vectorial construida con formas geométricas, sin dependencias.
export default function MorochaChow({ size = 120 }) {
    const cx = 60,
        cy = 62;
    const bumps = Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2;
        const R = 43;
        return {
            x: cx + R * Math.cos(a),
            y: cy + R * Math.sin(a),
            shade: i % 2 ? '#1A1A2E' : '#26243f',
        };
    });
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 120 120"
            xmlns="http://www.w3.org/2000/svg"
            style={{ display: 'block' }}
        >
            <ellipse cx="33" cy="33" rx="11" ry="14" fill="#16162a" transform="rotate(-22 33 33)" />
            <ellipse cx="87" cy="33" rx="11" ry="14" fill="#16162a" transform="rotate(22 87 33)" />
            {bumps.map((b, i) => (
                <circle key={i} cx={b.x} cy={b.y} r="15" fill={b.shade} />
            ))}
            <circle cx={cx} cy={cy} r="39" fill="#1A1A2E" />
            <circle cx={cx} cy={cy + 5} r="29" fill="#2a2844" />
            <ellipse cx={cx} cy={cy + 17} rx="16" ry="13" fill="#34324f" />
            <ellipse cx={cx - 11} cy={cy + 2} rx="3.4" ry="4.4" fill="#0c0c16" />
            <ellipse cx={cx + 11} cy={cy + 2} rx="3.4" ry="4.4" fill="#0c0c16" />
            <circle cx={cx - 10} cy={cy + 0.6} r="1.1" fill="#fff" opacity="0.85" />
            <circle cx={cx + 12} cy={cy + 0.6} r="1.1" fill="#fff" opacity="0.85" />
            <ellipse cx={cx} cy={cy + 12} rx="5" ry="3.8" fill="#0c0c16" />
            <path
                d="M55.5 76 q4.5 1 9 0 q0 8 -4.5 9 q-4.5 -1 -4.5 -9 Z"
                fill="#6f6ca6"
            />
            <line x1="60" y1="77" x2="60" y2="84" stroke="#565288" strokeWidth="1" />
        </svg>
    );
}
