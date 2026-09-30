# VJSE Platform Technical Design Document

This document serves as the single source of truth for the VJSE platform architecture, database design, and key technical decisions. 

## 1. Project Overview

The VJSE (VJ Startups Ecosystem) platform is a centralized networking and mentorship hub designed to connect student startup founders with experienced industry professionals (leads/mentors). It solves the "cold outreach" problem by utilizing students as sourcers who refer professionals from their network, enabling warm, trusted introductions for founders.

### Core Users and Roles
- **Student (Sourcer)**: Submits details of industry professionals (leads) they know.
- **Volunteer**: Vets submitted leads, ensuring quality and relevance, and approves/rejects them.
- **Mentor (Lead)**: Industry professionals who have opted in to provide guidance.
- **Founder**: Student startup founders who browse the approved leads and request introductions.
- **Admin**: Platform administrators who manage user access, roles, and oversee platform activity.

### The Core User Journey
1. **Submission**: A Student submits a Lead's details.
2. **Review**: A Volunteer reviews the submission. If approved, an invitation email is sent to the Lead.
3. **Opt-in**: The Lead receives an email and clicks "Yes, I am in" to explicitly opt-in to the platform.
4. **Discovery**: A Founder browses the platform, finds the Lead's profile, and requests a warm introduction.
5. **Introduction**: The platform notifies the original Student sourcer to facilitate a warm introduction between the Founder and the Lead via email/WhatsApp.

---

## 2. Architecture Overview

### High-Level Architecture

```ascii
+-------------------+       HTTP/REST        +-------------------+
|                   |       (JSON)           |                   |
|   Frontend (UI)   | <--------------------> |   Backend (API)   |
|   Vite + React    |    Cookies (Session)   |  Express + Node   |
|                   |                        |                   |
+-------------------+                        +-------------------+
                                                       |
                                                       | Prisma ORM
                                                       v
+-------------------+                        +-------------------+
|                   |      SMTP (TLS)        |                   |
|   Email Service   | <--------------------- |    Database       |
|  Gmail + Nodemailer|                       | SQLite+SQLCipher  |
+-------------------+                        +-------------------+
```

### Technology Choices
- **Frontend**: Vite + React + Tailwind CSS. Chosen for rapid development, fast HMR, and a modern component-based architecture.
- **Backend**: Node.js + Express. Chosen for its lightweight, unopinionated nature and ease of writing custom REST APIs.
- **Database**: SQLite with SQLCipher encryption. Chosen for simplicity (no separate database server required) while maintaining strict data-at-rest security compliance.
- **ORM**: Prisma. Chosen for its excellent TypeScript support and intuitive schema definition.
- **Email**: Nodemailer with Gmail. Chosen for cost-effectiveness and reliability during early stages.

