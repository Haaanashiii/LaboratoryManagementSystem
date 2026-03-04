# Laboratory Management System - Backend API

A complete RESTful API for managing laboratory equipment inventory and borrowing requests with role-based access control.

## Features

- **User Authentication & Authorization**: JWT-based authentication with 5 user roles
- **Equipment Management**: CRUD operations for laboratory equipment inventory
- **Borrow Request Workflow**: Multi-level approval system for equipment borrowing
- **Role-Based Access Control**: Different permissions for Admin, Head of Lab, Lecturer, Lab Assistant, and Student
- **Dashboard Statistics**: Role-specific statistics and analytics
- **Real-time Inventory Tracking**: Automatic equipment availability updates

## Tech Stack

- **Node.js** & **Express.js**: Backend framework
- **MongoDB** & **Mongoose**: Database and ODM
- **JWT**: Authentication
- **bcryptjs**: Password hashing
- **express-validator**: Input validation
- **Winston**: Logging

## User Roles

1. **Admin**: Full system access, user management
2. **Head of Lab**: Equipment management, final approval for borrow requests
3. **Lecturer**: Approve student borrow requests
4. **Lab Assistant**: Prepare and manage equipment pickup/return
5. **Student**: Submit borrow requests, view own requests

## Installation

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

### Setup

1. **Clone the repository**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env` file in the backend directory:
   ```env
   NODE_ENV=development
   PORT=3000
   
   # MongoDB
   MONGO_URI=mongodb://localhost:27017/lab_management
   
   # JWT
   JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
   JWT_EXPIRE=7d
   JWT_COOKIE_EXPIRE=7
   
   # CORS
   CORS_ORIGIN=http://localhost:5173
   ```

4. **Start MongoDB**
   ```bash
   # For Windows (if MongoDB is installed as a service)
   net start MongoDB
   
   # Or run mongod directly
   mongod
   ```

5. **Run the server**
   ```bash
   # Development mode with auto-restart
   npm run dev
   
   # Production mode
   npm start
   ```

The server will start on `http://localhost:3000`

## API Documentation

### Base URL
```
http://localhost:3000/api
```

### Authentication

All protected routes require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

---

## API Endpoints

### Authentication Routes
**Base:** `/api/auth`

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@its.ac.id",
  "password": "Password123!",
  "role": "student",
  "studentId": "5025201001" // For students only
}

Response: 201 Created
{
  "success": true,
  "token": "jwt_token_here",
  "data": { user_object }
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@its.ac.id",
  "password": "Password123!"
}

Response: 200 OK
{
  "success": true,
  "token": "jwt_token_here",
  "data": { user_object }
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "data": { user_object }
}
```

#### Update Password
```http
PUT /api/auth/update-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword123!"
}
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer <token>
```

---

### User Management Routes
**Base:** `/api/users`  
**Access:** Admin, Head of Lab

#### Get All Users
```http
GET /api/users?search=john&role=student&status=active
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "count": 25,
  "data": [ user_objects ]
}
```

#### Get Users by Role
```http
GET /api/users/role/:role
Authorization: Bearer <token>

Example: GET /api/users/role/lecturer
```

#### Get Single User
```http
GET /api/users/:id
Authorization: Bearer <token>
```

#### Create User (Invite)
```http
POST /api/users
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Jane Smith",
  "email": "jane@its.ac.id",
  "role": "lecturer",
  "password": "TempPassword123!"
}
```

#### Update User
```http
PUT /api/users/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Name",
  "status": "inactive"
}
```

#### Delete User
```http
DELETE /api/users/:id
Authorization: Bearer <token>
```

---

### Equipment Routes
**Base:** `/api/equipment`

#### Get All Equipment
```http
GET /api/equipment?category=Microscope&search=zeiss&available=true
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "count": 10,
  "data": [ equipment_objects ]
}
```

#### Get Equipment Categories
```http
GET /api/equipment/categories
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "data": ["Microscope", "Spectrometer", "Centrifuge", ...]
}
```

#### Get Single Equipment
```http
GET /api/equipment/:id
Authorization: Bearer <token>
```

#### Create Equipment
```http
POST /api/equipment
Authorization: Bearer <token> (Admin/Head of Lab only)
Content-Type: application/json

{
  "name": "Zeiss Axioscope 5",
  "category": "Microscope",
  "quantity": 5,
  "available": 5,
  "condition": "Excellent",
  "location": "Lab Room 301",
  "manufacturer": "Carl Zeiss",
  "model": "Axioscope 5",
  "specifications": {
    "magnification": "40x-1000x",
    "type": "Optical Microscope"
  }
}
```

#### Update Equipment
```http
PUT /api/equipment/:id
Authorization: Bearer <token> (Admin/Head of Lab only)
Content-Type: application/json

