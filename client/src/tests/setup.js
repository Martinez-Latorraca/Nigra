import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Silenciamos logs esperados (thunks que rechazan, console.error de React
// para props inválidas en tests intencionales, etc.) para que el output
// sea legible.
console.error = () => {};
console.warn = () => {};

// Vite import.meta.env stub — los slices leen VITE_API_URL.
vi.stubEnv('VITE_API_URL', 'http://localhost:3000');

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});
