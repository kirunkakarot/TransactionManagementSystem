const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:root@localhost:5432/jad_events_db?schema=public'
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('--- Adding columns to services & packages tables ---');
    
    // Services table columns
    await client.query(`
      ALTER TABLE services 
      ADD COLUMN IF NOT EXISTS category VARCHAR(100),
      ADD COLUMN IF NOT EXISTS short_desc TEXT,
      ADD COLUMN IF NOT EXISTS full_desc TEXT,
      ADD COLUMN IF NOT EXISTS featured_image TEXT,
      ADD COLUMN IF NOT EXISTS icon_name VARCHAR(50) DEFAULT 'Sparkles',
      ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS inclusions JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP;
    `);
    console.log('✅ Services table updated!');

    // Packages table columns
    await client.query(`
      ALTER TABLE packages 
      ADD COLUMN IF NOT EXISTS tagline TEXT,
      ADD COLUMN IF NOT EXISTS capacity VARCHAR(100),
      ADD COLUMN IF NOT EXISTS original_price DECIMAL(10, 2),
      ADD COLUMN IF NOT EXISTS is_popular BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS ideal_for TEXT,
      ADD COLUMN IF NOT EXISTS inclusions JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS services_included JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP;
    `);
    console.log('✅ Packages table updated!');

    const sCols = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'services'
      ORDER BY ordinal_position;
    `);
    console.log('Services Columns:', sCols.rows.map(r => r.column_name));

    const pCols = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'packages'
      ORDER BY ordinal_position;
    `);
    console.log('Packages Columns:', pCols.rows.map(r => r.column_name));
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
