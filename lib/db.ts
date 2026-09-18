import { Pool } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  console.warn('DATABASE_URL is not set in environment variables');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  // Log slow queries (>500ms) for audit
  if (duration > 500) {
    console.log('[Neon SQL] Executed slow query:', { text, duration, rows: res.rowCount });
  }
  return res;
}

export default pool;
