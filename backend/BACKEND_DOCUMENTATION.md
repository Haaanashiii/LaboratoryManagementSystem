# Backend Documentation

## 1. Overview
This backend is a Node.js + Express REST API for the Laboratory Management System. It supports authentication, role-based access control, equipment management, borrow request workflows, analytics, maintenance mode, and audit logging.

Base API URL (local):
- http://localhost:3000/api

Health endpoint:
- GET /health

## 2. Tech Stack
- Node.js
- Express.js
- MongoDB + Mongoose
- JWT authentication
- bcryptjs password hashing
- express-validator
- multer (memory storage)
- GridFS for image storage
- Security middleware:
  - helmet
  - express-mongo-sanitize
  - xss-clean
  - express-rate-limit (login route)

## 3. Project Structure
- server.js: app bootstrap, global middleware, route mounting, DB connection
- routes/: API route definitions
- controllers/: business logic per feature
- models/: MongoDB schema models
- middleware/: auth, validation, upload, maintenance, logging, errors
- config/gridfs.js: GridFS upload/download utilities
- utils/: audit logging and email policy helpers

## 4. Runtime Flow
1. Load environment variables.
2. Configure optional DNS resolvers from DNS_SERVERS.
3. Initialize Express app.
4. Apply middleware (CORS, security, parsing, sanitization, logger, maintenance guard).
5. Mount routes.
6. Apply error handler.
7. Connect to MongoDB.
8. Ensure admin account policy on startup.
9. Initialize GridFS and start HTTP server.

## 5. Environment Variables
Required:
- PORT: server port (example: 3000)
- NODE_ENV: development or production
- MONGODB_URI: MongoDB connection string
- JWT_SECRET: JWT signing key
- CORS_ORIGIN: allowed frontend origin

Optional:
- MAX_FILE_SIZE: upload size limit in bytes (default 5242880)
- DNS_SERVERS: comma-separated DNS servers for SRV resolution issues
- TRUST_PROXY: Express trust proxy setting for real client IP extraction behind reverse proxies (examples: true, 1, loopback, 2, 10.0.0.0/8)
- ADMIN_EMAIL: used in production auto-admin creation (if no admin exists)
- ADMIN_PASSWORD: used in production auto-admin creation
- ENABLE_DEV_EMAIL_BYPASS:
  - true: always enable dev bypass emails
  - false: always disable dev bypass emails
  - unset: enabled in non-production only
- DEV_BYPASS_EMAILS: comma-separated additional bypass emails

## 6. Authentication and Authorization
Auth model:
- JWT in Authorization header:
  - Authorization: Bearer <token>
- protect middleware validates token, loads user, and requires user.status = active.

Role authorization:
- authorize(role1, role2, ...)
- Admin-access helper roles:
  - lecturer, head, head_of_lab, lab_assistant, admin

User roles in User model:
- admin
- head
- head_of_lab
- lecturer
- lab_assistant
- student

## 7. Security Controls
Global middleware in server.js:
- CORS (kept with existing origin logic)
- helmet
- express.json
- express.urlencoded
- express-mongo-sanitize
- xss-clean
- request logger
- maintenance mode guard

Route-level security:
- Login rate limiting on POST /api/auth/login
  - window: 30 minutes
  - max failed attempts per IP: 5
  - message: Too many failed login attempts. Please try again in 30 minutes.

Email domain restrictions:
- Registration/login allowed domains:
  - student.its.ac.id
  - its.ac.id
- Role-domain check on login:
  - student -> must use student.its.ac.id
  - staff/admin roles -> must use its.ac.id
- Development bypass emails:
  - haaanashiii@gmail.com
  - delossantosyowcam@gmail.com
  - hed-mrjose@smu.edu.ph
  - plus DEV_BYPASS_EMAILS entries

Role escalation prevention:
- Public registration always sets role = student.
- Incoming role field from public register request is ignored.
- Admin role changes must use admin endpoint.

Maintenance mode:
- Non-admins are blocked with 503 when maintenance is enabled.
- Bypass paths during maintenance:
  - /health
  - /api/auth/admin/login
  - /api/auth/maintenance-status

## 8. Data Models
### User
Fields:
- email (unique, required)
- password (required, hidden by default)
- name (required)
- role (enum)
- status (active, inactive, suspended)
- department
- studentId
- phone
- timestamps

Notes:
- Password is hashed via pre-save hook.
- comparePassword helper provided.

