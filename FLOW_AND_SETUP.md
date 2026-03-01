# myHaircode – Flow and Setup Guide

This document explains how the entire project works, step by step, and what you need to do when cloning the repo on a new machine or adding features yourself.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture Flow](#2-architecture-flow)
3. [Request Flow (Step by Step)](#3-request-flow-step-by-step)
4. [Fresh Clone Setup](#4-fresh-clone-setup)
5. [Database Connection](#5-database-connection)
6. [Adding New Features Manually](#6-adding-new-features-manually)
7. [Environment Variables Reference](#7-environment-variables-reference)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Project Overview

### Structure (Monorepo)

```
myHaircode/
├── package.json              # Workspace root (npm workspaces)
├── apps/
│   ├── backend/              # Express API + Prisma + PostgreSQL
│   └── mobile/
│       └── myHaircodeFinal/  # React Native / Expo app
└── packages/                 # (empty – for shared code if needed)
```

### Tech Stack

| Part | Tech |
|------|------|
| **Backend** | Node.js, Express, Prisma, PostgreSQL (Supabase), Supabase Auth (JWT), Socket.io |
| **Mobile** | React Native, Expo 54, Expo Router, Supabase Auth, TanStack Query |
| **Database** | PostgreSQL hosted on Supabase |
| **Auth** | Supabase Auth (email/password). Backend verifies JWT with `SUPABASE_JWT_SECRET` |

---

## 2. Architecture Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MOBILE APP (Expo/React Native)                     │
│  ┌──────────────┐    ┌──────────────┐    ┌─────────────────────────────────┐ │
│  │ Supabase Auth│───▶│ apiClient.ts │───▶│ API modules (haircodes, profiles, │ │
│  │ (sign in/up) │    │ + Bearer JWT │    │ relationships, inspirations...)  │ │
│  └──────────────┘    └──────┬───────┘    └─────────────────────────────────┘ │
└────────────────────────────┼────────────────────────────────────────────────┘
                             │ HTTP + Authorization: Bearer <token>
                             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BACKEND (Express)                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌─────────────────────────────────┐ │
│  │ authMiddleware│───▶│ Controllers  │───▶│ Prisma Client                    │ │
│  │ (verify JWT)  │    │ + Services   │    │ (PostgreSQL via DATABASE_URL)    │ │
│  └──────────────┘    └──────────────┘    └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     DATABASE (PostgreSQL / Supabase)                         │
│  profiles, haircodes, clients, hairdressers, notifications, etc.            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Request Flow (Step by Step)

### 3.1 User Signs In (Mobile)

1. User enters email/password on the login screen.
2. Mobile calls `supabase.auth.signInWithPassword()` (Supabase client).
3. Supabase returns a session with `access_token` (JWT) and `refresh_token`.
4. Supabase client stores the session in SecureStore (or AsyncStorage fallback).
5. `_layout.tsx` calls `setApiSessionGetter()` so `apiClient` can read the session.

### 3.2 App Startup (Mobile)

1. `_layout.tsx` mounts.
2. `setApiSessionGetter(async () => (await supabase.auth.getSession()).data.session)` is called.
3. `AuthProvider` checks session and routes to `(auth)`, `(hairdresser)`, or `(client)`.
4. `apiClient` uses `Constants.expoConfig.extra.EXPO_PUBLIC_API_URL` (from `.env` via `app.config.js`) as the API base URL.

### 3.3 API Request (e.g. Get My Profile)

1. Screen calls `api.get("/api/auth/me")` (or similar).
2. `apiClient.get()`:
   - Calls `getSessionFn()` to get the Supabase session.
   - Adds `Authorization: Bearer <access_token>` to headers.
   - Sends `GET http://<API_URL>/api/auth/me`.
3. Backend receives the request:
   - `authMiddleware` reads `Authorization` header.
   - Verifies JWT with `SUPABASE_JWT_SECRET`.
   - Sets `req.userId = decoded.sub` (Supabase user ID).
   - Passes to controller.
4. Controller uses `req.userId` to fetch the profile from the database via Prisma.
5. Response is sent back to the mobile app.

### 3.4 Database Access (Backend)

1. Prisma Client is generated from `apps/backend/prisma/schema.prisma`.
2. `DATABASE_URL` in `.env` points to PostgreSQL (e.g. Supabase connection string).
3. Controllers/services use `prisma.profile`, `prisma.haircode`, etc. to read/write data.

---

## 4. Fresh Clone Setup

When you clone the repo from GitHub on a new computer, follow these steps.

### 4.1 Prerequisites

- Node.js (v18+ recommended)
- npm (or pnpm if you use it)
- Expo CLI (optional; `npx expo` works)
- Supabase project (for auth + database)
- Git

### 4.2 Install Dependencies

From the **project root**:

```bash
npm install
```

This installs dependencies for the workspace and all apps (`backend`, `mobile/myHaircodeFinal`).

### 4.3 Backend Setup

1. **Create `.env` in `apps/backend/`** (copy from `.env.example`):

   ```bash
   cd apps/backend
   cp .env.example .env
   ```

2. **Edit `apps/backend/.env`** and set:

   | Variable | Where to get it |
   |----------|-----------------|
   | `DATABASE_URL` | Supabase Dashboard → Project Settings → Database → Connection string (URI) |
   | `SUPABASE_URL` | Supabase Dashboard → Project Settings → API → Project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Project Settings → API → service_role key |
   | `SUPABASE_JWT_SECRET` | Supabase Dashboard → Project Settings → API → JWT Secret |
   | `PORT` | Optional, default 3000 |

3. **Generate Prisma Client and run migrations**:

   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   ```

   If you have no migrations yet, you may need to create one:

   ```bash
   npx prisma migrate dev --name init
   ```

4. **Start the backend**:

   ```bash
   npm run dev
   ```

   Backend runs at `http://localhost:3000`.

### 4.4 Mobile Setup

1. **Create `.env` in `apps/mobile/myHaircodeFinal/`** (no `.env.example` in repo; create from scratch):

   ```env
   SUPABASE_PROJECTID=your-project-id
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_FUNCTION_URL=https://your-project.functions.supabase.co
   SUPABASE_ANON=your-anon-key
   EXPO_PUBLIC_API_URL=http://localhost:3000
   ```

   | Variable | Where to get it |
   |----------|-----------------|
   | `SUPABASE_PROJECTID` | Supabase Dashboard → Project Settings → General → Reference ID |
   | `SUPABASE_URL` | Supabase Dashboard → Project Settings → API → Project URL |
   | `SUPABASE_FUNCTION_URL` | `https://<project-id>.functions.supabase.co` |
   | `SUPABASE_ANON` | Supabase Dashboard → Project Settings → API → anon public key |
   | `EXPO_PUBLIC_API_URL` | See below |

2. **Set `EXPO_PUBLIC_API_URL`** based on how you run the app:

   | Scenario | Value |
   |----------|-------|
   | iOS Simulator | `http://localhost:3000` |
   | Android Emulator | `http://10.0.2.2:3000` |
   | Physical device on same Wi‑Fi | `http://<your-computer-ip>:3000` (e.g. `http://192.168.0.46:3000`) |

3. **Start the mobile app**:

   ```bash
   cd apps/mobile/myHaircodeFinal
   npm start
   ```

   Or with tunnel (for physical device):

   ```bash
   npm run tunnel
   ```

### 4.5 Quick Checklist (New Machine)

- [ ] `npm install` at root
- [ ] `apps/backend/.env` created and filled
- [ ] `npm run prisma:generate` and `npm run prisma:migrate` in backend
- [ ] `apps/mobile/myHaircodeFinal/.env` created and filled
- [ ] `EXPO_PUBLIC_API_URL` matches your setup (localhost / emulator / LAN IP)
- [ ] Backend running (`npm run dev` in `apps/backend`)
- [ ] Mobile running (`npm start` in `apps/mobile/myHaircodeFinal`)

---

## 5. Database Connection

### 5.1 How the Backend Connects

- Prisma reads `DATABASE_URL` from `apps/backend/.env`.
- Connection string format:  
  `postgresql://USER:PASSWORD@HOST:5432/postgres?schema=public`
- For Supabase: use the **URI** from Project Settings → Database.

### 5.2 Using a Different Database (Another Computer)

1. Create a new Supabase project, or use an existing one.
2. Copy the connection string from Supabase Dashboard → Database → Connection string.
3. Put it in `apps/backend/.env` as `DATABASE_URL`.
4. Run migrations so the schema matches:

   ```bash
   cd apps/backend
   npm run prisma:migrate
   ```

### 5.3 Inspecting the Database

```bash
cd apps/backend
npm run prisma:studio
```

Opens Prisma Studio at `http://localhost:5555` to browse and edit data.

### 5.4 Schema Location

- Schema: `apps/backend/prisma/schema.prisma`
- Models: `Profile`, `Client`, `Hairdresser`, `Haircode`, `HaircodeMedia`, `HairdresserClient`, `Inspiration`, `Notification`, `BlockedUser`, `PushToken`, etc.

---

## 6. Adding New Features Manually

### 6.1 Adding a New Database Model

1. Edit `apps/backend/prisma/schema.prisma` and add your model:

   ```prisma
   model MyNewModel {
     id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
     createdAt DateTime @default(now()) @map("created_at")
     userId    String   @map("user_id") @db.Uuid
     // ... fields
   }
   ```

2. Create and run a migration:

   ```bash
   cd apps/backend
   npx prisma migrate dev --name add_my_new_model
   ```

3. Regenerate Prisma Client (often done automatically):

   ```bash
   npm run prisma:generate
   ```

### 6.2 Adding a New API Route

1. **Create route file**  
   Example: `apps/backend/src/routes/myFeature.ts`

   ```typescript
   import { Router } from "express";
   import { authMiddleware } from "../middleware/auth";
   import { myFeatureController } from "../controllers/myFeature";

   const myFeatureRoutes = Router();
   myFeatureRoutes.use(authMiddleware);

   myFeatureRoutes.get("/", myFeatureController.list);
   myFeatureRoutes.post("/", myFeatureController.create);

   export { myFeatureRoutes };
   ```

2. **Create controller**  
   Example: `apps/backend/src/controllers/myFeature.ts`

   ```typescript
   import { Request, Response } from "express";
   import { prisma } from "../lib/prisma";

   export const myFeatureController = {
     async list(req: Request, res: Response) {
       const items = await prisma.myNewModel.findMany({
         where: { userId: req.userId },
       });
       res.json(items);
     },
     async create(req: Request, res: Response) {
       // ...
     },
   };
   ```

3. **Register route in `apps/backend/src/index.ts`**:

   ```typescript
   import { myFeatureRoutes } from "./routes/myFeature";
   // ...
   app.use("/api/my-feature", myFeatureRoutes);
   ```

### 6.3 Adding a New API Module in the Mobile App

1. Create `apps/mobile/myHaircodeFinal/src/api/myFeature/index.ts`:

   ```typescript
   import { api } from "@/lib/apiClient";

   export const myFeatureApi = {
     list: () => api.get<MyType[]>("/api/my-feature"),
     create: (data: CreateDto) => api.post("/api/my-feature", data),
   };
   ```

2. Use it in screens with TanStack Query:

   ```typescript
   const { data } = useQuery({
     queryKey: ["myFeature"],
     queryFn: () => myFeatureApi.list(),
   });
   ```

### 6.4 Adding a New Screen (Expo Router)

1. Add a file under `apps/mobile/myHaircodeFinal/src/app/`, e.g. `my-screen.tsx`.
2. It becomes a route automatically (e.g. `/my-screen`).
3. Use `router.push("/my-screen")` or `<Link href="/my-screen">` to navigate.

### 6.5 Adding a New Environment Variable

**Backend**

1. Add to `apps/backend/.env`.
2. Use in code: `process.env.MY_VAR`.
3. Update `apps/backend/.env.example` for others.

**Mobile**

1. Add to `apps/mobile/myHaircodeFinal/.env`.
2. Expose in `app.config.js` if needed at runtime:

   ```javascript
   extra: {
     // ...
     EXPO_PUBLIC_MY_VAR: process.env.MY_VAR || "",
   },
   ```

3. Access via `Constants.expoConfig.extra.EXPO_PUBLIC_MY_VAR`.

---

## 7. Environment Variables Reference

### Backend (`apps/backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string (Supabase URI) |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key |
| `SUPABASE_JWT_SECRET` | Yes | JWT secret for verifying Supabase tokens |
| `PORT` | No | Server port (default 3000) |

### Mobile (`apps/mobile/myHaircodeFinal/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_PROJECTID` | Yes | Supabase project reference ID |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_FUNCTION_URL` | Yes | Supabase Edge Functions URL |
| `SUPABASE_ANON` | Yes | Supabase anon/public key |
| `EXPO_PUBLIC_API_URL` | Yes | Backend API base URL |

---

## 8. Troubleshooting

### "Missing or invalid authorization"

- User is not logged in, or token expired.
- Check that `setApiSessionGetter` is called in `_layout.tsx`.
- Check that `EXPO_PUBLIC_API_URL` is correct and reachable from the device/emulator.

### "Server misconfiguration"

- `SUPABASE_JWT_SECRET` is missing or wrong in `apps/backend/.env`.
- Get the correct value from Supabase Dashboard → Project Settings → API → JWT Secret.

### "Invalid or expired token"

- Token may be expired; Supabase client should refresh it.
- Ensure `SUPABASE_JWT_SECRET` matches the one used by Supabase to sign tokens.

### Mobile can't reach the backend

- **Android Emulator**: Use `http://10.0.2.2:3000`, not `localhost`.
- **Physical device**: Use your computer’s LAN IP (e.g. `http://192.168.0.46:3000`).
- Ensure backend and device are on the same network.
- Try `npm run tunnel` in the mobile app for Expo tunnel mode.

### Prisma "Can't reach database server"

- Check `DATABASE_URL` in `apps/backend/.env`.
- For Supabase: ensure the URI uses the correct host, port 5432, and password.
- Check firewall/VPN; Supabase may need to allow your IP.

### "Module not found" after adding files

- Restart the dev server (`npm run dev` or `npm start`).
- For backend: run `npm run build` to ensure TypeScript compiles.

---

## Summary

| Action | Command / Location |
|--------|--------------------|
| Install deps | `npm install` (root) |
| Backend env | `apps/backend/.env` |
| Mobile env | `apps/mobile/myHaircodeFinal/.env` |
| DB migrations | `cd apps/backend && npm run prisma:migrate` |
| Prisma Client | `cd apps/backend && npm run prisma:generate` |
| DB GUI | `cd apps/backend && npm run prisma:studio` |
| Start backend | `cd apps/backend && npm run dev` |
| Start mobile | `cd apps/mobile/myHaircodeFinal && npm start` |
| Schema | `apps/backend/prisma/schema.prisma` |
| Routes | `apps/backend/src/index.ts` + `src/routes/*` |
| API client | `apps/mobile/myHaircodeFinal/src/lib/apiClient.ts` |
