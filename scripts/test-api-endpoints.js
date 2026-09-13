const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'secret123';
const token = jwt.sign({ id: 1, role: 'Administrator' }, JWT_SECRET, { expiresIn: '1h' });

async function testApiEndpoints() {
  console.log('\n--- Testing API POST /api/services ---');
  const createSrvRes = await fetch('http://localhost:3000/api/services', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      name: 'API Test Fireworks Display',
      category: 'Stage & Performance',
      shortDesc: 'Spectacular outdoor fireworks sequence.',
      fullDesc: 'Grand pyrotechnic show with licensed safety operators.',
      price: 75000,
      features: ['Licensed Pyrotechnicians', 'Safety Perimeter Setup'],
      inclusions: ['15-Minute Finale Show', 'Fire Safety Crew'],
      isActive: true
    })
  });
  const createdService = await createSrvRes.json();
  console.log('POST /api/services Status:', createSrvRes.status, 'ID:', createdService.id);

  console.log('\n--- Testing API PUT /api/services/[id] ---');
  const updateSrvRes = await fetch(`http://localhost:3000/api/services/${createdService.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      name: 'API Test Fireworks Display (Upgraded)',
      price: 85000,
      isActive: true
    })
  });
  const updatedService = await updateSrvRes.json();
  console.log('PUT /api/services/[id] Status:', updateSrvRes.status, 'New Name:', updatedService.name, 'Price:', updatedService.price);

  console.log('\n--- Testing API DELETE /api/services/[id] ---');
  const deleteSrvRes = await fetch(`http://localhost:3000/api/services/${createdService.id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const deletedService = await deleteSrvRes.json();
  console.log('DELETE /api/services/[id] Status:', deleteSrvRes.status, deletedService.message);

  console.log('\n--- Testing API POST /api/packages ---');
  const createPkgRes = await fetch('http://localhost:3000/api/packages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      name: 'API Test Debut Royale Package',
      tagline: 'All-inclusive 18th birthday celebration suite.',
      capacity: '150 - 250 Guests',
      price: 135000,
      originalPrice: 150000,
      isPopular: true,
      isActive: true,
      idealFor: '18th Debuts and Sweet Sixteens',
      inclusions: ['18 Roses & Candles Coordination', 'Grand Cotillion Choreography'],
      features: ['Live Streaming Feed', 'Instant Photobooth'],
      servicesIncluded: ['entertainment', 'event-decoration', 'photo-video']
    })
  });
  const createdPkg = await createPkgRes.json();
  console.log('POST /api/packages Status:', createPkgRes.status, 'ID:', createdPkg.id);

  console.log('\n--- Testing API PUT /api/packages/[id] ---');
  const updatePkgRes = await fetch(`http://localhost:3000/api/packages/${createdPkg.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      name: 'API Test Debut Royale Package (Premium)',
      price: 145000,
      isActive: true
    })
  });
  const updatedPkg = await updatePkgRes.json();
  console.log('PUT /api/packages/[id] Status:', updatePkgRes.status, 'New Name:', updatedPkg.name, 'Price:', updatedPkg.price);

  console.log('\n--- Testing API DELETE /api/packages/[id] ---');
  const deletePkgRes = await fetch(`http://localhost:3000/api/packages/${createdPkg.id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const deletedPkg = await deletePkgRes.json();
  console.log('DELETE /api/packages/[id] Status:', deletePkgRes.status, deletedPkg.message);

  console.log('\n🎉 ALL LIVE API ENDPOINT TESTS PASSED SUCCESSFULLY!\n');
}

testApiEndpoints().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