### Environment Variables Required
- `PORT`: Port for the backend server (default: 3000).
- `FRONTEND_URL`: URL of the frontend application (e.g., `http://localhost:5173`) for CORS.
- `APP_BASE_URL`: Base URL for the backend API, used in email templates for callback links.
- `DB_ENCRYPTION_KEY`: A strong passphrase used by SQLCipher to encrypt/decrypt the SQLite database.
- `SESSION_SECRET`: A cryptographic key used to sign the session cookies.
- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`: Credentials for Google OAuth login.
- `EMAIL_FROM`: The sender email address.
- `EMAIL_APP_PASSWORD`: A 16-character Google App Password for SMTP authentication.

---

## 3. Database Design

The database schema is defined in `prisma/schema.prisma`.

### Models Explained

- **Lead**: Stores information about industry professionals submitted by students. 
  - Fields: `name`, `email`, `organization`, `skills`, `verified` (Boolean), `status` (Pending/Approved/Rejected), `rejectionReason`, `approvedByVolunteerId`, `approvedAt`, `mentorUserId` (optional link to User account when linked as Mentor). 
  - It also links to the `User` who sourced them via `sourcerId`.
- **User**: Stores all platform users (Founders, Students, Mentors, Volunteers, Admins). 
  - Fields: `email`, `googleId`, `name`, `role`, `rejectionCount` (for flagging sourcers with poor submissions), `isBlocked`, `phone`, `year`, `branch`, `profileCompleted`, `designation`, `experience`, `linkedIn`, `bio`, `hasSeenWelcome` (Boolean), `hasLinkedAccount` (Boolean).
- **StartupProfile**: Stores details about a Founder's startup.
  - Linked 1-to-1 with a Founder user.
  - Fields: `name`, `stage`, `focus`, `currentGoal`, `tagline`, `problemStatement`, `solution`, `teamSize`, `helpNeeded`, `website`, `demoLink`, `achievement`, `trlLevel`.
- **ConnectionRequest**: Represents a Founder's request to connect with a Lead.
  - Fields: `status` (Pending/Intro Made/Connected), `sourcerResponse`, `sourcerRespondedAt`, `mentorNotifiedAt`, `sourcerInviteToken`. Links `userId` (Founder) and `leadId`.
- **ChatMessage**: Stores internal chat messages if founders/leads communicate on-platform.
- **SourcerRejectionLog**: An audit log for tracking whenever a lead submission is rejected or a connection request fails, linked to the sourcer to monitor quality.
- **LoginLog**: An audit log tracking user authentication attempts, storing `userId`, `ipAddress`, and `createdAt` timestamp.

### Database Encryption & Migrations
We use `better-sqlite3-multiple-ciphers` with SQLCipher to ensure the database file (`dev.db`) is encrypted at rest. The `DB_ENCRYPTION_KEY` is critical; if lost, the database cannot be decrypted.

**Custom Migration Approach:**
Because the standard Prisma CLI (`npx prisma migrate dev`) does not support opening SQLCipher-encrypted SQLite files out of the box, we use custom scripts (`apply-migration.js`, `apply-migration-2.js`, `apply-migration-3.js`, `view-db.js`) that manually instantiate the encrypted database connection and run SQL statements.
- `apply-migration-3.js`: Adds user mentor profile fields (`designation`, `experience`, `linkedIn`, `bio`, `hasSeenWelcome`, `hasLinkedAccount`), startup profile metrics (`tagline`, `problemStatement`, `solution`, `teamSize`, `helpNeeded`, `website`, `demoLink`, `achievement`, `trlLevel`), `mentorUserId` on `Lead`, and creates the `LoginLog` table.
Manual SQL migration files are tracked under `prisma/migrations/`.

---

## 4. Authentication System

The platform primarily uses Google OAuth 2.0 alongside a traditional Email/Password fallback.

### Google OAuth Flow
1. The frontend invokes Google's sign-in popup.
2. Google returns an Identity Token (JWT).
3. The frontend sends this token to `POST /auth/google`.
4. The backend uses Google's `google-auth-library` (`verifyGoogleToken`) to cryptographically verify the token against Google's public keys. This ensures the token was not forged (a massive security improvement over simply decoding the JWT).
5. The backend extracts the user's email and `sub` (Google ID). It finds or creates the user in the database.
6. An Express session is created and a signed cookie is returned to the client.

### Roles and Session Management
- **Role Assignment**: When a new user logs in via Google, their email domain is parsed. `@vnrvjiet.in` emails default to `Student` (or `Volunteer` if prefixed appropriately). Specific hardcoded emails receive `Admin` or `Founder` status.
- **Session Refresh**: The `GET /check-auth` route doesn't just read the cookie; it performs a fresh database lookup. This ensures that if an Admin changes a user's role or blocks them, the change takes effect immediately on the user's next page load, without requiring them to log out and log back in.
- **Blocked Users**: Users with `isBlocked: true` are intercepted in the login endpoints and denied session creation with a `403 Forbidden` response.

---

## 5. API Routes Reference

### Auth & User Routes
| Method | Path | Auth Req? | Role Req? | Description | Returns |
|--------|------|-----------|-----------|-------------|---------|
| GET | `/api/config` | No | - | Exposes Google Client ID safely. | JSON config |
| POST | `/auth/google` | No | - | Verifies Google token, signs in/creates user. | User session (incl profileCompleted) |
| GET | `/check-auth` | Yes | - | Validates active session & fetches fresh user data. | User object (incl profileCompleted) |
| POST | `/logout` | No | - | Destroys the active session cookie. | Success msg |
| POST | `/api/login` | No | - | Email/password login and auto-signup. | User session (incl profileCompleted) |
| GET | `/api/users` | Yes | Admin | Fetches all users for the Admin panel. | Array of users|
| PATCH | `/api/users/:id/role` | Yes | Admin | Updates a user's role. | Updated user |
| PATCH | `/api/users/:id/blacklist` | Yes | Admin | Blocks or unblocks a user. | Updated user |

### Leads Routes
| Method | Path | Auth Req? | Role Req? | Description | Returns |
|--------|------|-----------|-----------|-------------|---------|
| GET | `/api/leads` | Yes | - | Fetches all leads (includes full sourcer & volunteer approval info). | Array of leads |
| POST | `/api/leads` | Yes | - | Submits a new lead to the database. | Created lead |
| PATCH | `/api/leads/:id/verify` | Yes | Admin | Toggles verified status. | Updated lead |
| DELETE| `/api/leads/:id` | Yes | Admin | Deletes a lead permanently. | Success msg |
| PATCH | `/api/leads/:id/approve` | Yes | Volunteer | Approves a lead submission. | Updated lead |
| PATCH | `/api/leads/:id/reject` | Yes | Volunteer | Rejects a lead with a logged reason. | Updated lead |

### Connections & Invites Routes
| Method | Path | Auth Req? | Role Req? | Description | Returns |
|--------|------|-----------|-----------|-------------|---------|
| POST | `/api/connections` | Yes | Founder | Creates an intro request for a lead. | Created req |
| GET | `/api/connections` | Yes | - | Fetches connections relevant to the user. | Array of reqs |
| PATCH | `/api/connections/:id` | Yes | Admin | Updates connection status. | Updated req |
| GET | `/api/invite/respond` | No | - | Processes Lead email "Yes/No" click. | HTML page |
| GET | `/api/invite/sourcer-respond` | No | - | Processes Sourcer email "Yes/No" click. | HTML page |
| GET | `/api/notifications/sourcer-declined` | Yes | Admin/Vol | Polls for sourcer declined notifications. | Array of reqs |
| POST | `/api/leads/:id/invite` | Yes | Admin/Vol | Dispatches platform invite email. | Success msg |

---

## 6. Email System

The email system is powered by `nodemailer` (`mailer.js`), authenticating via a Gmail App Password.

### Key Email Flows
1. **sendSourcerIntroRequestEmail**: When a Founder requests an intro, an email goes to the SOURCER first asking if they are comfortable making the intro. It includes "Yes" and "No" links to `/api/invite/sourcer-respond`.
2. **sendLeadInviteEmail**: If the Sourcer clicks "Yes", an email is sent to the MENTOR with the Sourcer's name prominent as the introducer.
3. **sendSourcerNotificationEmail**: Sent to the Sourcer notifying them that the intro request was forwarded to the mentor.
4. **sendWelcomeEmail**: Sent to the Mentor confirming connection and providing next steps.
5. **sendVolunteerNotificationEmail**: Sent to Volunteers and Admins with full details of new introduction requests (including sourcer student details: name, email, phone, year, branch).
6. **sendAdminVolunteerNotificationEmail**: Alert email sent to Admins and Volunteers when a new connection request is initiated by a founder.
7. **sendLeadPlatformInviteEmail**: Direct platform invitation email sent when an approved lead is invited to join the VJ Startups ecosystem.
8. **sendMentorLoginInviteEmail**: Custom gradient invitation email sent to mentors allowing direct Google single-sign-on onboarding.

**Note on `APP_BASE_URL`**: It is critical that `APP_BASE_URL` is set correctly in production. If missing, email links will default to `http://localhost:3000`, which will fail when clicked by external users.

