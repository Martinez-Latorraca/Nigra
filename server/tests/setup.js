// Env mínimo para que los controllers no exploten al cargar.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.NODE_ENV = 'test';
// Silencio el console.error para que los logs intencionales (catch del controller)
// no llenen la salida de los tests.
const noop = () => {};
console.error = noop;
console.warn = noop;
console.log = noop;
