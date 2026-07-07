import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

// TLS a la DB. Por defecto en prod ahora VERIFICAMOS el cert del servidor
// (Node acepta la cadena si el sistema tiene el CA). Si tu proveedor de DB
// usa cert self-signed y no querés instalar el CA, pon PGSSL_ALLOW_INSECURE=1
// para volver al comportamiento viejo (documentar el riesgo de MITM).
const allowInsecureSsl = process.env.PGSSL_ALLOW_INSECURE === '1';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: !allowInsecureSsl } : false,
});

export default pool;