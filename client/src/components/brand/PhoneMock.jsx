// Marco de teléfono simple, agnóstico del contenido. Recibe children
// (el screen mockeado) y los renderea adentro del chrome.
export default function PhoneMock({ children, width = 240 }) {
    const height = Math.round(width * 2.08);
    return (
        <div
            style={{
                width,
                background: '#FFF6F0',
                borderRadius: 34,
                overflow: 'hidden',
                boxShadow: '0 24px 60px rgba(26,26,46,0.22), 0 4px 12px rgba(26,26,46,0.08)',
                border: '7px solid #1A1A2E',
                flexShrink: 0,
                position: 'relative',
                height,
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <div
                style={{
                    background: '#1A1A2E',
                    height: 24,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                }}
            >
                <div style={{ width: 70, height: 6, background: '#333', borderRadius: 4 }} />
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>{children}</div>
        </div>
    );
}