---

## 7. Security Decisions

- **Helmet**: Included in the Express pipeline to automatically set secure HTTP headers (e.g., X-XSS-Protection, Content-Security-Policy).
- **Token Bucket Rate Limiting**: QoS Token Bucket algorithm (CN Unit 4) replaces fixed-window rate limiting to prevent boundary burst exploitation and ensure smooth traffic shaping across sensitive endpoints (`/api/login`, `/auth/google`, `/api/connections`, `/api/leads`, `/api/users/complete-profile`, `/api/leads/:id/invite`).
- **Bcrypt Hashing**: Passwords are never stored in plain text. A fallback vulnerability was explicitly removed, ensuring all password comparisons use `bcrypt.compare`.
- **Middleware**: `requireAuth` and `requireRole` interceptors ensure endpoints are strictly gated. You cannot access `/api/users` unless the session proves you are an Admin.
- **HttpOnly Cookies**: Session cookies cannot be read by frontend JavaScript, completely eliminating XSS session-theft vectors.
- **Request Size Limiting**: Express JSON parser is limited to `1mb` to prevent payload-based denial of service.

---

## 8. Frontend Architecture

The frontend is a Vite-powered React SPA using `react-router-dom` for navigation.

### Routing and State
- **Session State**: Maintained in `App.tsx` via a top-level `user` state. `useEffect` calls `/check-auth` on mount to rehydrate the session.
- **Role-Based Views**: The router explicitly maps users to specific dashboards based on their role (`AdminPage`, `FounderPage`, `VolunteerPage`). If a user attempts to view a page they lack permissions for, the component renders a `LoginGate` or "Access Restricted" message.
- **Real-time UX**: Dialog modals are used for destructive actions (like blocking a user or deleting a lead). Success badges and optimistic UI updates are used to make the application feel responsive.
- **Branding & Assets**: Rebranded platform title to `VJ STARTUPS LAUNCHPAD` and subtitle to `VJ STARTUPS ECOSYSTEM`, updating `index.html` title & favicon and `TopNav.tsx` headers with the custom rocket logo.
- **Profile Enforcements**: `ProfileCompletionModal` intercepts `App.tsx` rendering for logged-in students, founders, and volunteers who haven't completed their profile, enforcing structured branch selection via grouped optgroups (CSE & IT, Engineering, Sciences & Humanities), validating phone number formats (10-15 digits), and blocking navigation until submitted (with an explicit Log Out option).
- **Advanced Dashboard Views**:
  - **Volunteer Dashboard**: Features a 60-second polling slide-in panel for `sourcer-declined` notifications and an expandable timeline on leads to show a detailed history of connection request emails and interactions.
  - **Admin Dashboard**: Extends the timeline view to highlight flagged sourcers (high rejection rates) and includes a quick-filter to isolate leads submitted by specific sourcers.

