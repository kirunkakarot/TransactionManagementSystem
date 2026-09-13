const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'jad_events_db',
  password: process.env.DB_PASSWORD || 'root',
  port: 5432,
});

const SERVICES = [
  {
    name: 'Entertainment',
    description: 'Professional live performers, acoustic bands, dynamic DJs, hosts & master of ceremonies.',
    price: 15000,
  },
  {
    name: 'Catering',
    description: 'Buffet setups, plated degustations, signature cocktail bars, and grazing tables.',
    price: 35000,
  },
  {
    name: 'Event Decoration',
    description: 'Thematic balloon styling, lush floral arrangements, backdrop design, and entrance tunnels.',
    price: 20000,
  },
  {
    name: 'Photo Booth',
    description: '360 Glam video spinners, magnetic instant prints, custom templates, and fun props.',
    price: 8500,
  },
  {
    name: 'Photography & Videography',
    description: 'Cinematic Same-Day-Edit (SDE) videos, drone aerials, and high-resolution photo coverage.',
    price: 28000,
  },
  {
    name: 'Event Rentals',
    description: 'Ghost chairs, Tiffany chairs, cocktail tables, mobile air-conditioning, tents, and LED walls.',
    price: 12000,
  },
  {
    name: 'Event Production',
    description: 'High-definition P3 LED walls, intelligent moving head beams, digital audio mixing, and special FX.',
    price: 40000,
  },
];

const PACKAGES = [
  {
    name: 'Birthday Celebration Package',
    description: 'Vibrant, stress-free birthday milestones and debut parties.',
    price: 35000,
  },
  {
    name: 'Grand Wedding Package',
    description: 'All-inclusive dream wedding production and seamless guest management.',
    price: 85000,
  },
  {
    name: 'Corporate Gala & Launch Package',
    description: 'Polished technical production for corporate assemblies and product rollouts.',
    price: 65000,
  },
  {
    name: 'Milestone Celebration Package',
    description: 'Customized luxury packages for anniversaries, baptisms, and reunions.',
    price: 50000,
  },
];

async function seed() {
  const client = await pool.connect();
  try {
    console.log('--- Seeding Services ---');
    for (const service of SERVICES) {
      const existing = await client.query('SELECT id FROM services WHERE name = $1', [service.name]);
      if (existing.rows.length === 0) {
        await client.query(
          'INSERT INTO services (name, description, price, created_at) VALUES ($1, $2, $3, NOW())',
          [service.name, service.description, service.price]
        );
        console.log(`Inserted service: ${service.name}`);
      } else {
        await client.query(
          'UPDATE services SET description = $1, price = $2 WHERE id = $3',
          [service.description, service.price, existing.rows[0].id]
        );
        console.log(`Updated service: ${service.name}`);
      }
    }

    console.log('--- Seeding Packages ---');
    for (const pkg of PACKAGES) {
      const existing = await client.query('SELECT id FROM packages WHERE name = $1', [pkg.name]);
      if (existing.rows.length === 0) {
        await client.query(
          'INSERT INTO packages (name, description, price, created_at) VALUES ($1, $2, $3, NOW())',
          [pkg.name, pkg.description, pkg.price]
        );
        console.log(`Inserted package: ${pkg.name}`);
      } else {
        await client.query(
          'UPDATE packages SET description = $1, price = $2 WHERE id = $3',
          [pkg.description, pkg.price, existing.rows[0].id]
        );
        console.log(`Updated package: ${pkg.name}`);
      }
    }

    const sCount = await client.query('SELECT COUNT(*) FROM services');
    const pCount = await client.query('SELECT COUNT(*) FROM packages');
    console.log(`✅ Seeding Complete! Total Services: ${sCount.rows[0].count}, Total Packages: ${pCount.rows[0].count}`);
  } catch (err) {
    console.error('Seeding Error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
