# JAD EVENTS — COMPLETE SYSTEM TECHNICAL AUDIT & SECURITY REVIEW

**Audit Execution Mode**: READ-ONLY / EVIDENCE-BASED  
**Application Target**: JAD Events Reservation, Inventory & Transaction Management System  
**Codebase Path**: `c:\Users\user\capstonev1`  
**Framework Environment**: Next.js 16.2.11 (Turbopack, App Router) | React 19.2.4 | Prisma ORM 7.9.0 | PostgreSQL  
**Audit Date**: September 13, 2026  

---

## 1. Executive Summary

JAD Events is a full-stack, web-based reservation, event scheduling, equipment resource allocation, and manual transaction management system. It supports three distinct operational roles: **Customer**, **Staff**, and **Administrator**. 

The system strictly adheres to an inquiry-driven, quotation-governed, manual-verification business workflow without third-party payment gateways, automated machine learning, or decision-support scoring (DSS).

### Audited Core Workflow
```
Customer Registration / Login
       ↓
Browse Services & Packages
       ↓
Submit Event Inquiry
       ↓
Admin Review & Validation
       ↓
Create Quotation (Itemized Snapshots, Subtotal, Discount, Charges)
       ↓
Customer Review Quotation
       ↓
Customer Accepts Quotation
       ↓
Customer Uploads Manual Payment Proof (Pending Verification)
       ↓
Admin Reviews & Verifies / Rejects Payment (Verified Contributes to Balance)
       ↓
Booking Conversion (Serialized via PostgreSQL Transaction Advisory Lock)
       ↓
Event Preparation & Staff / Resource Assignment
       ↓
Event Execution
       ↓
Record Event Completion (booking.status = 'Completed')
       ↓
Customer Feedback / Evaluation (Strictly Eligible, Ownership-Verified, Non-Duplicate)
       ↓
Admin Reports & Operational Audits
```

---

## 2. Current Technology Stack