---

## 9. Core Problems Faced and How They Were Solved

### SQLCipher encrypted database not opening with standard Prisma CLI
- **Problem**: Prisma CLI relies on standard SQLite binaries. It cannot read or migrate a database encrypted with SQLCipher.
- **Solution**: We created custom Node.js scripts (`apply-migration.js`, `view-db.js`) that inject the `better-sqlite3-multiple-ciphers` driver and the `DB_ENCRYPTION_KEY` pragmas before executing raw SQL queries.

### better-sqlite3-multiple-ciphers failing to compile on Windows
- **Problem**: Native Node modules require Visual Studio build tools on Windows, which causes frustrating installation errors for new developers.
- **Solution**: Switched to pre-built binaries where possible, and documented the requirement for Windows build tools. Alternatively, developers can use `USE_REAL_DB=false` to use a mock in-memory Prisma client (`mock-prisma.js`) during UI development.

### Merge conflicts in passport.js between team members
- **Problem**: Heavy business logic inside the Passport strategy caused frequent merge conflicts.
- **Solution**: Authentication logic was streamlined. Complex role-resolution logic was centralized, and standard Email/Password logic was moved entirely to its own `/api/login` endpoint, reducing the blast radius of changes in `passport.js`.

### Session role not refreshing after admin changes a user role
- **Problem**: When an Admin promoted a user, the user had to log out and log back in to see their new dashboard because their role was cached in the signed cookie.
- **Solution**: The `GET /check-auth` route was updated to fetch a fresh database record on every initial page load, silently updating the session cookie behind the scenes.

### Email APP_BASE_URL pointing to wrong port
- **Problem**: Email action links (Yes/No) were breaking because the frontend runs on port `5173` and the backend on `3000`. Links generated with `localhost:3000` failed when the frontend expected them, or vice versa.
- **Solution**: Explicitly separated `FRONTEND_URL` and `APP_BASE_URL` in `.env`. Emails use `APP_BASE_URL` for API endpoints (like `/api/invite/respond`), while dashboard links use `FRONTEND_URL`.

### Mock prisma hiding real database bugs during development
- **Problem**: Developers using the mock in-memory database were shipping code that caused SQL errors (like foreign key constraint failures) in production.
- **Solution**: Enforced `USE_REAL_DB=true` for all integration testing. The mock is strictly reserved for UI-only iteration where backend state doesn't matter.

---

## 10. Decision Log

