import { describe, it, expect } from 'vitest';
import { petShareMessage, adoptionShareMessage, sinceText } from './shareText';

const now = new Date('2026-11-22T15:00:00');

describe('shareText', () => {
  it('sinceText', () => {
    expect(sinceText('2026-11-22T08:00:00', now)).toBe('hoy');
    expect(sinceText('2026-11-20T08:00:00', now)).toBe('hace 2 días');
  });

  it('perdido', () => {
    const pet = { id: 123, status: 'lost', name: 'Luna', type: 'dog', address: 'Pocitos, Montevideo', created_at: '2026-11-20T10:00:00' };
    expect(petShareMessage(pet, 'https://mimo.uy', now)).toBe(
      '¡Ayudanos a encontrar a Luna! Se perdió en Pocitos hace 2 días. Si la viste, avisá en Mimo: https://mimo.uy/pet/123'
    );
  });

  it('encontrado', () => {
    const pet = { id: 5, status: 'found', type: 'dog', address: 'Cordón, Montevideo' };
    expect(petShareMessage(pet, 'https://mimo.uy', now)).toBe(
      'Encontramos este perro en Cordón. ¿Es tuyo o lo conocés? Escribí en Mimo: https://mimo.uy/pet/5'
    );
  });

  it('adopción', () => {
    expect(adoptionShareMessage({ id: 9, name: 'Toto', sex: 'male' }, 'https://mimo.uy')).toBe(
      'Toto busca familia. Conocelo y compartí para que encuentre su casa: https://mimo.uy/adoptions/9'
    );
  });
});