{
  "available": 4,
  "condition": "Good"
}
```

#### Update Equipment Quantity
```http
PATCH /api/equipment/:id/quantity
Authorization: Bearer <token> (Admin/Head of Lab/Lab Assistant)
Content-Type: application/json

{
  "available": 3
}
```

#### Delete Equipment
```http
DELETE /api/equipment/:id
Authorization: Bearer <token> (Admin/Head of Lab only)
```

---

### Borrow Request Routes
**Base:** `/api/borrow-requests`

#### Get All Borrow Requests
```http
GET /api/borrow-requests?status=pending_lecturer&student_email=john@its.ac.id
Authorization: Bearer <token>

Note: Results are automatically filtered by role
- Students see only their requests
- Lecturers see requests assigned to them
- Lab Assistants and above see all requests

Response: 200 OK
{
  "success": true,
  "count": 15,
  "data": [ request_objects ]
}
```

#### Get My Requests (Student)
```http
GET /api/borrow-requests/my-requests
Authorization: Bearer <token> (Student only)
```

#### Get Single Request
```http
GET /api/borrow-requests/:id
Authorization: Bearer <token>
```

#### Create Borrow Request
```http
POST /api/borrow-requests
Authorization: Bearer <token> (Student only)
Content-Type: application/json

{
  "equipment": "equipment_id",
  "quantity": 2,
  "purpose": "Research for thesis on cell biology",
  "borrow_date": "2024-02-01T09:00:00Z",
  "return_date": "2024-02-15T17:00:00Z",
  "lecturer_email": "lecturer@its.ac.id"
}

Response: 201 Created
```

#### Lecturer Approve/Reject
```http
PUT /api/borrow-requests/:id/lecturer-action
Authorization: Bearer <token> (Lecturer only)
Content-Type: application/json

{
  "action": "approve", // or "reject"
  "remarks": "Approved for research purposes"
}
```

#### Head of Lab Approve/Reject
```http
PUT /api/borrow-requests/:id/head-action
Authorization: Bearer <token> (Head of Lab only)
Content-Type: application/json

{
  "action": "approve", // or "reject"
  "remarks": "Approved. Equipment available."
}
```

#### Prepare Equipment (Lab Assistant)
```http
PUT /api/borrow-requests/:id/prepare
Authorization: Bearer <token> (Lab Assistant only)

Note: This reserves the equipment and reduces available quantity
```

#### Release Equipment (Lab Assistant)
```http
PUT /api/borrow-requests/:id/release
Authorization: Bearer <token> (Lab Assistant only)

Note: Confirms student has picked up the equipment
```

#### Process Return (Lab Assistant)
```http
PUT /api/borrow-requests/:id/return
Authorization: Bearer <token> (Lab Assistant only)
Content-Type: application/json

{
  "return_condition": "Good",
  "return_remarks": "All items returned in good condition"
}

Note: This returns equipment to inventory and increases available quantity
```

#### Delete Request
```http
DELETE /api/borrow-requests/:id
Authorization: Bearer <token>

Note: Only pending requests can be deleted
- Students can delete their own pending requests
- Admins can delete any pending request
```

---

### Statistics Routes
**Base:** `/api/stats`

#### Get Dashboard Statistics
```http
GET /api/stats/dashboard
Authorization: Bearer <token>

Note: Returns role-specific statistics
- Admin/Head of Lab: Full system statistics
- Lecturer: Their approval queue and approved requests
- Lab Assistant: Equipment preparation and return queue
- Student: Their own request statistics

Response: 200 OK
{
  "success": true,
  "data": {
    "equipment": { total, available, borrowed },
    "users": { total, admin, head_of_lab, lecturer, lab_assistant, student },
    "requests": { total, pending_lecturer, pending_head, ... }
  }
}
```

#### Get Borrowing Trends
```http
GET /api/stats/trends?period=30
Authorization: Bearer <token> (Admin/Head of Lab only)

Note: Returns daily borrowing statistics for the specified period (days)
```

#### Get Equipment Usage Statistics
```http
GET /api/stats/equipment-usage
Authorization: Bearer <token> (Admin/Head of Lab only)

Response: Top 20 most borrowed equipment items
```

#### Get Overdue Returns
```http
GET /api/stats/overdue
Authorization: Bearer <token> (Admin/Head of Lab/Lab Assistant)

Response: List of borrowed equipment past return date
```

---

## Borrow Request Workflow

```
Student submits request
    ↓ (status: pending_lecturer)
Lecturer approves/rejects
    ↓ (status: pending_head)
Head of Lab approves/rejects
    ↓ (status: head_approved)
Lab Assistant prepares equipment
    ↓ (status: ready_pickup, equipment reserved)
Lab Assistant releases to student
    ↓ (status: borrowed)
Student returns equipment
    ↓
Lab Assistant processes return
    ↓ (status: returned, equipment back in inventory)