| Date | Decision | Alternatives Considered | Reason for Choice | Impact |
|------|----------|-------------------------|-------------------|--------|
| Project Start | Chose SQLite over PostgreSQL | PostgreSQL, MySQL | Zero-config, easy to deploy as a single file, low cost. | Easier setup, but required custom SQLCipher handling. |
| Project Start | Chose SQLCipher for encryption | App-level encryption | Secures all data at rest natively without writing complex encryption/decryption logic in JS. | Broke standard Prisma CLI tools; required custom scripts. |
| Project Start | Chose Google OAuth over email/password | Only Email/Password | Reduces friction for college students (who all have Gmail). Higher security. | Required Google Cloud setup, but vastly improved UX. |
| Project Start | Nodemailer with Gmail | Resend, SendGrid | Free and easy to prototype with an App Password. | Occasional rate limits from Google; might need migration later. |
| Project Start | Express over Next.js for backend | Next.js API Routes | Team familiarity with Express; easier to manage websockets/custom SQLCipher bindings. | Two separate servers to run during dev. |
| Dev Phase | mock-prisma for initial development | Direct DB connection | Allowed frontend devs to work on UI without fighting SQLite compilation errors on Windows. | Sped up UI dev, but temporarily masked DB schema issues. |
| Security Audit | Removed mock-prisma and switched to real database | Kept mock in dev | Data integrity issues were slipping through to production. | Better testing accuracy; harder setup for Windows devs. |
| Security Audit | Added requireAuth/requireRole middleware | Route-level checks | Route-level checks were easily forgotten by junior devs, leading to data leaks. | Centralized, foolproof security for endpoints. |
| Feature Add | Invite token approach for lead consent | Auto-connecting | Auto-connecting led to spam complaints. Leads must explicitly opt-in. | Improved platform reputation and lead quality. |
| Feature Add | SourcerRejectionLog as separate table | Counter on User model | A simple counter doesn't tell us *which* leads were rejected or *why*. | Allows detailed auditing of sourcer performance. |
| Feature Add | Expanded intro flow and user profiles | External tracking | We needed fine-grained timestamps and volunteer approval tracking directly in the DB. | Enables a more detailed tracking of the introduction pipeline. |
| 2026-09-10 | Added Mentor account linking & enhanced StartupProfile fields | Separate Mentor table | Linked mentors directly to User & Lead models (`mentorUserId`), added onboarding/welcome flags (`hasSeenWelcome`, `hasLinkedAccount`), and 9 startup metric fields (`tagline`, `problemStatement`, `solution`, `teamSize`, `helpNeeded`, `website`, `demoLink`, `achievement`, `trlLevel`). | Supports mentor dashboard, instant account linking, and deep startup profile customization. |
| 2026-09-10 | Added volunteer/admin notification and mentor login invite emails | Only notifying sourcer | Ensures admins and volunteers have full visibility over intro requests for safety/auditing, and mentors get a seamless login link. | Adds `sendVolunteerNotificationEmail` and `sendMentorLoginInviteEmail` to `mailer.js` and integrates into connection flow. |
| 2026-09-19 | Added `LoginLog` audit model and updated `apply-migration-3.js` | Unlogged logins | Audit requirement to capture authentication timestamps and IP addresses for security compliance. | Added `LoginLog` model to `schema.prisma` and updated encrypted SQLite migration script. |
| 2026-09-19 | Consolidate email templates & invitation flows | Fragmented email helpers | Unified `sendVolunteerNotificationEmail`, `sendAdminVolunteerNotificationEmail`, `sendLeadPlatformInviteEmail`, and `sendMentorLoginInviteEmail` in `mailer.js`. | Ensures all roles (Admins, Volunteers, Mentors, Leads) receive structured HTML emails with actionable links. |
| 2026-09-19 | Resolved 5-way branch merge conflicts & synced with `origin/akshay` | Overwriting local or remote commits | Combined local sourcer-first feature commits with remote admin alert & schema updates without losing functionality. | Verified build & Prisma schema integrity; repository is clean and 100% in sync. |
| 2026-09-24 | Add Privacy, Terms of Service, 404 Pages & route titles | External links or ignoring legal | Provides mandatory legal context for a platform handling user emails, phone numbers, and startup data. | Included `<PrivacyPolicyPage>`, `<TermsOfServicePage>`, and `<NotFoundPage>` linked in `App.tsx` and `LoginPage.tsx` footer. |
| 2026-09-24 | Replaced Verified Leads with Active Users stat on Landing Page | Hardcoded or static count | Demonstrates real platform engagement instead of just a lead repository by checking unique `LoginLog` entries. | Updated `GET /api/stats` to compute `activeUsers` using `LoginLog` distinct `userId` mapping. |
| 2026-09-24 | Fixed Founder redirection bug in `getRedirectPath` | Founder users seeing Student page | Founders logging in with `@vnrvjiet.in` were being wrongly redirected to `/student` due to domain fallback rules. | Ensured `role === "Founder"` explicitly bypasses student domain fallback and routes to `/founder`. |
| August 2026 | Replace fixed-window rate limiter with custom token bucket implementation | express-rate-limit (fixed window), leaky bucket | Token bucket directly maps to CN Unit 4 syllabus, handles bursts better, and gives us a monitorable rate limiting system with live status endpoint | Smoother rate limiting, CN syllabus alignment, admin monitoring capability |

