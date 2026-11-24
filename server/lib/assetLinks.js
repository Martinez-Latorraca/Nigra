// Digital Asset Links para los App Links de Android: le dice a Android que la
// app com.mimo.app puede abrir los links de mimo.uy (fichas de mascotas,
// adopciones, refugios y veterinarias) sin pasar por el navegador.
//
// Las huellas SHA-256 de los certificados de firma vienen de
// ANDROID_CERT_SHA256, separadas por coma: la de EAS (`eas credentials`) y,
// cuando la app esté en Play Store, la de "App Signing" de Play Console.
// Nunca la del keystore de debug: es pública y cualquiera firma con ella.

export const ANDROID_PACKAGE = 'com.mimo.app';

const FINGERPRINT = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/;

export function parseFingerprints(raw) {
    return String(raw || '')
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter((s) => FINGERPRINT.test(s));
}

// null si no hay huellas configuradas (la ruta responde 404).
export function assetLinks(raw) {
    const fingerprints = parseFingerprints(raw);
    if (fingerprints.length === 0) return null;
    return [{
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
            namespace: 'android_app',
            package_name: ANDROID_PACKAGE,
            sha256_cert_fingerprints: fingerprints,
        },
    }];
}
