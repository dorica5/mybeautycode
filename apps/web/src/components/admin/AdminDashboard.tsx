"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient, getApiBaseUrl } from "@/lib/admin/client";
import { fetchAdminMetrics, type AdminMetrics } from "@/lib/admin/metrics";

const STORAGE_KEY = "myne_admin_key";

function pct(part: number, whole: number): string {
  if (whole <= 0) return "0%";
  return `${Math.round((part / whole) * 100)}%`;
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border-2 border-card-border bg-primary-white p-5 shadow-sm">
      <p className="text-sm text-foreground/70">{label}</p>
      <p className="font-display mt-1 text-3xl tracking-tight text-foreground">
        {value}
      </p>
      {hint ? (
        <p className="mt-2 text-xs text-foreground/55">{hint}</p>
      ) : null}
    </div>
  );
}

function BarRow({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const width = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-foreground/80">{label}</span>
        <span className="font-medium tabular-nums">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-secondary-green">
        <div
          className="h-full rounded-full bg-foreground"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function FunnelStep({
  label,
  count,
  total,
}: {
  label: string;
  count: number;
  total: number;
}) {
  return (
    <div className="flex items-center justify-between border-b border-card-border/40 py-3 last:border-0">
      <span className="text-sm text-foreground/85">{label}</span>
      <span className="text-sm font-medium tabular-nums">
        {count}{" "}
        <span className="text-foreground/50">({pct(count, total)})</span>
      </span>
    </div>
  );
}

function MiniTrend({
  title,
  points,
}: {
  title: string;
  points: { date: string; count: number }[];
}) {
  const max = Math.max(1, ...points.map((p) => p.count));
  return (
    <div className="rounded-2xl border-2 border-card-border bg-primary-white p-5">
      <h3 className="font-display text-lg">{title}</h3>
      <div className="mt-4 flex h-24 items-end gap-1">
        {points.map((p) => (
          <div
            key={p.date}
            className="flex-1 rounded-t bg-foreground/80"
            style={{ height: `${Math.max(8, (p.count / max) * 100)}%` }}
            title={`${p.date}: ${p.count}`}
          />
        ))}
      </div>
      {points.length > 0 ? (
        <p className="mt-2 text-xs text-foreground/50">
          {points[0]?.date} → {points[points.length - 1]?.date}
        </p>
      ) : null}
    </div>
  );
}

export function AdminDashboard() {
  const [adminKey, setAdminKey] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      setAdminKey(saved);
      setAuthed(true);
    }
  }, []);

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const storedKey = sessionStorage.getItem(STORAGE_KEY)?.trim() ?? "";
      const key = adminKey.trim() || storedKey;
      const data = await fetchAdminMetrics({
        adminKey: accessToken ? undefined : key || undefined,
        accessToken: accessToken ?? undefined,
      });
      setMetrics(data);
    } catch (e) {
      const base = getApiBaseUrl();
      const msg = e instanceof Error ? e.message : "Failed to load metrics";
      setError(`${msg} (API: ${base})`);
      setMetrics(null);
    } finally {
      setLoading(false);
    }
  }, [adminKey, accessToken]);

  useEffect(() => {
    if (authed) void loadMetrics();
  }, [authed, loadMetrics]);

  const signInWithKey = () => {
    if (!adminKey.trim()) {
      setError("Enter an admin API key");
      return;
    }
    sessionStorage.setItem(STORAGE_KEY, adminKey.trim());
    setAccessToken(null);
    setAuthed(true);
    setError(null);
  };

  const signInWithEmail = async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Supabase is not configured on the web app");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      const token = data.session?.access_token;
      if (!token) throw new Error("No session token");
      sessionStorage.removeItem(STORAGE_KEY);
      setAccessToken(token);
      setAuthed(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  const signOut = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    setAdminKey("");
    setAccessToken(null);
    setAuthed(false);
    setMetrics(null);
  };

  const mapEvents = useMemo(() => {
    if (!metrics) return [];
    return metrics.productEventsLast7Days.filter((e) =>
      e.eventType.startsWith("map_")
    );
  }, [metrics]);

  if (!authed) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-12">
        <h1 className="font-display text-4xl">myne analytics</h1>
        <p className="mt-2 text-foreground/70">
          Admin dashboard — business metrics from your database and product
          events from the app.
        </p>

        <div className="mt-8 space-y-6 rounded-2xl border-2 border-card-border bg-primary-white p-6">
          <div>
            <label className="text-sm font-medium">Admin API key</label>
            <input
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              className="mt-2 w-full rounded-xl border border-card-border bg-background px-4 py-3 text-sm"
              placeholder="ADMIN_METRICS_API_KEY from backend"
            />
            <button
              type="button"
              onClick={signInWithKey}
              className="mt-3 w-full rounded-full bg-foreground px-4 py-3 text-sm font-medium text-primary-white"
            >
              Continue with API key
            </button>
          </div>

          <div className="relative text-center text-xs text-foreground/50">
            <span className="bg-primary-white px-2">or</span>
            <div className="absolute inset-x-0 top-1/2 -z-10 border-t border-card-border/50" />
          </div>

          <div>
            <label className="text-sm font-medium">Admin account (Supabase)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-xl border border-card-border bg-background px-4 py-3 text-sm"
              placeholder="you@myne.no"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-xl border border-card-border bg-background px-4 py-3 text-sm"
              placeholder="Password"
            />
            <button
              type="button"
              onClick={() => void signInWithEmail()}
              disabled={loading}
              className="mt-3 w-full rounded-full border-2 border-foreground bg-transparent px-4 py-3 text-sm font-medium"
            >
              Sign in with email
            </button>
            <p className="mt-2 text-xs text-foreground/55">
              Your user must exist in the{" "}
              <code className="rounded bg-secondary-green px-1">admin_users</code>{" "}
              table.
            </p>
          </div>

          {error ? (
            <p className="rounded-xl bg-red-100/80 px-3 py-2 text-sm text-red-900">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">myne analytics</h1>
          {metrics ? (
            <p className="mt-1 text-sm text-foreground/60">
              Updated {new Date(metrics.generatedAt).toLocaleString()}
            </p>
          ) : null}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void loadMetrics()}
            disabled={loading}
            className="rounded-full border-2 border-foreground px-4 py-2 text-sm font-medium"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <button
            type="button"
            onClick={signOut}
            className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-primary-white"
          >
            Sign out
          </button>
        </div>
      </div>

      {error ? (
        <p className="mt-6 rounded-xl bg-red-100/80 px-4 py-3 text-sm text-red-900">
          {error}
        </p>
      ) : null}

      {!metrics && loading ? (
        <p className="mt-12 text-center text-foreground/60">Loading metrics…</p>
      ) : null}

      {metrics ? (
        <div className="mt-8 space-y-8">
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Total users" value={metrics.users.total} />
            <MetricCard
              label="Active users (7d)"
              value={metrics.engagement.activeUsersLast7Days}
              hint={`${metrics.engagement.activeUsersLast30Days} in last 30 days`}
            />
            <MetricCard
              label="Professional accounts"
              value={metrics.users.professionals}
              hint={`${metrics.users.clients} client-only accounts`}
            />
            <MetricCard
              label="Paying pros"
              value={metrics.subscriptions.activeInDatabase}
              hint={
                metrics.subscriptions.webhookConfigured
                  ? "RevenueCat webhook configured"
                  : "Set REVENUECAT_WEBHOOK_SECRET on backend"
              }
            />
          </section>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Visits (7d)"
              value={metrics.engagement.visitsLast7Days}
              hint={`${metrics.engagement.visitsTotal} total logged`}
            />
            <MetricCard
              label="Inspirations (7d)"
              value={metrics.engagement.inspirationsLast7Days}
              hint={`${metrics.engagement.inspirationsTotal} total saved`}
            />
            <MetricCard
              label="Inspiration shares (7d)"
              value={metrics.engagement.inspirationSharesLast7Days}
            />
            <MetricCard
              label="Signups (7d)"
              value={metrics.users.signupsLast7Days}
              hint={`${metrics.users.signupsLast30Days} in last 30 days`}
            />
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <MiniTrend title="Signups (14 days)" points={metrics.trends.signupsByDay} />
            <MiniTrend title="Visits logged (14 days)" points={metrics.trends.visitsByDay} />
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border-2 border-card-border bg-primary-white p-5">
              <h2 className="font-display text-xl">Onboarding funnel</h2>
              <p className="mt-1 text-sm text-foreground/60">
                Where users drop off after signup
              </p>
              <div className="mt-4">
                <FunnelStep
                  label="Signed up"
                  count={metrics.funnel.signedUp}
                  total={metrics.funnel.signedUp}
                />
                <FunnelStep
                  label="Setup complete"
                  count={metrics.funnel.setupComplete}
                  total={metrics.funnel.signedUp}
                />
                <FunnelStep
                  label="Logged at least one visit"
                  count={metrics.funnel.withAtLeastOneVisit}
                  total={metrics.funnel.signedUp}
                />
                <FunnelStep
                  label="Saved at least one inspiration"
                  count={metrics.funnel.withAtLeastOneInspiration}
                  total={metrics.funnel.signedUp}
                />
                <FunnelStep
                  label="Linked to a professional"
                  count={metrics.funnel.withClientProLink}
                  total={metrics.funnel.signedUp}
                />
              </div>
            </div>

            <div className="rounded-2xl border-2 border-card-border bg-primary-white p-5">
              <h2 className="font-display text-xl">Professionals</h2>
              <div className="mt-4 space-y-3">
                <MetricCard
                  label="Multi-profession pros"
                  value={metrics.professionals.multiProfessionAccounts}
                  hint="Pros with 2+ profession lanes"
                />
                <MetricCard
                  label="On map (salon set)"
                  value={metrics.professionals.withSalonOnMap}
                  hint="Profession lanes linked to a salon pin"
                />
                <p className="text-sm text-foreground/70">
                  Profile views (lifetime):{" "}
                  <strong>{metrics.professionals.profileViewsTotal}</strong>
                  {" · "}
                  Booking clicks:{" "}
                  <strong>{metrics.professionals.bookingClicksTotal}</strong>
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border-2 border-card-border bg-primary-white p-5">
              <h2 className="font-display text-xl">Pros by profession</h2>
              <div className="mt-4 space-y-3">
                {metrics.professionals.byProfession.map((row) => (
                  <BarRow
                    key={row.code}
                    label={row.code}
                    value={row.count}
                    max={Math.max(
                      ...metrics.professionals.byProfession.map((r) => r.count),
                      1
                    )}
                  />
                ))}
              </div>
            </div>

            <div className="rounded-2xl border-2 border-card-border bg-primary-white p-5">
              <h2 className="font-display text-xl">Users by country</h2>
              <div className="mt-4 space-y-3">
                {metrics.geography.slice(0, 10).map((row) => (
                  <BarRow
                    key={row.country}
                    label={row.country}
                    value={row.count}
                    max={metrics.geography[0]?.count ?? 1}
                  />
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border-2 border-card-border bg-primary-white p-5">
            <h2 className="font-display text-xl">Product events (7 days)</h2>
            <p className="mt-1 text-sm text-foreground/60">
              Map, app opens, and other tracked actions from the mobile app
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {metrics.productEventsLast7Days.length === 0 ? (
                <p className="text-sm text-foreground/60">
                  No events yet — ship the latest app build and use the map to
                  populate this section.
                </p>
              ) : (
                metrics.productEventsLast7Days.map((row) => (
                  <div
                    key={row.eventType}
                    className="flex justify-between rounded-xl bg-secondary-green/60 px-3 py-2 text-sm"
                  >
                    <span>{row.eventType}</span>
                    <span className="font-medium tabular-nums">{row.count}</span>
                  </div>
                ))
              )}
            </div>
            {mapEvents.length > 0 ? (
              <p className="mt-4 text-xs text-foreground/55">
                Map events (7d):{" "}
                {mapEvents.map((e) => `${e.eventType} (${e.count})`).join(" · ")}
              </p>
            ) : null}
          </section>

          <section className="rounded-2xl border border-card-border/60 bg-card/40 p-4 text-sm text-foreground/70">
            <strong>RevenueCat:</strong> Products are approved on App Store and
            Play Store. Mobile sync after purchase is live; configure webhook URL{" "}
            <code className="rounded bg-primary-white px-1">
              /api/billing/webhooks/revenuecat
            </code>{" "}
            with <code className="rounded bg-primary-white px-1">REVENUECAT_WEBHOOK_SECRET</code>{" "}
            for server-side subscriber counts. PostHog (EU) still captures
            funnels separately in your PostHog project.
          </section>
        </div>
      ) : null}
    </div>
  );
}