---

## Token Bucket Rate Limiter — CN Unit 4: QoS Implementation

### Why Token Bucket
The platform previously used express-rate-limit with a fixed-window algorithm.
Fixed windows allow burst exploitation at window boundaries — an attacker can
send the maximum requests at the end of one window and the start of the next,
doubling the effective rate. Token bucket eliminates this by tracking tokens
continuously rather than resetting counters at fixed intervals.

### How It Works
Each IP address gets its own bucket per endpoint. The bucket holds tokens up
to a maximum capacity and refills at a fixed rate. Every request consumes one
token. Empty bucket means the request is rejected with HTTP 429.

```
Bucket capacity: 5 tokens (AUTH endpoint)
Refill rate: 1 token per 3 minutes

Timeline:
T=0:00  → Bucket full: [■■■■■] 5 tokens
T=0:01  → Login attempt: [■■■■□] 4 tokens
T=0:02  → Login attempt: [■■■□□] 3 tokens
T=0:03  → Login attempt: [■■□□□] 2 tokens
T=0:04  → Login attempt: [■□□□□] 1 token
T=0:05  → Login attempt: [□□□□□] 0 tokens
T=0:06  → Login attempt: REJECTED 429
T=3:00  → Refill:        [■□□□□] 1 token
T=6:00  → Refill:        [■■□□□] 2 tokens
```

### Bucket Configurations
| Endpoint | Capacity | Refill Rate | Refill Interval | Purpose |
|---|---|---|---|---|
| AUTH | 5 | 1 token | 3 minutes | Prevent brute force login |
| EMAIL | 3 | 1 token | 20 minutes | Prevent email spam abuse |
| LEAD_SUBMIT | 10 | 2 tokens | 2 minutes | Prevent bulk fake lead submission |
| PROFILE | 5 | 1 token | 1 minute | Allow profile editing with mistakes |
| GENERAL | 100 | 10 tokens | 6 seconds | Cover all other endpoints |

### CN Syllabus Mapping
- **Unit 4 — QoS Token Bucket Algorithm:** Direct implementation
- **Unit 4 — Congestion Control:** Prevents server overload by controlling request rate
- **Unit 4 — Flow Control:** Per-IP buckets implement per-sender flow control
- **Unit 5 — Application Layer Security:** Firewall-equivalent protection at HTTP layer

### Comparison with Leaky Bucket
| Property | Token Bucket | Leaky Bucket |
|---|---|---|
| Burst handling | Allows bursts up to capacity | Smooths all traffic to fixed rate |
| Implementation | Discrete tokens | Continuous drain |
| Best for | APIs with bursty legitimate traffic | Network traffic shaping |
| Our choice | Token bucket — founders may legitimately send several requests quickly |

### Monitoring
Admin can view all active bucket states at GET /api/admin/rate-limit-status.
Response includes tokens remaining, capacity, refill rate, and percent full
for every active IP-endpoint combination. Use this endpoint with your CN
report to show live token bucket state during a demonstration.

### Decision Log Entry
Date: August 2026
Decision: Replace fixed-window rate limiter with custom token bucket implementation
Alternatives considered: express-rate-limit (fixed window), leaky bucket
Reason: Token bucket directly maps to CN Unit 4 syllabus, handles bursts better,
and gives us a monitorable rate limiting system with live status endpoint
Impact: Smoother rate limiting, CN syllabus alignment, admin monitoring capability

---

## WebSocket Real-Time Notifications — CN Unit 1, 4, 5 Implementation

### Why WebSocket
The volunteer dashboard previously used HTTP polling every 60 seconds to check
for new notifications. Polling wastes bandwidth, introduces up to 60 seconds of
delay, and does not demonstrate any new CN concept beyond HTTP. WebSocket
replaces polling with a persistent full-duplex TCP connection — a fundamentally
different protocol with its own handshake, framing, and connection lifecycle.