### Equipment
Fields:
- name, category, description
- quantity, available
- condition (Excellent, Good, Fair, Poor, Damaged)
- location, manufacturer, model, serialNumber
- purchaseDate, price
- image, images[], specifications map
- maintenanceSchedule, status
- timestamps

### BorrowRequest
Main groups:
- student info
- equipment info
- request details
- approvals (lecturer/head)
- lab assistant actions (prepare/release)
- return and damage tracking
- status and rejection fields

Status values:
- pending_lecturer
- pending_head
- head_approved
- ready_pickup
- borrowed
- returned
- rejected

Damage status values:
- none
- pending_verification
- verified
- rejected

### Setting
Fields:
- key (unique)
- value (mixed)
- description
- timestamps

### AuditLog
Fields:
- user, user_email
- action_type
- entity_type, entity_id
- ip_address, user_agent
- status
- details
- timestamps

action_type values:
- login_success
- login_failed
- borrow_created
- borrow_released
- borrow_returned
- damage_verified
- maintenance_toggled
- role_changed
- audit_logs_cleared

## 9. API Reference
All responses generally use:
- success: boolean
- data: object/array (when applicable)
- message: string (when applicable)

### 9.1 Authentication Routes (/api/auth)
#### POST /register
Access: Public
Validation:
- email valid
- password min 6
- name required
Body:
- email, password, name, department?, studentId?, phone?
Behavior:
- role is always student
- domain restrictions enforced

#### POST /login
Access: Public
Rate-limited: Yes (5 failed attempts / 30 minutes / IP)
Body:
- email, password
Behavior:
- domain restrictions enforced
- role-domain mapping enforced
- login audit events written

#### POST /admin/login
Access: Public
Body:
- email, password
Behavior:
- domain restrictions enforced
- role-domain mapping enforced
- role must be one of admin portal roles

#### GET /maintenance-status
Access: Public
Returns current maintenance mode state.

#### GET /me
Access: Authenticated
Returns current user profile payload.

#### GET /dashboard
Access: Authenticated
Simple protected route sanity endpoint.

#### GET /admin-dashboard
Access: Authenticated admin-access roles

#### GET /admin/session
Access: Authenticated admin-access roles

#### POST /logout
Access: Authenticated
Note: token invalidation is client-side in current implementation.

#### PUT /update-password
Access: Authenticated
Body:
- currentPassword
- newPassword

### 9.2 Admin Routes (/api/admin)
All routes: protect + authorize(admin)

#### GET /maintenance-status
Returns current maintenance state.

#### POST /toggle-maintenance
Body:
- enabled?: boolean
Behavior:
- if enabled missing, toggles current state.

#### PUT /set-role/:id
Body:
- role
Allowed roles:
- admin, lecturer, lab_assistant, head
Behavior:
- updates target user role
- writes role_changed audit log

#### DELETE /audit-logs
Behavior:
- clears all audit logs
- writes audit_logs_cleared event with deletedCount

### 9.3 Audit Log Routes (/api/admin/audit-logs)
All routes: protect + authorize(admin)

#### GET /
Query params:
- user
- action_type
- status
- start_date
- end_date
- page (default 1)
- limit (default 20, max 100)
Response includes pagination meta.

#### GET /export/pdf
Query params:
- user
- action_type
- status
- start_date
- end_date
- limit (default 5000, max 5000)
- date_format:
  - short (default)
  - numeric
  - long
Behavior:
- groups records by day and renders day headers based on date_format

### 9.4 User Routes (/api/users)
All routes: protect + authorize(admin, head_of_lab)

#### GET /
Query:
- role
- status
- search (name or email)

#### POST /
Body:
- email, name
- password? (default: Default123)
- role? (default: student)
- department?, studentId?, phone?

#### GET /role/:role
Gets active users by role.

#### GET /:id
Get single user.

#### PUT /:id
Update user fields.
Notes:
- non-admin restrictions exist in controller logic, but route itself is admin/head_of_lab only.

#### DELETE /:id
Delete user.
Restriction:
- cannot delete own account.

### 9.5 Equipment Routes (/api/equipment)
#### GET /image/:fileId
Access: Public
Streams image from GridFS.

All following routes require authentication.

#### GET /
Query:
- category
- status
- available=true (for available only)
- search (name/description)

#### GET /categories
Returns distinct categories.

#### GET /:id
Returns single equipment item.

#### POST /upload-image
Access: admin, head_of_lab, lab_assistant
Multipart field:
- image
Returns fileId and image path.

#### POST /
Access: admin, head_of_lab, lab_assistant
Validation:
- name, category, location required
- quantity/available numeric >= 0

