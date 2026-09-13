const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'jad-events-secret-key-2026';
const BASE_URL = 'http://localhost:3000';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/jadevents',
});

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ [PASS ${passed + 1}] ${message}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    failed++;
  }
}

async function runSecuritySuite() {
  console.log('========================================================================');
  console.log('🔒 JAD EVENTS: ROLE-BASED ACCOUNT SECURITY & REGISTRATION HARDENING SUITE');
  console.log('   Testing Requirements A through K (Mandatory Security Tests)');
  console.log('========================================================================\n');

  try {
    const timestamp = Date.now();

    // Setup Existing Administrator Account
    const adminEmail = `director.admin.${timestamp}@jadevents.ph`;
    const adminInsert = await pool.query(
      "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role",
      ['System Administrator', adminEmail, '$2b$10$abcdefghijklmnopqrstuvwxyz123456', 'Administrator']
    );
    const adminUser = adminInsert.rows[0];
    const adminToken = jwt.sign(
      { id: adminUser.id, email: adminUser.email, role: 'Administrator' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Setup another customer for record isolation testing
    const otherCustEmail = `victim.customer.${timestamp}@example.com`;
    const otherCustInsert = await pool.query(
      "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role",
      ['Victim Customer', otherCustEmail, '$2b$10$abcdefghijklmnopqrstuvwxyz123456', 'Customer']
    );
    const victimUser = otherCustInsert.rows[0];

    // Create an inquiry owned by the victim customer
    const inqInsert = await pool.query(
      `INSERT INTO inquiries (tracking_id, user_id, client_name, client_email, event_type, event_date, event_venue, guests_count, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, tracking_id`,
      [`INQ-VICTIM-${timestamp}`, victimUser.id, victimUser.name, victimUser.email, 'Wedding Gala', '2027-05-15', 'Victim Venue', 150, 'Pending Review']
    );
    const victimInquiry = inqInsert.rows[0];

    // Create a dummy payment transaction for verification security test
    const payInsert = await pool.query(
      `INSERT INTO payment_transactions (payment_ref, receipt_number, client_name, client_email, type, amount, method, reference_number, date, status, verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id, payment_ref`,
      [`PAY-TEST-${timestamp}`, `REC-${timestamp}`, victimUser.name, victimUser.email, 'Downpayment', 50000, 'Bank Transfer', `REF-${timestamp}`, '2027-05-15', 'Pending Verification', false]
    );
    const testPayment = payInsert.rows[0];

    // =========================================================================
    // TEST A: Normal Customer Registration
    // =========================================================================
    console.log('\n--- TEST A: Normal Customer Registration ---');
    const custAEmail = `legit.cust.${timestamp}@example.com`;
    const regResA = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Legit Customer',
        email: custAEmail,
        password: 'Password123!',
        phone: '0917-123-4567',
      }),
    });
    const regDataA = await regResA.json();
    assert(regResA.status === 201, 'Test A1: Public registration endpoint returns 201 Created for normal customer');
    assert(regDataA.role === 'Customer', 'Test A2: Returned user role is strictly "Customer"');

    const dbUserA = (await pool.query('SELECT role FROM users WHERE email = $1', [custAEmail])).rows[0];
    assert(dbUserA && dbUserA.role === 'Customer', 'Test A3: Database persistence confirms role is strictly "Customer"');

    const custTokenA = regDataA.token;

    // =========================================================================
    // TEST B: Malicious Registration Payload: role = "ADMIN"
    // =========================================================================
    console.log('\n--- TEST B: Malicious Registration Payload (role = "ADMIN") ---');
    const attackerEmailB = `attacker.admin.${timestamp}@example.com`;
    const regResB = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Malicious Attacker B',
        email: attackerEmailB,
        password: 'AttackerPassword123!',
        role: 'ADMIN',
      }),
    });
    const regDataB = await regResB.json();
    assert(regResB.ok, 'Test B1: Registration processed without server crash');
    assert(regDataB.role === 'Customer', 'Test B2: Server ignored "ADMIN" role payload and returned "Customer"');

    const dbUserB = (await pool.query('SELECT role FROM users WHERE email = $1', [attackerEmailB])).rows[0];
    assert(dbUserB && dbUserB.role === 'Customer' && dbUserB.role !== 'ADMIN', 'Test B3: Database record confirms role is "Customer", NEVER "ADMIN"');

    // =========================================================================
    // TEST C: Malicious Registration Payload: role = "STAFF" & "Administrator"
    // =========================================================================
    console.log('\n--- TEST C: Malicious Registration Payload (role = "STAFF" & "Administrator") ---');
    const attackerEmailC1 = `attacker.staff.${timestamp}@example.com`;
    const regResC1 = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Malicious Attacker C1',
        email: attackerEmailC1,
        password: 'AttackerPassword123!',
        role: 'STAFF',
      }),
    });
    const regDataC1 = await regResC1.json();
    assert(regDataC1.role === 'Customer', 'Test C1: Server discarded "STAFF" payload and assigned "Customer"');
    const dbUserC1 = (await pool.query('SELECT role FROM users WHERE email = $1', [attackerEmailC1])).rows[0];
    assert(dbUserC1 && dbUserC1.role === 'Customer', 'Test C2: DB confirms role is "Customer", NEVER "STAFF"');

    const attackerEmailC2 = `attacker.administrator.${timestamp}@example.com`;
    const regResC2 = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Malicious Attacker C2',
        email: attackerEmailC2,
        password: 'AttackerPassword123!',
        role: 'Administrator',
      }),
    });
    const regDataC2 = await regResC2.json();
    assert(regDataC2.role === 'Customer', 'Test C3: Server discarded "Administrator" payload and assigned "Customer"');
    const dbUserC2 = (await pool.query('SELECT role FROM users WHERE email = $1', [attackerEmailC2])).rows[0];
    assert(dbUserC2 && dbUserC2.role === 'Customer', 'Test C4: DB confirms role is "Customer", NEVER "Administrator"');

    // =========================================================================
    // TEST D: Customer Attempts to Access Admin-Only Dashboard APIs
    // =========================================================================
    console.log('\n--- TEST D: Customer Accessing Admin-Only Endpoints ---');
    const adminApiRes = await fetch(`${BASE_URL}/api/inquiries`, {
      headers: { Authorization: `Bearer ${custTokenA}` },
    });
    assert(adminApiRes.status === 403, 'Test D1: Customer calling admin inquiries endpoint receives 403 Forbidden');

    const unauthApiRes = await fetch(`${BASE_URL}/api/inquiries`);
    assert(unauthApiRes.status === 401, 'Test D2: Unauthenticated request to admin endpoint receives 401 Unauthorized');

    // =========================================================================
    // TEST E: Customer Attempts to Call Admin-Only Account Creation API (POST /api/users)
    // =========================================================================
    console.log('\n--- TEST E: Customer Calling Admin Account Creation API ---');
    const custCreateRes = await fetch(`${BASE_URL}/api/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${custTokenA}`,
      },
      body: JSON.stringify({
        name: 'Exploit Admin',
        email: `exploit.${timestamp}@example.com`,
        password: 'ExploitPassword123!',
        role: 'Administrator',
      }),
    });
    assert(custCreateRes.status === 403, 'Test E1: Customer calling POST /api/users is rejected with 403 Forbidden');

    // =========================================================================
    // TEST F: Customer Attempts to Verify Payment
    // =========================================================================
    console.log('\n--- TEST F: Customer Calling Payment Verification Endpoint ---');
    const custVerifyRes = await fetch(`${BASE_URL}/api/payments/${testPayment.id}/verify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${custTokenA}` },
    });
    assert(custVerifyRes.status === 403, 'Test F1: Customer calling payment verify endpoint is rejected with 403 Forbidden');

    // =========================================================================
    // TEST G: Customer Attempts to Modify Payment Verification Status
    // =========================================================================
    console.log('\n--- TEST G: Customer Calling Payment Reject Endpoint ---');
    const custRejectRes = await fetch(`${BASE_URL}/api/payments/${testPayment.id}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${custTokenA}`,
      },
      body: JSON.stringify({ reason: 'Malicious rejection attempt' }),
    });
    assert(custRejectRes.status === 403, 'Test G1: Customer calling payment reject endpoint is rejected with 403 Forbidden');

    // =========================================================================
    // TEST H: Customer Attempts to Access Another Customer's Sensitive Records
    // =========================================================================
    console.log('\n--- TEST H: Cross-Customer Record Access Isolation ---');
    const custCrossAccessRes = await fetch(`${BASE_URL}/api/inquiries/${victimInquiry.id}`, {
      headers: { Authorization: `Bearer ${custTokenA}` },
    });
    assert(custCrossAccessRes.status === 403, 'Test H1: Customer accessing another customer\'s inquiry is rejected with 403 Forbidden');

    // =========================================================================
    // TEST I: Existing ADMIN Creates STAFF (POST /api/users)
    // =========================================================================
    console.log('\n--- TEST I: Administrator Provisioning STAFF Account ---');
    const staffEmail = `legit.staff.${timestamp}@jadevents.ph`;
    const adminStaffRes = await fetch(`${BASE_URL}/api/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Operations Stage Manager',
        email: staffEmail,
        password: 'StaffPassword2026!',
        role: 'Staff',
        phone: '0918-999-8888',
      }),
    });
    const adminStaffData = await adminStaffRes.json();
    assert(adminStaffRes.status === 201, 'Test I1: Administrator successfully provisions Staff account with 201 Created');
    assert(adminStaffData.user && adminStaffData.user.role === 'Staff', 'Test I2: Returned user has role "Staff"');

    const dbStaff = (await pool.query('SELECT role FROM users WHERE email = $1', [staffEmail])).rows[0];
    assert(dbStaff && dbStaff.role === 'Staff', 'Test I3: Database confirms user created with role "Staff"');

    // Generate JWT for newly created staff member to test Test K
    const staffToken = jwt.sign(
      { id: adminStaffData.user.id, email: staffEmail, role: 'Staff' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // =========================================================================
    // TEST J: Existing ADMIN Creates ADMIN (POST /api/users)
    // =========================================================================
    console.log('\n--- TEST J: Administrator Provisioning ADMINISTRATOR Account ---');
    const newAdminEmail = `deputy.director.${timestamp}@jadevents.ph`;
    const adminCreateAdminRes = await fetch(`${BASE_URL}/api/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Deputy Event Director',
        email: newAdminEmail,
        password: 'AdminPassword2026!',
        role: 'Administrator',
        phone: '0919-777-6666',
      }),
    });
    const adminCreateAdminData = await adminCreateAdminRes.json();
    assert(adminCreateAdminRes.status === 201, 'Test J1: Administrator successfully provisions another Administrator with 201 Created');
    assert(adminCreateAdminData.user && adminCreateAdminData.user.role === 'Administrator', 'Test J2: Returned user has role "Administrator"');

    const dbNewAdmin = (await pool.query('SELECT role FROM users WHERE email = $1', [newAdminEmail])).rows[0];
    assert(dbNewAdmin && dbNewAdmin.role === 'Administrator', 'Test J3: Database confirms new user role is "Administrator"');

    // =========================================================================
    // TEST K: STAFF Attempts to Create ADMIN/STAFF Accounts (POST /api/users)
    // =========================================================================
    console.log('\n--- TEST K: STAFF Attempting to Create Privileged Accounts ---');
    const staffAttemptRes = await fetch(`${BASE_URL}/api/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        name: 'Unauthorized Staff-Created Admin',
        email: `illegal.admin.${timestamp}@example.com`,
        password: 'IllegalPassword123!',
        role: 'Administrator',
      }),
    });
    assert(staffAttemptRes.status === 403, 'Test K1: Staff member attempting to call POST /api/users is rejected with 403 Forbidden');

    // Clean up temporary test payment and inquiry
    await pool.query('DELETE FROM payment_transactions WHERE id = $1', [testPayment.id]);
    await pool.query('DELETE FROM inquiries WHERE id = $1', [victimInquiry.id]);

    console.log('\n========================================================================');
    console.log(`🏁 SECURITY AUDIT SUMMARY: ${passed} Passed, ${failed} Failed`);
    console.log('========================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal error in security test suite:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runSecuritySuite();
