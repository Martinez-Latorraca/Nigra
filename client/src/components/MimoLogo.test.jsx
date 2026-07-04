import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import MimoLogo from './MimoLogo';

describe('<MimoLogo />', () => {
    it('renderiza un SVG con defaults (32px, coral)', () => {
        const { container } = render(<MimoLogo />);
        const svg = container.querySelector('svg');
        expect(svg).toBeTruthy();
        expect(svg.getAttribute('width')).toBe('32');
        expect(svg.getAttribute('height')).toBe('32');
        expect(svg.getAttribute('viewBox')).toBe('0 0 453 528');
        expect(svg.getAttribute('aria-hidden')).toBe('true');

        const path = svg.querySelector('path');
        expect(path.getAttribute('fill')).toBe('#FF5C6C');
    });

    it('respeta size + color por prop', () => {
        const { container } = render(<MimoLogo size={64} color="#1A1A2E" />);
        const svg = container.querySelector('svg');
        expect(svg.getAttribute('width')).toBe('64');
        expect(svg.getAttribute('height')).toBe('64');
        expect(svg.querySelector('path').getAttribute('fill')).toBe('#1A1A2E');
    });

    it('acepta className y style extra', () => {
        const { container } = render(<MimoLogo className="my-cls" style={{ opacity: 0.5 }} />);
        const svg = container.querySelector('svg');
        expect(svg.getAttribute('class')).toBe('my-cls');
        // display: block viene del componente + opacity del style prop
        expect(svg.style.display).toBe('block');
        expect(svg.style.opacity).toBe('0.5');
    });
});