### How it works
```
1. Client sends HTTP request with Upgrade: websocket header
2. Server responds with 101 Switching Protocols
3. TCP connection stays open — no more request-response cycles
4. Server pushes events instantly when they happen
5. Client receives events in under 100ms regardless of polling interval
```

### Room-based architecture
Connected clients join rooms based on their role on login.
Server emits events to specific rooms only — volunteers cannot
receive admin-only events and vice versa.

| Room | Who joins | Events received |
|---|---|---|
| volunteer | Volunteers | sourcer-declined, new-lead, lead-approved, intro-requested |
| admin | Admins | All volunteer events plus admin-only alerts |
| founder | Founders | intro-status-updated |
| user-{id} | Specific user | Personal notifications |

### Events emitted
| Event | Trigger | Recipients |
|---|---|---|
| sourcer-declined | Sourcer clicks No in email | volunteer, admin |
| new-lead | Student submits a lead | volunteer, admin |
| lead-approved | Volunteer approves lead | volunteer, admin |
| intro-requested | Founder requests introduction | volunteer, admin |

### CN syllabus mapping
- Unit 1 — Full-duplex communication: both client and server send messages simultaneously
- Unit 1 — Multiplexing: multiple logical channels over one TCP connection via rooms
- Unit 4 — TCP persistent connection: WebSocket maintains one TCP connection indefinitely
- Unit 4 — Process to process communication: port-based delivery to specific browser tab
- Unit 5 — Application layer protocol: WebSocket is a distinct protocol above TCP
- Unit 5 — HTTP upgrade mechanism: connection starts as HTTP then upgrades

### Polling vs WebSocket comparison
| Property | HTTP Polling | WebSocket |
|---|---|---|
| Connection | New TCP connection every 60s | One persistent TCP connection |
| Latency | Up to 60 seconds | Under 100 milliseconds |
| Bandwidth | 10 requests/minute per user | Near zero when idle |
| Server push | Not possible | Native |
| CN concept demonstrated | HTTP request-response | Full-duplex TCP, upgrade handshake |

### Monitoring
Admin can view live WebSocket connection counts at
GET /api/admin/websocket-status showing connected users per room.
Use this during CN demonstration to show active connections in real time.

### Fallback
socket.io automatically falls back to HTTP long-polling if WebSocket
is unavailable in the network environment. Zero breakage risk.

### Decision Log Entry
Date: August 2026
Decision: Add WebSocket via socket.io for real-time volunteer notifications
Alternatives: HTTP polling (existing), Server-Sent Events (SSE)
Reason: WebSocket demonstrates full-duplex TCP for CN syllabus, solves
real 60-second notification delay, room-based architecture scales cleanly
Impact: Instant notifications, eliminated polling, CN Units 1/4/5 coverage

---

## 11. How to Update This Document

This document is a living artifact. It **must** be updated whenever a major technical decision or architectural shift occurs. 

**What counts as a major decision?**
- Adding a new database table or changing a critical relationship.
- Introducing a new third-party service (e.g., changing from Nodemailer to SendGrid).
- Modifying the authentication or authorization flow.

**How to update:**
1. If the architecture changes, update Section 2.
2. If the schema changes, update Section 3.
3. For any of the above, **add a new row to the Decision Log** (Section 10) detailing the date, decision, alternatives, reason, and impact.
4. The Lead Engineer or the developer implementing the change is responsible for keeping this document accurate.

---

## 12. Glossary

- **Lead**: An industry professional, mentor, or investor whose contact details have been submitted to the platform.
- **Sourcer**: The student who submits a Lead to the platform.
- **Founder**: A student who runs a startup and is seeking guidance or connections.
- **Volunteer**: A student responsible for vetting submitted leads and ensuring they are legitimate.
- **Admin**: Platform administrator with full access rights.
- **Intro Request**: An action by a Founder requesting to be connected with a specific Lead.
- **Invite Token**: A unique, secure cryptographic string sent to a Lead's email to verify their identity when they click "Yes" or "No".
- **Warm Introduction**: An email or message drafted by a Sourcer, sent to both the Lead and the Founder, providing personal context and breaking the ice.
- **Connection Request**: The database record tracking the lifecycle of a Founder wanting to meet a Lead.
- **Rejection Log**: An audit record created when a Volunteer rejects a Lead or a Lead declines an Intro Request, used to measure Sourcer quality. 
