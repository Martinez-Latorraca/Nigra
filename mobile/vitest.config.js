import { defineConfig } from 'vitest/config';

// Suite de unit tests de mobile: cubre lógica pura (reducers, interceptor
// de axios) que no depende del runtime de React Native. Los mocks de
// react-native / expo-router se hacen en cada archivo.
export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        setupFiles: ['./src/tests/setup.js'],
        include: ['src/**/*.test.{js,jsx}'],
    },
});
