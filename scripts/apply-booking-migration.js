const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:root@localhost:5432/jad_events_db?schema=public'
});

async function applyMigration() {
  console.log('--- Applying Booking & Scheduling Migration ---');
  const migrationPath = path.join(__dirname, '../prisma/migrations/20260825000002_add_booking_scheduling_modules/migration.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  const client = await pool.connect();
  try {
    await client.query(sql);
    console.log('✅ PostgreSQL Tables & Constraints created successfully!');
  } catch (err) {
    console.error('Migration error:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }

  console.log('--- Generating Prisma Client ---');
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('✅ Prisma Client regenerated successfully!');
}

applyMigration().catch(err => {
  console.error(err);
  process.exit(1);
});
