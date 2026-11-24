import { describe, it, expect } from 'vitest';
import { assetLinks, parseFingerprints } from '../lib/assetLinks.js';

const A = 'AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89';
const B = '11:22:33:44:55:66:77:88:99:00:AA:BB:CC:DD:EE:FF:11:22:33:44:55:66:77:88:99:00:AA:BB:CC:DD:EE:FF';

describe('assetLinks', () => {
    it('sin huellas no publica nada', () => {
        expect(assetLinks(undefined)).toBeNull();
        expect(assetLinks('')).toBeNull();
        expect(assetLinks('cualquier cosa')).toBeNull();
    });

    it('acepta varias huellas, con espacios y en minúscula', () => {
        expect(parseFingerprints(` ${A.toLowerCase()} , ${B}`)).toEqual([A, B]);
    });

    it('descarta las huellas mal formadas', () => {
        expect(parseFingerprints(`${A},AB:CD`)).toEqual([A]);
    });

    it('arma el JSON para com.mimo.app', () => {
        expect(assetLinks(A)).toEqual([{
            relation: ['delegate_permission/common.handle_all_urls'],
            target: { namespace: 'android_app', package_name: 'com.mimo.app', sha256_cert_fingerprints: [A] },
        }]);
    });
});
