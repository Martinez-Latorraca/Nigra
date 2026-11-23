import { describe, it, expect } from 'vitest';
import { petShareData, adoptionShareData, relativeDay, renderShareImage } from '../lib/shareCards.js';

describe('shareCards', () => {
    describe('relativeDay', () => {
        const now = new Date('2026-11-22T15:00:00');
        it('hoy, ayer, días, semanas y meses', () => {
            expect(relativeDay('2026-11-22T08:00:00', now)).toBe('Hoy');
            expect(relativeDay('2026-11-21T23:00:00', now)).toBe('Ayer');
            expect(relativeDay('2026-11-20T10:00:00', now)).toBe('Hace 2 días');
            expect(relativeDay('2026-11-01T10:00:00', now)).toBe('Hace 3 semanas');
            expect(relativeDay('2026-08-01T10:00:00', now)).toBe('Hace 4 meses');
        });
    });

    describe('petShareData', () => {
        it('perdido con nombre y barrio', () => {
            const d = petShareData({ id: 5, status: 'lost', name: 'Luna', type: 'dog', color: 'brown', address: 'Pocitos, Montevideo' });
            expect(d.title).toBe('Luna se perdió en Pocitos · Mimo');
            expect(d.description).toBe('Perro marrón. Si la viste, avisá en Mimo.');
            expect(d.chip).toBe('Perdido');
            expect(d.lines[0].text).toBe('Se perdió en Pocitos');
            expect(d.path).toBe('/pet/5');
        });

        it('encontrado sin nombre ni dirección', () => {
            const d = petShareData({ id: 6, status: 'found', type: 'cat', color: 'black' });
            expect(d.title).toBe('Gato encontrado · Mimo');
            expect(d.name).toBe('Gato encontrado');
            expect(d.lines).toEqual([]);
        });

        it('caso resuelto cambia el mensaje', () => {
            const d = petShareData({ id: 7, status: 'lost', name: 'Toby', type: 'dog', resolved_at: '2026-11-20' });
            expect(d.kicker).toBe('¡Volvió a casa!');
            expect(d.storyHead).toBe('VOLVIÓ A CASA');
        });
    });

    describe('adoptionShareData', () => {
        it('arma el meta con especie, edad y castración según el sexo', () => {
            const d = adoptionShareData({
                id: 3, species: 'cat', sex: 'female', age_group: 'young', neutered: true, vaccinated: true,
                name: 'Mora', shelter_name: 'Patitas', shelter_city: 'Canelones', photos: ['x'],
            });
            expect(d.meta).toBe('Gato · Joven · Castrada');
            expect(d.title).toBe('Mora busca familia · Mimo');
            expect(d.lines.map((l) => l.text)).toEqual(['Patitas · Canelones', 'Vacunada']);
            expect(d.photo).toBe('x');
            expect(d.path).toBe('/adoptions/3');
        });
    });

    describe('renderShareImage', () => {
        it('genera un JPEG de vista previa liviano (sin foto)', async () => {
            const d = petShareData({ id: 8, status: 'found', type: 'dog', color: 'black', address: 'Cordón, Montevideo' });
            const buf = await renderShareImage(d, 'card', 'https://mimo.uy');
            expect(buf[0]).toBe(0xff); // SOI de JPEG
            expect(buf[1]).toBe(0xd8);
            expect(buf.length).toBeLessThan(300 * 1024);
        }, 20000);
    });
});
