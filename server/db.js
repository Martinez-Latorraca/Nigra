import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // 🔐 Configuración de SSL vital para Supabase/Render
  ssl: isProduction ? { rejectUnauthorized: true } : false
});

export default pool;