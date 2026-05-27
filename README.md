# Equimon — Laboratory Management System

A web-based laboratory inventory and equipment borrowing management system built with React and Node.js.

## Documentation

All project documentation is located in the [`docs/`](./docs/) folder:

| Document | Description |
|---|---|
| [Deployment User Manual](./docs/Deployment%20User%20Manual.docx) | Step-by-step guide to set up and deploy the system |
| [Equimon User Manual (English)](./docs/Equimon%20User%20Manual.pdf) | End-user guide for using the system |
| [Equimon Panduan Pengguna (Bahasa Malaysia)](./docs/Equimon%20Panduan%20Pengguna.pdf) | Panduan pengguna dalam Bahasa Malaysia |

## Tech Stack

**Frontend:** React 19, Vite, Ant Design, TanStack Query, Socket.IO Client

**Backend:** Node.js, Express, MongoDB, Mongoose, Socket.IO, JWT

## Quick Start

Refer to the [Deployment User Manual](./docs/Deployment%20User%20Manual.docx) for full setup instructions.

### Prerequisites

- Node.js v18+
- MongoDB (local or Atlas)

### Setup

1. Clone the repository
2. Configure `backend/.env` (see `backend/.env.example`)
3. Install and run the backend:
   ```bash
   cd backend
   npm install
   npm run dev
   ```
4. Install and run the frontend:
   ```bash
   cd front
   npm install
   npm run dev
   ```

The frontend runs on `http://localhost:5173` and the backend on `http://localhost:3000`.
