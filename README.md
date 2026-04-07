# Chat Backend

A Node.js/TypeScript chat backend built with Express, MongoDB (Mongoose), JWT authentication, and Socket.IO.

## Features

- User registration and login with JWT
- Protected user profile and user search endpoints
- One-to-one chat creation and retrieval
- Message history endpoints
- Real-time messaging, read receipts, and call signaling via Socket.IO
- Story posting/fetching routes (implemented in codebase)

## Tech Stack

- Node.js + TypeScript
- Express
- MongoDB + Mongoose
- Socket.IO
- JWT (`jsonwebtoken`)
- Multer (file upload handling)
- Jest + Supertest (testing)

## Prerequisites

- Node.js 18+
- npm
- MongoDB instance

## Getting Started

```bash
npm ci
```

Create a `.env` file in the project root:

```env
MONGO_URI=mongodb://localhost:27017/chat-backend
JWT_SECRET=your_jwt_secret
PORT=5000
```

Run in development:

```bash
npm run dev
```

Build and run production build:

```bash
npm run build
npm start
```

## Scripts

- `npm run dev` — run with `ts-node`
- `npm run build` — compile TypeScript to `dist/`
- `npm start` — run compiled server
- `npm test` — currently recursive in `package.json` (`"test": "npm test"`); use `npx jest` directly for tests

## API Overview

Base URL: `http://localhost:5000`

### Health

- `GET /health`

### Auth & Users (`/api/auth`)

- `POST /register`
- `POST /login`
- `GET /me` (JWT required)
- `GET /` (JWT required)
- `POST /profile-image` (JWT required, form field: `profileImage`)
- `GET /search?name=<query>` (JWT required)

### Chats (`/api/chats`, JWT required)

- `POST /` — create/get a chat with a target user
- `GET /` — list current user chats
- `GET /:chatId` — get a chat
- `DELETE /:chatId` — delete a chat and messages
- `GET /:chatId/messages` — get messages for a chat

### Stories

`src/routes/storyRoutes.ts` defines story endpoints:
- `POST /` (JWT + file upload, field: `storyContent`)
- `GET /` (JWT)

Note: Story routes are implemented but not currently mounted in `src/server.ts`.

## Socket.IO Events

Client emits:
- `message:send`
- `chat:read`
- `call:initiate`
- `call:accept`
- `call:ice_candidate`
- `call:reject`
- `call:end`

Server emits:
- `message:delivered`
- `message:received`
- `messages:were_read`
- `call:incoming`
- `call:accepted`
- `call:ice_candidate`
- `call:rejected`
- `call:ended`

Socket authentication expects JWT in either:
- `socket.handshake.auth.token`, or
- `Authorization: Bearer <token>` header