| Layer | Audited Technology | Specification / Package Version | Evidence |
| :--- | :--- | :--- | :--- |
| **Framework** | Next.js App Router | `16.2.11` | [`package.json`](file:///c:/Users/user/capstonev1/package.json#L31) |
| **UI Library** | React | `19.2.4` | [`package.json`](file:///c:/Users/user/capstonev1/package.json#L33) |
| **Styling** | Tailwind CSS | `^4.0.0` with `@tailwindcss/postcss` | [`package.json`](file:///c:/Users/user/capstonev1/package.json#L47) |
| **Icons** | Lucide React | `^1.16.0` | [`package.json`](file:///c:/Users/user/capstonev1/package.json#L30) |
| **Language** | TypeScript | `^5.0.0` | [`package.json`](file:///c:/Users/user/capstonev1/package.json#L49) |
| **Database ORM** | Prisma Client & CLI | `^7.9.0` with `@prisma/adapter-pg` | [`package.json`](file:///c:/Users/user/capstonev1/package.json#L28) |
| **Database Engine** | PostgreSQL | `pg ^8.22.0` | [`package.json`](file:///c:/Users/user/capstonev1/package.json#L32) |
| **Authentication** | JWT + bcryptjs | `jsonwebtoken ^9.0.3`, `bcryptjs ^3.0.3` | [`package.json`](file:///c:/Users/user/capstonev1/package.json#L26-L29) |
| **Email Delivery** | Nodemailer | `^10.0.1` (SMTP with live Ethereal fallback) | [`package.json`](file:///c:/Users/user/capstonev1/package.json#L32) |
| **File Storage** | Local Disk Storage | Multipart FormData to `public/uploads/payments/` | [`app/api/payments/upload/route.ts`](file:///c:/Users/user/capstonev1/app/api/payments/upload/route.ts#L48) |

---

## 3. System Architecture & Component Trace

```
Client Tier (Browser / React 19 Client Components)
  │
  ├── Customer Views: app/(dashboard)/customer/page.tsx, components/jad/customer/*
  ├── Admin Views:    app/(dashboard)/admin/page.tsx, components/jad/admin/*
  └── Public Views:   app/page.tsx, app/(auth)/login/page.tsx, reset-password/page.tsx
       │
       ▼
Routing & Edge Proxy (Next.js proxy.ts)
  │
  ▼
API Routing Tier (app/api/*)
  │
  ├── Authentication & Validation: lib/auth.ts (checkAuth), lib/validation.ts (Zod)
  ├── Rate Limiting: lib/rateLimit.ts (In-memory token bucket)
  └── Domain Services / Models:
        ├── models/bookingModel.ts
        ├── models/paymentModel.ts
        ├── models/quotationModel.ts
        ├── models/feedbackModel.ts
        ├── models/passwordResetModel.ts
        └── lib/schedulingEngine.ts
              │
              ▼
Data Access Tier (lib/prisma.ts)
  │
  ├── PrismaClient Singleton
  └── PostgreSQL Database (tables with constraints, indexes, and pg_advisory_xact_lock)
```

---

## 4. Module-by-Module Technical Audit

### Module 1: Authentication & Session Management
- **Implementation Status**: `⚠️ PARTIALLY IMPLEMENTED`
- **Files**: [`app/api/auth/login/route.ts`](file:///c:/Users/user/capstonev1/app/api/auth/login/route.ts), [`app/api/auth/register/route.ts`](file:///c:/Users/user/capstonev1/app/api/auth/register/route.ts), [`app/api/auth/logout/route.ts`](file:///c:/Users/user/capstonev1/app/api/auth/logout/route.ts), [`lib/auth.ts`](file:///c:/Users/user/capstonev1/lib/auth.ts).
- **Password Hashing**: `bcryptjs.hash(password, 10)` in `register/route.ts` and `models/userModel.ts`.
- **JWT Generation**: `jwt.sign({ id, email, role, name }, JWT_SECRET, { expiresIn: '7d' })`.
- **Session Transmission**: Double cookies (`token` and `jad_token`) plus JSON response payload.
- **Audited Vulnerabilities**:
  1. **Missing `httpOnly` Flag**: In [`login/route.ts#L64-L81`](file:///c:/Users/user/capstonev1/app/api/auth/login/route.ts#L64-L81) and [`register/route.ts#L63-L80`](file:///c:/Users/user/capstonev1/app/api/auth/register/route.ts#L63-L80), cookies are issued with `httpOnly: false`. This exposes active JWT sessions to XSS theft via `document.cookie`.
  2. **Hardcoded Fallback Secret**: [`lib/auth.ts#L9`](file:///c:/Users/user/capstonev1/lib/auth.ts#L9) and [`login/route.ts#L10`](file:///c:/Users/user/capstonev1/app/api/auth/login/route.ts#L10) fall back to `'secret123'` if `process.env.JWT_SECRET` is unset.
  3. **Missing Login Rate Limiting**: `/api/auth/login` and `/api/auth/register` do not invoke `checkRateLimit`, enabling brute-force password guessing.

---

### Module 2: Password Recovery & Email System
- **Implementation Status**: `✅ IMPLEMENTED`
- **Files**: [`models/passwordResetModel.ts`](file:///c:/Users/user/capstonev1/models/passwordResetModel.ts), [`lib/emailService.ts`](file:///c:/Users/user/capstonev1/lib/emailService.ts), [`app/api/auth/forgot-password/route.ts`](file:///c:/Users/user/capstonev1/app/api/auth/forgot-password/route.ts), [`app/api/auth/reset-password/route.ts`](file:///c:/Users/user/capstonev1/app/api/auth/reset-password/route.ts).
- **Token Generation & Cryptography**: Uses `crypto.randomBytes(32).toString('hex')`. Stored in DB as SHA-256 hash (`crypto.createHash('sha256').update(rawToken).digest('hex')`).
- **Token Expiry**: Hardcoded 30-minute validity (`Date.now() + 30 * 60 * 1000`).
- **Single-Use Enforcement**: Enforced inside `prisma.$transaction`. Token is deleted upon successful password update ([`passwordResetModel.ts#L121`](file:///c:/Users/user/capstonev1/models/passwordResetModel.ts#L121)).
- **Rate Limiting**: Enforced via `checkRateLimit(ip, 5, 15 * 60 * 1000)` and email-based rate limit of 3 requests per 15 minutes.
- **Anti-Enumeration**: `/api/auth/forgot-password` returns generic HTTP 200 message regardless of whether the email exists.
- **Email Delivery**: `nodemailer.createTransport` checks `SMTP_USER` and `SMTP_PASS`. When unconfigured in development, it automatically provisions an ephemeral Ethereal test account and logs the preview URL.

---

### Module 3: Authorization, RBAC & Route Protection
- **Implementation Status**: `⚠️ PARTIALLY IMPLEMENTED`
- **Roles in Database**: `Customer`, `Staff`, `Administrator` ([`prisma/schema.prisma#L14`](file:///c:/Users/user/capstonev1/prisma/schema.prisma#L14)).
- **Server-Side API Guard**: `checkAuth(req, requireAdmin)` in [`lib/auth.ts`](file:///c:/Users/user/capstonev1/lib/auth.ts#L36). Correctly inspects `user.role === 'Administrator'`.
- **Audited Vulnerabilities**:
  1. **Proxy Role Bypass**: [`proxy.ts#L22-L29`](file:///c:/Users/user/capstonev1/proxy.ts#L22-L29) only checks `if (!token) return NextResponse.redirect(new URL('/login', request.url))` for `/admin/*` routes. It does NOT decode or verify the user's role. A logged-in `Customer` can access the `/admin` UI page shell. (Data fetching APIs remain blocked if protected by `checkAuth(req, true)`).
  2. **Unprotected Operational Endpoints**:
     - `GET /api/staff` ([`app/api/staff/route.ts#L10`](file:///c:/Users/user/capstonev1/app/api/staff/route.ts#L10)) has NO `checkAuth`. Any unauthenticated user can dump staff names, phones, roles, and assigned bookings.
     - `GET /api/equipment` ([`app/api/equipment/route.ts#L10`](file:///c:/Users/user/capstonev1/app/api/equipment/route.ts#L10)) has NO `checkAuth`. Exposes equipment inventory, quantities, and event bookings.

---

### Module 4: Customer Profile & IDOR Audit
- **Implementation Status**: `✅ IMPLEMENTED`
- **Files**: [`app/api/customers/profile/route.ts`](file:///c:/Users/user/capstonev1/app/api/customers/profile/route.ts).
- **IDOR Check**: `GET` and `PUT` strictly resolve the user identity from `authResult.user.id` extracted from the verified JWT.
- **Field Whitelisting**: `PUT /api/customers/profile` only allows updating `name` and `phone`. The client cannot manipulate `role`, `email`, or `id`.

---

### Module 5: Inquiry Management
- **Implementation Status**: `✅ IMPLEMENTED`
- **Files**: [`models/inquiryModel.ts`](file:///c:/Users/user/capstonev1/models/inquiryModel.ts), [`app/api/inquiries/route.ts`](file:///c:/Users/user/capstonev1/app/api/inquiries/route.ts), [`app/api/inquiries/[id]/route.ts`](file:///c:/Users/user/capstonev1/app/api/inquiries/[id]/route.ts).
- **Ownership Verification**: `GET /api/inquiries` checks `authResult.user.role`. If `Customer`, it enforces `where: { customerId: authResult.user.id }`.
- **Status Lifecycle**: `Pending` → `Reviewed` → `Quoted` → `Archived` / `Declined`.

---

### Module 6: Quotation Management & Financial Integrity
- **Implementation Status**: `✅ IMPLEMENTED`
- **Files**: [`models/quotationModel.ts`](file:///c:/Users/user/capstonev1/models/quotationModel.ts), [`app/api/quotations/route.ts`](file:///c:/Users/user/capstonev1/app/api/quotations/route.ts), [`app/api/quotations/[id]/accept/route.ts`](file:///c:/Users/user/capstonev1/app/api/quotations/[id]/accept/route.ts).
- **Server-Side Financial Computation**:
  $$\text{Subtotal} = \sum (\text{item.quantity} \times \text{item.unitPrice})$$
  $$\text{Grand Total} = \max(0, \text{Subtotal} + \text{AdditionalCharges} - \text{Discounts})$$
  Enforced in [`models/quotationModel.ts#L52-L61`](file:///c:/Users/user/capstonev1/models/quotationModel.ts#L52-L61).
- **Customer Acceptance Guard**: Customers can only update quotation status to `Accepted` via `/api/quotations/[id]/accept`. The endpoint verifies `quotation.inquiry.customerId === user.id` and rejects modifications if the quotation is expired (`validUntil < now`) or already processed.

---

### Module 7: Payment & Manual Transaction Verification
- **Implementation Status**: `✅ IMPLEMENTED`
- **Files**: [`models/paymentModel.ts`](file:///c:/Users/user/capstonev1/models/paymentModel.ts), [`app/api/payments/route.ts`](file:///c:/Users/user/capstonev1/app/api/payments/route.ts), [`app/api/payments/[id]/verify/route.ts`](file:///c:/Users/user/capstonev1/app/api/payments/[id]/verify/route.ts).
- **Business Rule**: No external payment gateway. Customer pays externally (e.g. bank transfer/GCash) and submits payment record with proof image.
- **Verification Integrity**:
  1. Only verified payments (`status === 'Verified'`) are credited toward the booking/quotation balance.
  2. `POST /api/payments/[id]/verify` enforces `checkAuth(req, true)` (Administrator only).
  3. `verifiedBy` is stamped directly from the authenticated admin's session ID (`authResult.user.id`), never from request body input.

---

### Module 8: Booking Conversion & Concurrency Protection
- **Implementation Status**: `✅ IMPLEMENTED`
- **Files**: [`models/bookingModel.ts`](file:///c:/Users/user/capstonev1/models/bookingModel.ts), [`app/api/bookings/convert-quotation/route.ts`](file:///c:/Users/user/capstonev1/app/api/bookings/convert-quotation/route.ts).
- **Transaction Safety**: Booking creation is executed inside `prisma.$transaction`.
- **PostgreSQL Advisory Lock**: To serialize simultaneous bookings on the same calendar date, [`bookingModel.ts#L43`](file:///c:/Users/user/capstonev1/models/bookingModel.ts#L43) executes:
  ```sql
  SELECT pg_advisory_xact_lock(hashtext('booking_date_' || $dateString))
  ```
- **Duplicate Prevention**: Re-checks if quotation has already been converted inside the transaction before inserting the booking record.

---

### Module 9: Event Scheduling & Conflict Detection
- **Implementation Status**: `✅ IMPLEMENTED`
- **Files**: [`lib/schedulingEngine.ts`](file:///c:/Users/user/capstonev1/lib/schedulingEngine.ts).
- **Authoritative Interval Collision Formula**:
  $$\text{Conflict} \iff \text{Start}_A < \text{End}_B \land \text{End}_A > \text{Start}_B$$
  Explicitly coded in [`lib/schedulingEngine.ts#L49`](file:///c:/Users/user/capstonev1/lib/schedulingEngine.ts#L49).
- **Conflict Scopes Tested**:
  1. **Venue Availability**: Identical venue name with overlapping active time intervals.
  2. **Staff Over-Allocation**: Validates that assigned staff members are not assigned to concurrent active bookings.
  3. **Equipment Resource Allocation**: Aggregates allocated equipment across overlapping bookings and verifies that $\sum \text{allocated} + \text{requested} \le \text{totalQuantity}$.

---

### Module 10: Customer Feedback & Evaluation
- **Implementation Status**: `✅ IMPLEMENTED`
- **Files**: [`models/feedbackModel.ts`](file:///c:/Users/user/capstonev1/models/feedbackModel.ts), [`app/api/customer/feedback/route.ts`](file:///c:/Users/user/capstonev1/app/api/customer/feedback/route.ts), [`app/api/admin/feedback/route.ts`](file:///c:/Users/user/capstonev1/app/api/admin/feedback/route.ts).
- **Security & Integrity Checks**:
  1. **Booking Completion Check**: Feedback is rejected with HTTP 400 unless `booking.status === 'Completed'` ([`feedbackModel.ts#L36`](file:///c:/Users/user/capstonev1/models/feedbackModel.ts#L36)).
  2. **Customer Ownership**: Validates that `booking.clientEmail === authUser.email` or `inquiry.customerId === authUser.id`.
  3. **Duplicate Prevention**: Database schema enforces unique constraint `@unique([bookingId])`. In addition, `feedbackModel.ts` queries for existing feedback before insert.
  4. **Rating Boundary**: Clamps/validates category ratings (quality, staff, timeliness, value) to integer range $[1, 5]$.

---

### Module 11: File Upload Security
- **Implementation Status**: `⚠️ PARTIALLY IMPLEMENTED`
- **Files**: [`app/api/payments/upload/route.ts`](file:///c:/Users/user/capstonev1/app/api/payments/upload/route.ts).
- **Validation Implemented**:
  - Max file size: 5MB ([`upload/route.ts#L22`](file:///c:/Users/user/capstonev1/app/api/payments/upload/route.ts#L22)).
  - MIME check: `image/jpeg`, `image/png`, `image/webp`.
  - Filename sanitization: `crypto.randomUUID()` + sanitized extension.
- **Audited Weaknesses**:
  1. Files are saved directly to `public/uploads/payments/`. Any unauthenticated user who guesses or discovers the URL can view sensitive banking payment slips.
  2. Magic bytes (file headers) are not checked; only MIME type and extension are validated.

---

## 5. Complete API Inventory & Security Audit

| Method | Endpoint | Purpose | Auth | Role | Ownership | Validation | Security Risk |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | User Registration | None | Any | N/A | Zod Schema | **MEDIUM** (No rate limit) |
| `POST` | `/api/auth/login` | User Login | None | Any | N/A | Email/Password | **HIGH** (No httpOnly on cookie, No rate limit) |
| `POST` | `/api/auth/logout` | Session Logout | None | Any | N/A | None | **LOW** |
| `POST` | `/api/auth/forgot-password` | Request Reset Token | None | Any | N/A | Email regex | **LOW** (Anti-enumeration & rate limit active) |
| `POST` | `/api/auth/reset-password` | Reset Password | None | Any | N/A | Token + Password | **LOW** (Single-use SHA-256 hash verified) |
| `GET` | `/api/customers/profile` | Get Own Profile | Yes | Customer/Any | Checked (`auth.user.id`) | None | **LOW** |
| `PUT` | `/api/customers/profile` | Update Profile | Yes | Customer/Any | Checked (`auth.user.id`) | Whitelist (name, phone) | **LOW** |
| `GET` | `/api/inquiries` | List Inquiries | Yes | Any | Filtered by Customer ID | Query params | **LOW** |
| `POST` | `/api/inquiries` | Create Inquiry | Yes | Customer | Attached to auth user | Zod Schema | **LOW** |
| `GET` | `/api/inquiries/[id]` | Get Inquiry Detail | Yes | Any | Verified ownership | ID param | **LOW** |
| `PATCH`| `/api/inquiries/[id]` | Update Status | Yes | Admin | Admin only | Status enum | **LOW** |
| `GET` | `/api/quotations` | List Quotations | Yes | Any | Filtered by Customer ID | None | **LOW** |
| `POST` | `/api/quotations` | Create Quotation | Yes | Admin | Admin only | Itemized calculation | **LOW** |
| `GET` | `/api/quotations/[id]` | Get Quotation | Yes | Any | Verified ownership | ID param | **LOW** |
| `POST` | `/api/quotations/[id]/accept`| Accept Quotation | Yes | Customer | Verified ownership | Status & expiry | **LOW** |
| `GET` | `/api/bookings` | List Bookings | Yes | Any | Filtered by Customer ID | Query params | **LOW** |
| `POST` | `/api/bookings/convert-quotation`| Convert Quotation to Booking | Yes | Any | Verified ownership | Advisory lock + Tx | **LOW** |
| `GET` | `/api/bookings/[id]` | Booking Details | Yes | Any | Verified ownership | ID param | **LOW** |
| `PATCH`| `/api/bookings/[id]` | Update Booking Status | Yes | Admin | Admin only | Status transition | **LOW** |
| `GET` | `/api/payments` | List Payments | Yes | Any | Filtered by Customer ID | Query params | **LOW** |
| `POST` | `/api/payments` | Submit Payment Record| Yes | Any | Attached to user's booking| Amount & proof URL | **LOW** |
| `POST` | `/api/payments/[id]/verify` | Verify / Reject Payment | Yes | Admin | Admin only | Status enum | **LOW** (Server sets `verifiedBy`) |
| `POST` | `/api/payments/upload` | Upload Payment Proof | Yes | Any | Auth required | 5MB size, image ext | **MEDIUM** (Stored in public folder) |
| `GET` | `/api/customer/feedback` | Get Customer Feedback| Yes | Customer | Verified ownership | Booking ID | **LOW** |
| `POST` | `/api/customer/feedback` | Submit Feedback | Yes | Customer | Verified completed booking | 1-5 rating range | **LOW** (One feedback per booking) |
| `GET` | `/api/admin/feedback` | List All Feedback | Yes | Admin | Admin only | Filter params | **LOW** |
| `GET` | `/api/staff` | List Staff Members | **No** | **None**| **None** | None | **MEDIUM** (Exposes staff contacts & assignments) |
| `POST` | `/api/staff` | Create Staff Member | Yes | Admin | Admin only | Name, role, contact | **LOW** |
| `GET` | `/api/equipment` | List Equipment | **No** | **None**| **None** | None | **MEDIUM** (Exposes inventory & allocations) |
| `POST` | `/api/equipment` | Create Equipment | Yes | Admin | Admin only | Name, quantity | **LOW** |
| `GET` | `/api/services` | List Public Services | None | Public | Public read | None | **INFO** |
| `POST` | `/api/services` | Create Service | Yes | Admin | Admin only | Price, category | **LOW** |
| `GET` | `/api/packages` | List Public Packages | None | Public | Public read | None | **INFO** |
| `POST` | `/api/packages` | Create Package | Yes | Admin | Admin only | Name, inclusions | **LOW** |
| `GET` | `/api/reports/analytics`| Financial & Event Reports | Yes | Admin | Admin only | Date ranges | **LOW** |

---

## 6. Database Schema & Integrity Review

All 16 models in [`prisma/schema.prisma`](file:///c:/Users/user/capstonev1/prisma/schema.prisma) were inspected:

1. **Singleton Instance**: Prisma client is instantiated as a singleton in [`lib/prisma.ts`](file:///c:/Users/user/capstonev1/lib/prisma.ts) using `globalForPrisma` caching to prevent connection exhaustion.
2. **Referential Integrity**: Foreign keys (`onDelete: Cascade` / `onDelete: Restrict`) are defined across `Inquiry`, `Quotation`, `Booking`, `PaymentTransaction`, and `Feedback`.
3. **Audit Trails**: Created/Updated timestamps exist across all business tables.
4. **Unique Constraints**:
   - `User(email)`
   - `Feedback(bookingId)` (strictly prevents duplicate feedback)
   - `PasswordResetToken(token)`
   - `EventSchedule(bookingId)`

---

## 7. Security Risk Classification

### High Severity

#### [HIGH-01] Authentication Cookies Lack `httpOnly` Flag
- **File**: [`app/api/auth/login/route.ts#L64-L81`](file:///c:/Users/user/capstonev1/app/api/auth/login/route.ts#L64-L81), [`app/api/auth/register/route.ts#L63-L80`](file:///c:/Users/user/capstonev1/app/api/auth/register/route.ts#L63-L80)
- **Problem**: Cookies `token` and `jad_token` are set with `httpOnly: false`.
- **Impact**: Any cross-site scripting (XSS) vulnerability would allow an attacker to steal active JWT tokens directly via `document.cookie`.
- **Mitigation**: Update cookie options to `{ httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' }`.

#### [HIGH-02] Admin Route Protection in `proxy.ts` Does Not Check Role
- **File**: [`proxy.ts#L22-L29`](file:///c:/Users/user/capstonev1/proxy.ts#L22-L29)
- **Problem**: Edge proxy verifies token existence (`if (!token)`) but does not decode or inspect `user.role === 'Administrator'`.
- **Impact**: A standard customer with a valid token can navigate to `/admin` and view the administrative frontend page shell.
- **Mitigation**: Verify the JWT in `proxy.ts` or add role-checking guards in the root admin layout (`app/(dashboard)/admin/layout.tsx`).

---

### Medium Severity

#### [MED-01] Hardcoded JWT Secret Fallback
- **File**: [`lib/auth.ts#L9`](file:///c:/Users/user/capstonev1/lib/auth.ts#L9), [`app/api/auth/login/route.ts#L10`](file:///c:/Users/user/capstonev1/app/api/auth/login/route.ts#L10)
- **Problem**: Code contains `const JWT_SECRET = process.env.JWT_SECRET || 'secret123'`.
- **Impact**: If `.env` is unconfigured, tokens are signed with a well-known dictionary secret, allowing signature forgery.
- **Mitigation**: Throw a fatal server startup error if `process.env.JWT_SECRET` is missing.

#### [MED-02] Unauthenticated Read Access on Sensitive Operations
- **File**: [`app/api/staff/route.ts#L10`](file:///c:/Users/user/capstonev1/app/api/staff/route.ts#L10), [`app/api/equipment/route.ts#L10`](file:///c:/Users/user/capstonev1/app/api/equipment/route.ts#L10)
- **Problem**: `GET` endpoints do not call `checkAuth`.
- **Impact**: Unauthenticated scrapers can obtain employee rosters, phone numbers, and equipment utilization.
- **Mitigation**: Add `checkAuth(req, true)` to enforce Administrator authentication.

#### [MED-03] Public Directory Exposure of Payment Proofs
- **File**: [`app/api/payments/upload/route.ts#L48`](file:///c:/Users/user/capstonev1/app/api/payments/upload/route.ts#L48)
- **Problem**: Files are written to `public/uploads/payments/`.
- **Impact**: Payment slips containing customer bank account numbers are publicly accessible if URLs are enumerated or intercepted.
- **Mitigation**: Store files in an out-of-webroot directory (`storage/payments/`) and serve them via an authorized streaming route (`/api/payments/[id]/proof`).

---

## 8. Implemented vs. Missing Feature Matrix

| Feature Module | Status | Verification Evidence |
| :--- | :--- | :--- |
| **Customer Registration & Login** | `✅ IMPLEMENTED` | [`app/api/auth/login/route.ts`](file:///c:/Users/user/capstonev1/app/api/auth/login/route.ts), [`register/route.ts`](file:///c:/Users/user/capstonev1/app/api/auth/register/route.ts) |
| **Password Recovery with SMTP** | `✅ IMPLEMENTED` | [`models/passwordResetModel.ts`](file:///c:/Users/user/capstonev1/models/passwordResetModel.ts), [`lib/emailService.ts`](file:///c:/Users/user/capstonev1/lib/emailService.ts) |
| **Customer Inquiries** | `✅ IMPLEMENTED` | [`models/inquiryModel.ts`](file:///c:/Users/user/capstonev1/models/inquiryModel.ts), [`app/api/inquiries/route.ts`](file:///c:/Users/user/capstonev1/app/api/inquiries/route.ts) |
| **Quotation Generation & Acceptance** | `✅ IMPLEMENTED` | [`models/quotationModel.ts`](file:///c:/Users/user/capstonev1/models/quotationModel.ts), [`app/api/quotations/[id]/accept/route.ts`](file:///c:/Users/user/capstonev1/app/api/quotations/[id]/accept/route.ts) |
| **Manual Payment Verification** | `✅ IMPLEMENTED` | [`models/paymentModel.ts`](file:///c:/Users/user/capstonev1/models/paymentModel.ts), [`app/api/payments/[id]/verify/route.ts`](file:///c:/Users/user/capstonev1/app/api/payments/[id]/verify/route.ts) |
| **Booking Conversion** | `✅ IMPLEMENTED` | [`models/bookingModel.ts`](file:///c:/Users/user/capstonev1/models/bookingModel.ts), [`app/api/bookings/convert-quotation/route.ts`](file:///c:/Users/user/capstonev1/app/api/bookings/convert-quotation/route.ts) |
| **Scheduling Conflict Detection** | `✅ IMPLEMENTED` | [`lib/schedulingEngine.ts`](file:///c:/Users/user/capstonev1/lib/schedulingEngine.ts) ($S_A < E_B \land E_A > S_B$) |
| **Equipment Over-Allocation Guard** | `✅ IMPLEMENTED` | [`lib/schedulingEngine.ts#L104`](file:///c:/Users/user/capstonev1/lib/schedulingEngine.ts#L104) |
| **Customer Feedback & Evaluation** | `✅ IMPLEMENTED` | [`models/feedbackModel.ts`](file:///c:/Users/user/capstonev1/models/feedbackModel.ts), [`app/api/customer/feedback/route.ts`](file:///c:/Users/user/capstonev1/app/api/customer/feedback/route.ts) |
| **Admin Reports & Analytics** | `✅ IMPLEMENTED` | [`app/api/reports/analytics/route.ts`](file:///c:/Users/user/capstonev1/app/api/reports/analytics/route.ts) |
| **HTTP Security Headers** | `❌ NOT IMPLEMENTED` | [`next.config.ts`](file:///c:/Users/user/capstonev1/next.config.ts) contains empty config object |
| **Automated Reservation Auto-Release** | `❌ NOT IMPLEMENTED` | No cron job or background worker for unconfirmed booking expiration |
| **DSS / AI Recommendations** | `❌ NOT IMPLEMENTED` | Strictly absent in accordance with project boundaries |

---

## 9. Capstone Defense Guide & Technical Q&A

### Architectural Defense Summary
JAD Events is built as a deterministic, multi-tier web application. It enforces strict business workflows through database-level transactional guarantees and server-side authorization checks. Rather than using third-party payment gateways or black-box heuristic algorithms, all quotation totals, payment verifications, and resource allocations are computed using transparent, verifiable business logic.

### Defending the System

#### Q1: "What algorithm is used for schedule conflict detection?"
**Answer**:  
The system uses the standard interval overlap condition:
$$\text{Start}_A < \text{End}_B \quad\text{and}\quad \text{End}_A > \text{Start}_B$$
Implemented in [`lib/schedulingEngine.ts`](file:///c:/Users/user/capstonev1/lib/schedulingEngine.ts#L49), it compares the candidate event's start and end timestamps against all non-cancelled bookings.

#### Q2: "How does the system prevent concurrent bookings for the same date?"
**Answer**:  
In [`models/bookingModel.ts#L43`](file:///c:/Users/user/capstonev1/models/bookingModel.ts#L43), the booking conversion logic runs inside a Prisma interactive transaction that acquires a PostgreSQL transaction-level advisory lock:
```typescript
await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'booking_date_' + eventDateStr}))`;
```
This forces concurrent booking requests on the same date to queue sequentially, preventing race conditions.

#### Q3: "How is payment verification secured against client-side tampering?"
**Answer**:  
In [`app/api/payments/[id]/verify/route.ts`](file:///c:/Users/user/capstonev1/app/api/payments/[id]/verify/route.ts), only authenticated users with the `Administrator` role can call the verification endpoint. The verified status and `verifiedBy` fields cannot be supplied by the customer; `verifiedBy` is set server-side directly from the admin's verified JWT token (`authResult.user.id`). Furthermore, remaining balance calculations only sum payments with `status === 'Verified'`.

#### Q4: "How does customer feedback ensure that only eligible customers can submit?"
**Answer**:  
In [`models/feedbackModel.ts#L36`](file:///c:/Users/user/capstonev1/models/feedbackModel.ts#L36), the system performs three checks:
1. The target booking must have `status === 'Completed'`.
2. The authenticated customer's email or ID must match the booking's client email or inquiry customer ID.
3. The database model enforces `@unique([bookingId])`, preventing duplicate reviews for the same event.

#### Q5: "How does the forgot password feature protect against token leakage and abuse?"
**Answer**:  
In [`models/passwordResetModel.ts`](file:///c:/Users/user/capstonev1/models/passwordResetModel.ts), the system creates a 32-byte cryptographic random token. Only its SHA-256 hash is stored in the database. The token expires after 30 minutes, is single-use (deleted inside a database transaction upon reset), and requests are rate-limited per IP and email address.

---

## 10. Top 10 High-Priority Technical Recommendations

1. **[P0] Enforce `httpOnly: true` on Authentication Cookies**
   - **Current Issue**: `app/api/auth/login/route.ts` sets `httpOnly: false`.
   - **Evidence**: [`login/route.ts#L70`](file:///c:/Users/user/capstonev1/app/api/auth/login/route.ts#L70).
   - **Risk**: Active sessions are readable via JavaScript, exposing users to credential theft under XSS.
   - **Recommended Solution**: Set `httpOnly: true` on both `token` and `jad_token` cookies.
   - **Expected Benefit**: Mitigates cookie-theft XSS attack vectors.

2. **[P0] Enforce Role Verification in Admin Route Guard**
   - **Current Issue**: `proxy.ts` only checks if a token exists before allowing access to `/admin`.
   - **Evidence**: [`proxy.ts#L22`](file:///c:/Users/user/capstonev1/proxy.ts#L22).
   - **Risk**: Authenticated Customers can view the admin dashboard layout shell.
   - **Recommended Solution**: Verify that `user.role === 'Administrator'` in `proxy.ts` or within `app/(dashboard)/admin/layout.tsx`.
   - **Expected Benefit**: Complete defense-in-depth against unauthorized navigation.

3. **[P1] Eliminate Hardcoded JWT Secret Fallback**
   - **Current Issue**: `lib/auth.ts` falls back to `'secret123'` if `process.env.JWT_SECRET` is undefined.
   - **Evidence**: [`lib/auth.ts#L9`](file:///c:/Users/user/capstonev1/lib/auth.ts#L9).
   - **Risk**: Defaulting to a known secret allows attackers to forge valid JWT tokens.
   - **Recommended Solution**: Throw a descriptive error during server initialization if `JWT_SECRET` is missing.
   - **Expected Benefit**: Eliminates forged session vulnerability in misconfigured environments.

4. **[P1] Protect Staff and Equipment Endpoints with `checkAuth`**
   - **Current Issue**: `GET /api/staff` and `GET /api/equipment` lack authentication checks.
   - **Evidence**: [`app/api/staff/route.ts#L10`](file:///c:/Users/user/capstonev1/app/api/staff/route.ts#L10), [`app/api/equipment/route.ts#L10`](file:///c:/Users/user/capstonev1/app/api/equipment/route.ts#L10).
   - **Risk**: Unauthenticated scraping of employee contacts, schedules, and inventory.
   - **Recommended Solution**: Wrap both endpoints with `await checkAuth(req, true)`.
   - **Expected Benefit**: Restricts internal operational data to verified administrators.

5. **[P1] Implement Rate Limiting on Authentication Endpoints**
   - **Current Issue**: `/api/auth/login` and `/api/auth/register` do not enforce rate limits.
   - **Evidence**: [`app/api/auth/login/route.ts`](file:///c:/Users/user/capstonev1/app/api/auth/login/route.ts).
   - **Risk**: Vulnerable to brute-force credential stuffing and denial of service.
   - **Recommended Solution**: Integrate `checkRateLimit(ip, 5, 60000)` into the login and registration routes.
   - **Expected Benefit**: Prevents automated password brute-force attacks.

6. **[P2] Relocate Payment Proofs Out of Public Web Directory**
   - **Current Issue**: Uploads are placed directly into `public/uploads/payments/`.
   - **Evidence**: [`app/api/payments/upload/route.ts#L48`](file:///c:/Users/user/capstonev1/app/api/payments/upload/route.ts#L48).
   - **Risk**: Customer payment slips containing bank account details are publicly accessible via direct URL.
   - **Recommended Solution**: Store files outside `public/` and serve them via an authorized streaming route (`/api/payments/[id]/proof`).
   - **Expected Benefit**: Protects sensitive financial documents under strict RBAC.

7. **[P2] Add Security Headers to `next.config.ts`**
   - **Current Issue**: `next.config.ts` has an empty configuration object.
   - **Evidence**: [`next.config.ts#L5`](file:///c:/Users/user/capstonev1/next.config.ts#L5).
   - **Risk**: Missing defense-in-depth against clickjacking, MIME sniffing, and insecure framing.
   - **Recommended Solution**: Add `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.
   - **Expected Benefit**: Improves browser security posture and audit compliance.

8. **[P2] Validate Magic Bytes on File Uploads**
   - **Current Issue**: Uploads are only validated against client-supplied MIME types and file extensions.
   - **Evidence**: [`app/api/payments/upload/route.ts#L27`](file:///c:/Users/user/capstonev1/app/api/payments/upload/route.ts#L27).
   - **Risk**: Renamed executables or polyglot files can bypass MIME validation.
   - **Recommended Solution**: Inspect the leading buffer bytes (e.g., `FF D8 FF` for JPEG, `89 50 4E 47` for PNG).
   - **Expected Benefit**: Verifies authentic image binary content before storage.

9. **[P3] Implement Automated Booking Auto-Release Worker**
   - **Current Issue**: Unconfirmed or expired quotations/reservations remain in the database indefinitely unless manually cancelled.
   - **Evidence**: Absence of scheduled cleanup tasks in codebase.
   - **Risk**: Tentatively reserved dates can remain blocked if admins do not manually update status.
   - **Recommended Solution**: Add a lightweight scheduled job or periodic query to transition expired reservations to `Cancelled`.
   - **Expected Benefit**: Automatically frees up event dates without manual intervention.

10. **[P3] Expand Automated Test Coverage**
    - **Current Issue**: Codebase currently lacks an end-to-end or integration test suite for critical business flows.
    - **Evidence**: No test scripts configured in [`package.json`](file:///c:/Users/user/capstonev1/package.json).
    - **Risk**: Regressions in conflict detection or financial balance calculations may go undetected during refactoring.
    - **Recommended Solution**: Add automated unit tests covering `lib/schedulingEngine.ts`, `models/quotationModel.ts`, and `models/feedbackModel.ts`.
    - **Expected Benefit**: Continuous regression testing for core business rules.
