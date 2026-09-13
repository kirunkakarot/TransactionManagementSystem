import { Pool } from 'pg';

const globalForDb = globalThis as unknown as {
  pool: Pool | undefined;
};

const createPool = () => {
  const p = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'jad_events_db',
    password: process.env.DB_PASSWORD || 'root',
    port: parseInt(process.env.DB_PORT || '5432', 10),
  });

  p.on('connect', () => {
    console.log('Connected to PostgreSQL Database');
  });

  p.on('error', (err) => {
    console.warn('PostgreSQL Pool Connection Notice:', err.message);
  });

  return p;
};

export const pool = globalForDb.pool ?? createPool();

if (process.env.NODE_ENV !== 'production') {
  globalForDb.pool = pool;
}

export const db = {
  query: (text: string, params?: any[]) => pool.query(text, params),
  pool,
};
