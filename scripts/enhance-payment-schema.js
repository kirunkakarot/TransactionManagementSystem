const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  await pool.query(`
    ALTER TABLE payment_transactions 
    ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Pending Verification',
    ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
    ADD COLUMN IF NOT EXISTS rejected_by VARCHAR(100),
    ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP(6);
  `);

  console.log('✅ payment_transactions table enhanced successfully with status and rejection fields.');
  await pool.end();
}

main().catch(console.error);
