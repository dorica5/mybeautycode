# myHaircode Monorepo

Monorepo with Express backend and React Native mobile app.

## Structure

- `apps/backend` - Express + Prisma API server
- `apps/mobile/myHaircodeFinal` - React Native/Expo app (view-only, uses API)

## Backend Setup

1. Copy `.env.example` to `.env` in `apps/backend`
2. Set `DATABASE_URL` (Supabase PostgreSQL connection string)
3. Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`
4. Run `npm run prisma:generate` then `npm run dev`

## Mobile Setup

1. Set `EXPO_PUBLIC_API_URL` in app config (e.g. `http://localhost:3000` for dev)
2. Keep `SUPABASE_URL` and `SUPABASE_ANON` for Auth only
3. Run `npx expo start`

## API Base URL

For local development, use `http://localhost:3000`. For Android emulator, use `http://10.0.2.2:3000`.
