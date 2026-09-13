const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  await pool.query(`
    ALTER TABLE inquiries 
    ADD COLUMN IF NOT EXISTS user_id INT REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS client_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS client_email VARCHAR(100),
    ADD COLUMN IF NOT EXISTS client_phone VARCHAR(50),
    ADD COLUMN IF NOT EXISTS selected_services JSON DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS package_id VARCHAR(50),
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS estimated_budget VARCHAR(50);
  `);

  console.log('✅ inquiries table enhanced successfully with customer identity & selection fields.');
  await pool.end();
}

main().catch(console.error);
