# SprintDesk Backend

REST API for SprintDesk, a collaborative issue-management application built with Node.js, Express.js, MongoDB, Mongoose, JWT authentication, and Socket.io.

## Tech Stack

- Node.js and Express.js
- MongoDB and Mongoose
- JWT authentication and bcryptjs
- Socket.io for real-time updates

## Prerequisites

- Node.js and npm
- MongoDB Community Server installed and running locally

## 1. Installation

Navigate to the backend directory and install dependencies:

```bash
cd backend
npm install
```

## 2. Environment Configuration

Create a `.env` file in the backend directory using `.env.example` as a reference.

```env
PORT=7777
MONGODB_URI=mongodb://127.0.0.1:27017/sprintdesk
JWT_SECRET=your_long_random_secret
CLIENT_URL=http://localhost:5173
```

Use a strong, private JWT secret in your local environment. Never commit your actual `.env` file.

## 3. Start MongoDB

On Windows, check whether the MongoDB service is running using PowerShell:

```powershell
Get-Service MongoDB
```

If the service is stopped, start it:

```powershell
Start-Service MongoDB
```

These commands assume MongoDB is installed as a Windows service.

## 4. Seed the Database

Run the seed script from the backend directory:

```bash
npm run seed
```

The seed script creates:

- 3 users: 1 admin and 2 members
- 2 projects: Payment Dashboard and Customer Portal
- 12 issues across different statuses and priorities

**Warning:** The seed script deletes existing issues, projects, and users before inserting demo data. Run it only against your local development database when you intend to reset the demo data.

## 5. Demo Login Credentials

All three demo accounts use the same password.

| Role   | Name             | Email                    | Password         |
| ------ | ---------------- | ------------------------ | ---------------- |
| Admin  | SprintDesk Admin | `admin@sprintdesk.local` | `SprintDesk@123` |
| Member | Aarav Sharma     | `aarav@sprintdesk.local` | `SprintDesk@123` |
| Member | Priya Patel      | `priya@sprintdesk.local` | `SprintDesk@123` |

These credentials are for local assessment demonstrations only.

## 6. Run the Backend

Start the development server:

```bash
npm run dev
```

To run in production mode:

```bash
npm start
```

The backend runs at:

`http://localhost:7777`

## 7. Run the Frontend

Open a separate terminal and navigate to the frontend directory:

```bash
cd frontend
npm install
npm run dev
```

Open the application at:

`http://localhost:5173`

Log in using any of the demo accounts listed above.

## 8. Available Features

- JWT-based authentication and protected APIs
- Admin and member role-based permissions
- Project and membership management
- Issue creation, updating, assignment, and deletion according to permissions
- Issue status, priority, due date, and activity history
- Server-side search, filtering, sorting, and pagination
- Real-time issue updates using Socket.io
- Project-level access validation

## 9. Testing

Run automated tests using the test script configured in `package.json`:

```bash
npm test
```

Ensure the required test script and test dependencies are configured before running this command.

## 10. Security Notes

- Passwords are stored as hashes.
- JWT secrets must remain private.
- Environment files containing secrets must not be committed.
- Backend authorization must be enforced independently of frontend controls.
- Demo credentials must not be reused in production.

## 11. Known Limitations

This project is designed for local execution as part of a full-stack practical assessment. Any incomplete features or known issues should be documented here before submission.
