const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:root@localhost:5432/jad_events_db?schema=public'
});

async function seedData() {
  const client = await pool.connect();
  console.log('--- Seeding Initial Staff & Equipment Resources ---');

  try {
    // 1. Seed Staff
    const staffList = [
      { code: 'st-1', name: 'Marco Valenzuela', role: 'Lead Director', phone: '0917-111-2233', email: 'marco@jadevents.ph', status: 'Available', skills: JSON.stringify(['Event Flow', 'Stage Directing', 'VIP Protocol']) },
      { code: 'st-2', name: 'Ramil Torres', role: 'Sound Engineer', phone: '0918-222-3344', email: 'ramil@jadevents.ph', status: 'Available', skills: JSON.stringify(['Digital Mixing', 'Line Array Rigging', 'Acoustic Tuning']) },
      { code: 'st-3', name: 'Angelo Cruz', role: 'Lighting Tech', phone: '0919-333-4455', email: 'angelo@jadevents.ph', status: 'Available', skills: JSON.stringify(['DMX Console', 'Moving Head Beam', 'Laser Program']) },
      { code: 'st-4', name: 'Marie Del Rosario', role: 'Event Coordinator', phone: '0920-444-5566', email: 'marie@jadevents.ph', status: 'Available', skills: JSON.stringify(['Guest Logistics', 'Timeline Mgmt', 'Supplier Briefing']) },
      { code: 'st-5', name: 'Gabriel Santos', role: 'Photo/Video Lead', phone: '0921-555-6677', email: 'gabriel@jadevents.ph', status: 'Available', skills: JSON.stringify(['Same Day Edit', '4K Drone', 'Cinematography']) },
      { code: 'st-6', name: 'Katrina Rivera', role: 'Master of Ceremonies', phone: '0922-666-7788', email: 'katrina@jadevents.ph', status: 'Available', skills: JSON.stringify(['Bilingual Hosting', 'Corporate Moderation', 'Debut Traditions']) },
      { code: 'st-7', name: 'Dexter Navarro', role: 'Stage Manager', phone: '0923-777-8899', email: 'dexter@jadevents.ph', status: 'Available', skills: JSON.stringify(['Backstage Cues', 'Audio-Visual Sync', 'Performer Call']) },
      { code: 'st-8', name: 'Chef Anthony Lim', role: 'Banquet Captain', phone: '0924-888-9900', email: 'anthony@jadevents.ph', status: 'Available', skills: JSON.stringify(['Banquet Service', 'Plating Aesthetics', 'F&B Operations']) }
    ];

    for (const s of staffList) {
      await client.query(`
        INSERT INTO staff (staff_code, name, role, phone, email, status, skills, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        ON CONFLICT (staff_code) DO UPDATE SET
          name = EXCLUDED.name,
          role = EXCLUDED.role,
          phone = EXCLUDED.phone,
          email = EXCLUDED.email,
          skills = EXCLUDED.skills
      `, [s.code, s.name, s.role, s.phone, s.email, s.status, s.skills]);
    }
    console.log('✅ Staff members seeded!');

    // 2. Seed Equipment
    const equipmentList = [
      { code: 'eq-1', name: 'P3 High-Definition LED Display Panel (3m x 2m)', category: 'Visual / Video', quantity: 6, unit: 'sets', condition: 'Excellent', serviceId: 'event-production', notes: 'NovaStar video processor and rigging hardware included.' },
      { code: 'eq-2', name: 'Dual Active Line Array Sound System (10,000W)', category: 'Audio', quantity: 4, unit: 'rigs', condition: 'Excellent', serviceId: 'event-production', notes: 'Yamaha TF5 32-ch digital mixer, dual subwoofers.' },
      { code: 'eq-3', name: 'Shure QLXD UHF Wireless Microphones', category: 'Audio', quantity: 12, unit: 'units', condition: 'Excellent', serviceId: 'entertainment', notes: 'Includes paddle antennas and recharge docks.' },
      { code: 'eq-4', name: '360 Glam Slow-Motion Video Spinner Platform', category: 'Guest Engagement', quantity: 3, unit: 'units', condition: 'Good', serviceId: 'photo-booth', notes: 'High-speed motor with ring light arm & instant iPad station.' },
      { code: 'eq-5', name: 'DNP RX1-HS High-Speed Dye-Sublimation Printers', category: 'Photo Media', quantity: 4, unit: 'units', condition: 'Excellent', serviceId: 'photo-booth', notes: '4x6 magnetic strip media cartridges on stock.' },
      { code: 'eq-6', name: 'Sony FX3 Cinema Camera Kits & G-Master Lenses', category: 'Media Coverage', quantity: 6, unit: 'kits', condition: 'Excellent', serviceId: 'photo-video', notes: 'Includes Ronin RS3 Pro gimbals and wireless transmitters.' },
      { code: 'eq-7', name: 'DJI Mavic 3 Pro Cine Drone', category: 'Aerial Video', quantity: 2, unit: 'units', condition: 'Excellent', serviceId: 'photo-video', notes: 'Dual operator remote controls with CAAP-registered pilot log.' },
      { code: 'eq-8', name: 'Intelligent Beam 230W Moving Heads & DMX Console', category: 'Lighting & FX', quantity: 16, unit: 'units', condition: 'Good', serviceId: 'event-production', notes: 'Flight-cased in pairs with heavy-duty C-clamps.' },
      { code: 'eq-9', name: 'Cold Spark Pyrotechnic Simulation Machines (Indoor Safe)', category: 'Special Effects', quantity: 6, unit: 'units', condition: 'Excellent', serviceId: 'event-production', notes: 'Titanium powder fuel granules certified non-flammable.' },
      { code: 'eq-10', name: 'Ghost Resin Dior Chairs & Gold Tiffany Chairs', category: 'Furniture Rentals', quantity: 300, unit: 'chairs', condition: 'Good', serviceId: 'event-rentals', notes: 'Cushioned pads in white and champagne.' }
    ];

    for (const e of equipmentList) {
      await client.query(`
        INSERT INTO equipment_resources (resource_code, name, category, quantity, unit, condition, assigned_service_id, notes, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        ON CONFLICT (resource_code) DO UPDATE SET
          name = EXCLUDED.name,
          category = EXCLUDED.category,
          quantity = EXCLUDED.quantity,
          unit = EXCLUDED.unit,
          condition = EXCLUDED.condition,
          assigned_service_id = EXCLUDED.assigned_service_id,
          notes = EXCLUDED.notes
      `, [e.code, e.name, e.category, e.quantity, e.unit, e.condition, e.serviceId, e.notes]);
    }
    console.log('✅ Equipment resources seeded!');

  } catch (err) {
    console.error('Seeding error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

seedData();