```

### Status Flow:
- `pending_lecturer` → Student submitted, waiting for lecturer
- `pending_head` → Lecturer approved, waiting for head of lab
- `head_approved` → Approved, waiting for lab assistant to prepare
- `ready_pickup` → Equipment prepared and ready for student pickup
- `borrowed` → Equipment released to student
- `returned` → Equipment returned by student
- `rejected` → Rejected by lecturer or head of lab

---

## Error Handling

All errors follow this format:
```json
{
  "success": false,
  "message": "Error message here",
  "error": "Detailed error (development only)"
}
```

### Common HTTP Status Codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (not logged in)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Server Error

---

## Testing

### Test Accounts

Create test users for each role:

```javascript
// Admin
{
  "email": "admin@its.ac.id",
  "password": "Admin123!",
  "role": "admin"
}

// Head of Lab
{
  "email": "head@its.ac.id",
  "password": "Head123!",
  "role": "head_of_lab"
}

// Lecturer
{
  "email": "lecturer@its.ac.id",
  "password": "Lecturer123!",
  "role": "lecturer"
}

// Lab Assistant
{
  "email": "assistant@its.ac.id",
  "password": "Assistant123!",
  "role": "lab_assistant"
}

// Student
{
  "email": "student@its.ac.id",
  "password": "Student123!",
  "role": "student",
  "studentId": "5025201001"
}
```

### Using Postman/Thunder Client

1. **Login** to get JWT token
2. **Set Authorization** header: `Bearer <token>`
3. **Test role-based access** by trying different endpoints with different user roles

---

## Project Structure

```
backend/
├── controllers/
│   ├── authController.js        # Authentication logic
│   ├── userController.js        # User management
│   ├── equipmentController.js   # Equipment CRUD
│   ├── borrowRequestController.js  # Borrow workflow
│   └── statsController.js       # Statistics & analytics
├── middleware/
│   ├── auth.js                  # JWT & authorization
│   ├── errorHandler.js          # Global error handling
│   ├── logger.js                # Request logging
│   └── validator.js             # Input validation rules
├── models/
│   ├── User.js                  # User schema
│   ├── Equipment.js             # Equipment schema
│   └── BorrowRequest.js         # Borrow request schema
├── routes/
│   ├── authRoutes.js            # Auth endpoints
│   ├── userRoutes.js            # User endpoints
│   ├── equipmentRoutes.js       # Equipment endpoints
│   ├── borrowRequestRoutes.js   # Borrow request endpoints
│   └── statsRoutes.js           # Statistics endpoints
├── .env.example                 # Environment variables template
├── .gitignore                   # Git ignore rules
├── package.json                 # Dependencies
├── server.js                    # Express app entry point
└── README.md                    # This file
```

---

## Frontend Integration

The backend is designed to work with the React frontend at `http://localhost:5173`.

### Update frontend apiClient.js:

```javascript
const API_BASE_URL = 'http://localhost:3000/api';

const getAuthHeaders = () => {
  const token = sessionStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

export const api = {
  // Auth
  login: (credentials) => 
    fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    }).then(res => res.json()),
  
  // Equipment
  getEquipment: () =>
    fetch(`${API_BASE_URL}/equipment`, {
      headers: getAuthHeaders()
    }).then(res => res.json()),
  
  // Borrow Requests
  createBorrowRequest: (data) =>
    fetch(`${API_BASE_URL}/borrow-requests`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    }).then(res => res.json()),
  
  // Add more endpoints as needed...
};
```

---

## Security Best Practices

1. **Environment Variables**: Never commit `.env` file
2. **JWT Secret**: Use a strong, random secret in production
3. **Password Policy**: Enforce strong passwords (min 8 chars, uppercase, lowercase, number)
4. **Input Validation**: All inputs are validated using express-validator
5. **CORS**: Configure allowed origins in production
6. **Rate Limiting**: Consider adding rate limiting middleware for production
7. **HTTPS**: Use HTTPS in production

---

## Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production` in `.env`
- [ ] Use strong `JWT_SECRET`
- [ ] Configure production MongoDB URI (MongoDB Atlas recommended)
- [ ] Set correct `CORS_ORIGIN` for frontend domain
- [ ] Enable HTTPS
- [ ] Add rate limiting
- [ ] Set up logging to file/service
- [ ] Configure database backups
- [ ] Add monitoring (PM2, New Relic, etc.)

### Deploy to Heroku (Example)

```bash
# Install Heroku CLI and login
heroku login

# Create app
heroku create lab-management-api

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your_production_secret
heroku config:set MONGO_URI=your_mongodb_atlas_uri

# Deploy
git push heroku main

# Check logs
heroku logs --tail
```

---

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## License

This project is developed for Institut Teknologi Sepuluh Nopember (ITS).

---

## Support

For issues and questions:
- Email: support@its.ac.id
- GitHub Issues: [Create an issue](https://github.com/your-repo/issues)

---

**Institut Teknologi Sepuluh Nopember**  
Laboratory Management System © 2024
