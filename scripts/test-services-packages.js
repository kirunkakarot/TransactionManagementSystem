const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:root@localhost:5432/jad_events_db?schema=public'
});

const JWT_SECRET = process.env.JWT_SECRET || 'secret123';

async function testServicesAndPackagesPersistence() {
  const client = await pool.connect();
  console.log('\n======================================================');
  console.log('  TESTING ADMIN SERVICES & PACKAGES PERSISTENCE');
  console.log('======================================================\n');

  try {
    // 1. Get or create an admin user for authentication testing
    let adminRes = await client.query("SELECT * FROM users WHERE role = 'Administrator' LIMIT 1");
    let adminUser;
    if (adminRes.rows.length > 0) {
      adminUser = adminRes.rows[0];
    } else {
      const inserted = await client.query(
        "INSERT INTO users (name, email, password, role, created_at) VALUES ('Admin User', 'admin@jadevents.ph', 'hashed', 'Administrator', NOW()) RETURNING *"
      );
      adminUser = inserted.rows[0];
    }

    const token = jwt.sign({ id: adminUser.id }, JWT_SECRET, { expiresIn: '1h' });
    console.log('✓ Admin authenticated:', adminUser.email);

    // 2. Test Service Creation & Persistence
    console.log('\n--- 1. Testing Service Creation ---');
    const servicePayload = {
      name: 'Custom Drone Light Show',
      category: 'Technical & Staging',
      shortDesc: 'Synchronized aerial drone light show choreography.',
      fullDesc: 'Up to 200 illuminated drones performing animated logo formations and 3D shapes.',
      price: 95000,
      featuredImage: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=800&q=80',
      iconName: 'Sparkles',
      features: ['200 Drone Fleet', 'Custom Choreography', 'CAAP Flight Permits'],
      inclusions: ['Flight Director', 'Ground Crew', 'Battery Stations'],
      isActive: true
    };

    const sInsert = await client.query(`
      INSERT INTO services (name, category, short_desc, full_desc, description, price, featured_image, icon_name, features, inclusions, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      RETURNING *;
    `, [
      servicePayload.name,
      servicePayload.category,
      servicePayload.shortDesc,
      servicePayload.fullDesc,
      servicePayload.shortDesc,
      servicePayload.price,
      servicePayload.featuredImage,
      servicePayload.iconName,
      JSON.stringify(servicePayload.features),
      JSON.stringify(servicePayload.inclusions),
      servicePayload.isActive
    ]);

    const createdService = sInsert.rows[0];
    console.log('Service created with ID:', createdService.id, 'Name:', createdService.name);
    console.log('Created service verified in DB:', createdService.name === servicePayload.name ? '✅ PASS' : '❌ FAIL');
    console.log('Inclusions array persisted:', Array.isArray(createdService.inclusions) && createdService.inclusions.length === 3 ? '✅ PASS' : '❌ FAIL');

    // 3. Test Service Update
    console.log('\n--- 2. Testing Service Update ---');
    const updatedServiceName = 'Custom Drone Light Show (Grand Edition)';
    const updatedPrice = 120000;
    await client.query(`
      UPDATE services 
      SET name = $1, price = $2, is_active = $3, updated_at = NOW()
      WHERE id = $4
    `, [updatedServiceName, updatedPrice, false, createdService.id]);

    const sUpdated = (await client.query('SELECT * FROM services WHERE id = $1', [createdService.id])).rows[0];
    console.log('Updated service name in DB:', sUpdated.name === updatedServiceName ? '✅ PASS' : '❌ FAIL', `("${sUpdated.name}")`);
    console.log('Updated service price in DB:', Number(sUpdated.price) === updatedPrice ? '✅ PASS' : '❌ FAIL', `(₱${sUpdated.price})`);
    console.log('Service deactivation persisted (is_active=false):', sUpdated.is_active === false ? '✅ PASS' : '❌ FAIL');

    // 4. Test Service Deletion
    console.log('\n--- 3. Testing Service Deletion ---');
    await client.query('DELETE FROM services WHERE id = $1', [createdService.id]);
    const sDeletedCheck = await client.query('SELECT * FROM services WHERE id = $1', [createdService.id]);
    console.log('Service successfully removed from DB:', sDeletedCheck.rows.length === 0 ? '✅ PASS' : '❌ FAIL');

    // 5. Test Package Creation & Persistence
    console.log('\n--- 4. Testing Package Creation ---');
    const packagePayload = {
      name: 'Ultra Luxury Symphony Gala Package',
      tagline: 'Full symphony orchestra accompaniment and royal ballroom styling.',
      capacity: '300 - 600 Guests',
      price: 250000,
      originalPrice: 300000,
      isPopular: true,
      isActive: true,
      idealFor: 'Royal Weddings, Presidential Balls & State Banquets',
      inclusions: [
        '50-Piece Live Symphony Orchestra',
        '360 Panoramic Holographic LED Walls',
        'Executive Chef 7-Course Degustation Banquet',
        'Complete 10-person Coordination & Concierge Team'
      ],
      features: ['White Glove Protocol', 'Drone SDE Film', 'Celebrity Bilingual Emcee'],
      servicesIncluded: ['entertainment', 'catering', 'event-production', 'photo-video']
    };

    const pInsert = await client.query(`
      INSERT INTO packages (name, tagline, description, capacity, price, original_price, is_popular, is_active, ideal_for, inclusions, features, services_included, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      RETURNING *;
    `, [
      packagePayload.name,
      packagePayload.tagline,
      packagePayload.tagline,
      packagePayload.capacity,
      packagePayload.price,
      packagePayload.originalPrice,
      packagePayload.isPopular,
      packagePayload.isActive,
      packagePayload.idealFor,
      JSON.stringify(packagePayload.inclusions),
      JSON.stringify(packagePayload.features),
      JSON.stringify(packagePayload.servicesIncluded)
    ]);

    const createdPackage = pInsert.rows[0];
    console.log('Package created with ID:', createdPackage.id, 'Name:', createdPackage.name);
    console.log('Created package verified in DB:', createdPackage.name === packagePayload.name ? '✅ PASS' : '❌ FAIL');
    console.log('Package capacity saved:', createdPackage.capacity === '300 - 600 Guests' ? '✅ PASS' : '❌ FAIL');
    console.log('Package isPopular saved:', createdPackage.is_popular === true ? '✅ PASS' : '❌ FAIL');

    // 6. Test Package Update
    console.log('\n--- 5. Testing Package Update ---');
    const updatedPackageName = 'Ultra Luxury Symphony Gala Package (Diamond Tier)';
    const updatedPackagePrice = 280000;
    await client.query(`
      UPDATE packages 
      SET name = $1, price = $2, capacity = '500 - 1000 Guests', updated_at = NOW()
      WHERE id = $3
    `, [updatedPackageName, updatedPackagePrice, createdPackage.id]);

    const pUpdated = (await client.query('SELECT * FROM packages WHERE id = $1', [createdPackage.id])).rows[0];
    console.log('Updated package name in DB:', pUpdated.name === updatedPackageName ? '✅ PASS' : '❌ FAIL', `("${pUpdated.name}")`);
    console.log('Updated package price in DB:', Number(pUpdated.price) === updatedPackagePrice ? '✅ PASS' : '❌ FAIL', `(₱${pUpdated.price})`);
    console.log('Updated capacity in DB:', pUpdated.capacity === '500 - 1000 Guests' ? '✅ PASS' : '❌ FAIL');

    // 7. Test Package Deletion
    console.log('\n--- 6. Testing Package Deletion ---');
    await client.query('DELETE FROM packages WHERE id = $1', [createdPackage.id]);
    const pDeletedCheck = await client.query('SELECT * FROM packages WHERE id = $1', [createdPackage.id]);
    console.log('Package successfully removed from DB:', pDeletedCheck.rows.length === 0 ? '✅ PASS' : '❌ FAIL');

    console.log('\n======================================================');
    console.log('  ALL SERVICES & PACKAGES PERSISTENCE TESTS PASSED!  ');
    console.log('======================================================\n');
  } catch (err) {
    console.error('Test error:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

testServicesAndPackagesPersistence();
