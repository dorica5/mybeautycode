/**
 * Test script: Sign in to Supabase, get token, verify against backend.
 * Run: node scripts/test-auth.js
 * Add to apps/backend/.env: TEST_EMAIL=your@email.com TEST_PASSWORD=yourpassword
 * (SUPABASE_ANON comes from mobile .env if missing in backend)
 */
require("dotenv").config();
require("dotenv").config({ path: require("path").join(__dirname, "../../mobile/myHaircodeFinal/.env") });
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON = process.env.SUPABASE_ANON || process.env.SUPABASE_SERVICE_ROLE_KEY;
const API_URL = process.env.EXPO_PUBLIC_API_URL || process.env.API_URL || "http://localhost:3000";

if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.error("Missing SUPABASE_URL or SUPABASE_ANON/SERVICE_ROLE_KEY");
  process.exit(1);
}

const email = process.env.TEST_EMAIL || process.argv[2];
const password = process.env.TEST_PASSWORD || process.argv[3];

if (!email || !password) {
  console.log("Usage: node scripts/test-auth.js [email] [password]");
  console.log("   or add TEST_EMAIL and TEST_PASSWORD to .env\n");
}

async function main() {
  console.log("Supabase URL:", SUPABASE_URL);
  console.log("Backend API:", API_URL);
  console.log("");

  // 1. Health check
  try {
    const health = await fetch(`${API_URL}/health`).then((r) => r.json());
    console.log("✓ Backend health:", health.status);
  } catch (e) {
    console.error("✗ Backend unreachable:", e.message);
    return;
  }

  if (!email || !password) {
    console.log("\nSkipping auth test - add TEST_EMAIL and TEST_PASSWORD to .env");
    return;
  }

  // 2. Sign in to Supabase
  const signRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON },
    body: JSON.stringify({ email, password }),
  });

  const signData = await signRes.json();
  if (signData.error || !signData.access_token) {
    console.error("✗ Supabase sign-in failed:", signData.error_description || signData.message || "No access_token");
    return;
  }

  const token = signData.access_token;
  console.log("✓ Got Supabase token, length:", token?.length);

  // 3. Decode JWT payload (no verify) to see structure
  const parts = token.split(".");
  if (parts.length === 3) {
    const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());
    console.log("  JWT payload sub:", payload.sub, "| iss:", payload.iss, "| exp:", new Date(payload.exp * 1000).toISOString());
  }

  // 4. Verify with JWKS (local test)
  try {
    const { jwtVerify, createRemoteJWKSet } = await import("jose");
    const jwks = createRemoteJWKSet(new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`));
    const { payload } = await jwtVerify(token, jwks);
    console.log("✓ Local JWT verify OK, sub:", payload.sub);
  } catch (e) {
    console.error("✗ Local JWT verify FAILED:", e.message);
  }

  // 5. Call backend /api/auth/me
  const meRes = await fetch(`${API_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const meText = await meRes.text();
  console.log("\nBackend /api/auth/me:", meRes.status, meText.slice(0, 200));
  if (meRes.ok) {
    console.log("✓ Backend auth OK");
  } else {
    console.log("✗ Backend auth FAILED");
  }
}

main().catch(console.error);
