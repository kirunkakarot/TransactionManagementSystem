require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// We use the direct pooler URL for script insertion
const pool = new Pool({
  connectionString: process.env.DIRECT_URL
});

async function seedAdmin() {
  const client = await pool.connect();
  try {
    const adminEmail = 'admin@jadevents.com';
    const adminPassword = 'password123';
    
    const existing = await client.query('SELECT id FROM users WHERE email = $1', [adminEmail]);

    if (existing.rows.length > 0) {
      console.log(`Admin user ${adminEmail} already exists.`);
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    await client.query(
      `INSERT INTO users (name, email, password, role, phone, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
      ['System Administrator', adminEmail, hashedPassword, 'Administrator', '1234567890']
    );

    console.log('✅ Admin user created successfully:');
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
  } catch (error) {
    console.error('Failed to seed admin:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

seedAdmin();