#### PUT /:id
Access: admin, head_of_lab, lab_assistant
Updates equipment fields.

#### DELETE /:id
Access: admin, head_of_lab, lab_assistant
Deletes equipment.

#### PATCH /:id/quantity
Access: admin, head_of_lab, lab_assistant
Body:
- quantity?
- available?

### 9.6 Borrow Request Routes (/api/borrow-requests)
All routes require authentication.

#### GET /my-requests
Access: student
Returns own requests.

#### POST /
Access: student
Validation:
- equipment (Mongo ID)
- quantity >= 1
- purpose
- borrow_date, return_date
- agree_policy must be true
- lecturer_email optional email

Body:
- equipment, quantity, purpose, borrow_date, return_date, lecturer_email?, agree_policy

#### GET /
Access: authenticated (role-filtered in controller)
Query:
- status
- student_email
- lecturer_email
- equipment_id

#### GET /damage-image/:fileId
Access: authenticated
Streams damage evidence image from GridFS.

#### GET /:id
Access: authenticated (students restricted to own requests)

#### PUT /:id/lecturer-action
Access: lecturer
Body:
- action: approve or reject
- remarks?

#### PUT /:id/head-action
Access: head_of_lab
Body:
- action: approve or reject
- remarks?

#### PUT /:id/prepare
Access: lab_assistant
Marks request as ready_pickup.

#### PUT /:id/release
Access: lab_assistant
Marks request as borrowed.

#### PUT /:id/return
Access: lab_assistant
Multipart/form-data supported for damage image.
Body:
- return_condition: Good | Damaged | Lost
- return_remarks (required for Damaged/Lost)
- damage_details (required when Damaged)
- student_will_replace (required boolean when Damaged)
- replacement_completed (required boolean when replacement tracking applies)
- damage_image (file, optional but recommended when Damaged)

#### PUT /:id/damage-verify
Access: admin
Body:
- action: verify or reject
- remarks?

#### DELETE /:id
Access: student (own pending requests) or admin
Restriction:
- only pending_lecturer or pending_head requests can be deleted.

### 9.7 Stats Routes (/api/stats)
All routes require authentication.

#### GET /dashboard
Returns role-specific dashboard payload.

#### GET /trends
Access: admin, head_of_lab
Query:
- period (days, default 30)

#### GET /equipment-usage
Access: admin, head_of_lab

#### GET /admin/most-borrowed
Access: admin
Query:
- limit (default 10, max 50)

#### GET /admin/late-return-users
Access: admin
Query:
- limit (default 10, max 50)

#### GET /admin/borrowing-trends
Access: admin
Query:
- groupBy: day | week | month (default day)
- period: days, default 90, max 365

#### GET /overdue
Access: admin, head_of_lab, lab_assistant

## 10. File Upload and GridFS
Storage approach:
- multer memory storage receives incoming file.
- File bytes are persisted into MongoDB GridFS bucket named equipmentImages.

Supported image types:
- jpeg, jpg, png, gif, webp, bmp, tif, tiff, avif, svg

Public serving:
- Equipment image endpoint is public.
- Damage image endpoint requires auth.

## 11. Maintenance Mode
Stored key:
- system_maintenance_mode in settings collection.

Behavior:
- When enabled, non-admin API traffic is blocked with HTTP 503.
- Allowed bypass endpoints remain reachable for health/login checks.

Admin controls:
- GET /api/admin/maintenance-status
- POST /api/admin/toggle-maintenance

## 12. Startup and Admin Bootstrap
Development mode:
- Ensures admin@its.ac.id exists, active, and admin role.
- Resets password to Admin123! on startup.

Production mode:
- If no admin exists, promotes/creates from ADMIN_EMAIL + ADMIN_PASSWORD.

## 13. Error Handling and Logging
- Central error middleware formats known Mongoose errors and validation errors.
- Request logger middleware logs inbound requests.
- Audit logger records security-sensitive and workflow-sensitive events.

## 14. Notes and Known Behavior
- Current JWT token expiration in middleware generateToken is fixed at 1 day.
- Logout is stateless on backend (token removed client-side).
- xss-clean package is deprecated upstream, but currently integrated as requested.
- Some legacy role value head exists alongside head_of_lab.

## 15. Quick Start
1. From backend folder, install:
   - npm install
2. Configure .env with MONGODB_URI, JWT_SECRET, CORS_ORIGIN, PORT.
3. Start API:
   - npm run dev
4. Health check:
   - GET http://localhost:3000/health
