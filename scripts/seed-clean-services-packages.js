const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:root@localhost:5432/jad_events_db?schema=public'
});

async function cleanSeedData() {
  const client = await pool.connect();
  console.log('--- Cleaning and updating default services & packages data ---');

  try {
    // 1. Update Services
    const defaultServices = [
      {
        id: 1,
        name: 'Entertainment & Live Hosting',
        category: 'Stage & Performance',
        short_desc: 'Professional live performers, acoustic bands, dynamic DJs, hosts & master of ceremonies.',
        full_desc: 'Complete entertainment directing with seasoned acoustic duos, high-energy party DJs, bilingual hosts, and engaging floor performers tailored to your event schedule.',
        price: 15000,
        featured_image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80',
        icon_name: 'Music',
        features: JSON.stringify(['Bilingual Host / Emcee', 'Live Acoustic Duo or Trio', 'Club DJ with Custom Setlist', 'Wireless UHF Microphones']),
        inclusions: JSON.stringify(['Soundcheck Rehearsal Attendance', 'Custom Program Scripting', 'Performer Stage Hospitality Coordination']),
        is_active: true
      },
      {
        id: 2,
        name: 'Gourmet Catering & Dining',
        category: 'Food & Beverage',
        short_desc: 'Buffet setups, plated degustations, signature cocktail bars, and grazing tables.',
        full_desc: 'Multi-course culinary journeys featuring international and modern Filipino cuisine, elegant buffet station styling, beverage fountains, and banquet service staff.',
        price: 35000,
        featured_image: 'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=800&q=80',
        icon_name: 'Utensils',
        features: JSON.stringify(['5-Course Gourmet Buffet or Plated', 'Signature Welcome Mocktail / Cocktail Bar', 'Artisanal Charcuterie Grazing Table', 'Porcelain Chinaware & Fine Cutlery']),
        inclusions: JSON.stringify(['Uniformed Service Waiters & Captain', 'Food Tasting for 2 Pax', 'Full Banquet Table Setting & Linens']),
        is_active: true
      },
      {
        id: 3,
        name: 'Event Styling & Floral Decoration',
        category: 'Styling & Ambience',
        short_desc: 'Thematic balloon styling, lush floral arrangements, backdrop design, and entrance tunnels.',
        full_desc: 'Customized thematic venue transformation with ceiling drapes, lighted entrance tunnels, luxury floral centerpieces, stage backdrop architecture, and mood lighting accents.',
        price: 20000,
        featured_image: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80',
        icon_name: 'Palette',
        features: JSON.stringify(['3D Thematic Stage Backdrop', 'Grand Floral Centerpieces on All Guest Tables', 'Illuminated VIP Entrance Tunnel', 'Ceiling Drapes & Hanging Installations']),
        inclusions: JSON.stringify(['Custom 3D Rendered Moodboard', 'Full Setup & Teardown Crew', 'Fresh Imported Blooms and Lush Greenery']),
        is_active: true
      },
      {
        id: 4,
        name: '360 Glam Photo & Video Booth',
        category: 'Guest Experience',
        short_desc: '360 Glam video spinners, magnetic instant prints, custom templates, and fun props.',
        full_desc: 'High-speed 360 rotating camera platform recording slow-motion video reels with instant QR code sharing, paired with magnetic strip photo prints customized with event branding.',
        price: 8500,
        featured_image: 'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&w=800&q=80',
        icon_name: 'Camera',
        features: JSON.stringify(['360 Motorized Video Spinner Platform', '4-Hour Unlimited Magnetic 4R Photo Prints', 'Instant AirDrop, QR Code & iPad Kiosks', 'Fun Thematic Handheld Props & Signs']),
        inclusions: JSON.stringify(['2 Friendly On-Site Operators', 'Customized Graphic Overlay & Soundtrack', 'Complete Online Google Drive Gallery Access']),
        is_active: true
      },
      {
        id: 5,
        name: 'Photography & Cinematography Coverage',
        category: 'Media & Coverage',
        short_desc: 'Cinematic Same-Day-Edit (SDE) videos, drone aerials, and high-resolution photo coverage.',
        full_desc: 'Full-day creative media coverage using 4K cinema cameras, wireless audio recording, 4K drone cinematography, same-day-edit video highlights, and magazine-quality photo editing.',
        price: 28000,
        featured_image: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=800&q=80',
        icon_name: 'Video',
        features: JSON.stringify(['4K Same-Day-Edit (SDE) Video Teaser', 'Licensed 4K Aerial Drone Coverage', '2 Master Photographers + 2 Videographers', 'Online Cloud Gallery + USB Presentation Box']),
        inclusions: JSON.stringify(['Full Day Pre-Event to Reception Coverage', 'Color-Graded High-Res Photo Edits', 'Raw Footage & Master Cut USB Vault']),
        is_active: true
      },
      {
        id: 6,
        name: 'Event Furniture & Equipment Rentals',
        category: 'Equipment & Furniture',
        short_desc: 'Ghost chairs, Tiffany chairs, cocktail tables, mobile air-conditioning, tents, and LED walls.',
        full_desc: 'Premium furniture and venue infrastructure support including crystal ghost Dior chairs, gold Tiffany chairs, illuminated cocktail bars, heavy-duty outdoor marquee tents, and high-capacity portable cooling.',
        price: 12000,
        featured_image: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=800&q=80',
        icon_name: 'Armchair',
        features: JSON.stringify(['Crystal Ghost & Gold Tiffany Chairs', 'High-Peak Modular Weatherproof Tents', 'High-BTU Industrial Mobile Spot Coolers', 'Cocktail High-Tables with Spandex Covers']),
        inclusions: JSON.stringify(['Delivery, Ingress Setup & Egress Cleanup', 'Protective Floor Coverings', 'On-Standby Logistics Team']),
        is_active: true
      },
      {
        id: 7,
        name: 'Stage Production, Audio & Lighting Rigging',
        category: 'Technical & Staging',
        short_desc: 'High-definition P3 LED walls, intelligent moving head beams, digital audio mixing, and special FX.',
        full_desc: 'Concert-grade staging and technical engineering featuring 3m x 2m P3 HD LED screens, 10,000W active line array sound systems, computerized moving heads, hazers, and indoor cold spark pyrotechnic simulators.',
        price: 40000,
        featured_image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80',
        icon_name: 'Tv',
        features: JSON.stringify(['P3 High-Definition Indoor/Outdoor LED Display', '10,000W Dual Line Array Audio Rig', 'DMX Beam 230W Moving Heads & Followspots', 'Indoor Safe Cold Spark FX & Smoke Flares']),
        inclusions: JSON.stringify(['Certified Sound & Lighting Engineers', 'Heavy-Duty Power Distribution Rigging', 'Live Video Switcher & Scaler Unit']),
        is_active: true
      }
    ];

    for (const s of defaultServices) {
      await client.query(`
        UPDATE services 
        SET name = $1, category = $2, short_desc = $3, full_desc = $4, description = $3, price = $5, featured_image = $6, icon_name = $7, features = $8, inclusions = $9, is_active = $10, updated_at = NOW()
        WHERE id = $11
      `, [
        s.name, s.category, s.short_desc, s.full_desc, s.price, s.featured_image, s.icon_name, s.features, s.inclusions, s.is_active, s.id
      ]);
    }
    console.log('✅ Services updated with clean metadata!');

    // 2. Update Packages
    const defaultPackages = [
      {
        id: 1,
        name: 'Birthday & Milestone Celebration Package',
        tagline: 'Vibrant, stress-free birthday milestones, sweet 16s, and debut parties.',
        capacity: '50 - 150 Guests',
        price: 35000,
        original_price: 45000,
        is_popular: false,
        is_active: true,
        ideal_for: 'Birthdays, Anniversaries & Debut Celebrations',
        inclusions: JSON.stringify([
          'Thematic Stage Backdrop & Balloons',
          'Professional Emcee & DJ Sound System',
          '3-Hour Instant Photo Booth with Props',
          'On-Day Event Coordinator (2 staff)'
        ]),
        features: JSON.stringify(['Digital Run-of-Show Flow', 'Online Inquiry & RSVP Tracking', 'Soundcheck Coordination']),
        services_included: JSON.stringify(['entertainment', 'event-decoration', 'photo-booth'])
      },
      {
        id: 2,
        name: 'Grand Wedding & Matrimonial Package',
        tagline: 'All-inclusive dream wedding production, ceremony directing, and reception management.',
        capacity: '150 - 300 Guests',
        price: 85000,
        original_price: 105000,
        is_popular: true,
        is_active: true,
        ideal_for: 'Weddings, Receptions & Renewal of Vows',
        inclusions: JSON.stringify([
          'Full Stage Styling, Floral Arch & VIP Tables',
          'Same-Day-Edit (SDE) Photo & Video Team',
          'P3 HD LED Wall & Line Array Audio Setup',
          'Lead Director + 4 On-Day Wedding Coordinators'
        ]),
        features: JSON.stringify(['Custom 3D Moodboard Approval', 'Rehearsal Directing & Script', 'Itemized Budget Tracking']),
        services_included: JSON.stringify(['entertainment', 'event-decoration', 'photo-video', 'event-production'])
      },
      {
        id: 3,
        name: 'Corporate Gala & Product Launch Package',
        tagline: 'Polished technical production and executive branding for corporate assemblies.',
        capacity: '200 - 500 Guests',
        price: 65000,
        original_price: 80000,
        is_popular: false,
        is_active: true,
        ideal_for: 'Corporate Galas, Award Nights & Product Launches',
        inclusions: JSON.stringify([
          'Dual P3 High-Definition LED Display Panels',
          'Intelligent Lighting Rig & Podium Followspots',
          'Bilingual Corporate Moderator / Host',
          'Technical Operations Manager + Stage Crew'
        ]),
        features: JSON.stringify(['VIP Protocol Briefing', 'Digital Presentation Switching', 'Live Streaming Broadcast Support']),
        services_included: JSON.stringify(['entertainment', 'event-production', 'photo-video'])
      },
      {
        id: 4,
        name: 'All-In Milestone Celebrations Package',
        tagline: 'Customized luxury packages for golden anniversaries, reunions, and family galas.',
        capacity: '100 - 250 Guests',
        price: 50000,
        original_price: 60000,
        is_popular: false,
        is_active: true,
        ideal_for: 'Golden Anniversaries, Grand Reunions & Baptisms',
        inclusions: JSON.stringify([
          'Lush Botanical Floral Centerpieces',
          'Acoustic Live Music Duo & Sound System',
          '360 Video Spinner + Instant Photo Prints',
          'Event Directing & Dedicated Host'
        ]),
        features: JSON.stringify(['Family Timeline Video Presentation', 'Custom Souvenir Favors', 'Table Placement Management']),
        services_included: JSON.stringify(['entertainment', 'event-decoration', 'photo-booth'])
      }
    ];

    for (const p of defaultPackages) {
      await client.query(`
        UPDATE packages 
        SET name = $1, tagline = $2, description = $2, capacity = $3, price = $4, original_price = $5, is_popular = $6, is_active = $7, ideal_for = $8, inclusions = $9, features = $10, services_included = $11, updated_at = NOW()
        WHERE id = $12
      `, [
        p.name, p.tagline, p.capacity, p.price, p.original_price, p.is_popular, p.is_active, p.ideal_for, p.inclusions, p.features, p.services_included, p.id
      ]);
    }
    console.log('✅ Packages updated with clean metadata!');

  } catch (err) {
    console.error('Error updating clean seed data:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

cleanSeedData();
