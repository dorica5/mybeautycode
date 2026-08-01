export type AdminMetrics = {
  generatedAt: string;
  users: {
    total: number;
    clients: number;
    professionals: number;
    setupComplete: number;
    setupIncomplete: number;
    signupsLast7Days: number;
    signupsLast30Days: number;
  };
  engagement: {
    activeUsersLast7Days: number;
    activeUsersLast30Days: number;
    visitsLast7Days: number;
    visitsLast30Days: number;
    visitsTotal: number;
    inspirationsLast7Days: number;
    inspirationsTotal: number;
    inspirationSharesLast7Days: number;
    clientProLinksTotal: number;
    clientProLinksActive: number;
  };
  professionals: {
    multiProfessionAccounts: number;
    withSalonOnMap: number;
    byProfession: { code: string; count: number }[];
    profileViewsTotal: number;
    bookingClicksTotal: number;
  };
  subscriptions: {
    activeInDatabase: number;
    revenueCatReady: boolean;
    webhookConfigured: boolean;
  };
  funnel: {
    signedUp: number;
    setupComplete: number;
    withAtLeastOneVisit: number;
    withAtLeastOneInspiration: number;
    withClientProLink: number;
  };
  geography: { country: string; count: number }[];
  productEventsLast7Days: { eventType: string; count: number }[];
  map: {
    usersLast7Days: number;
    usersLast30Days: number;
    opensLast7Days: number;
    opensLast30Days: number;
    opensTotal: number;
    searchesLast7Days: number;
    pinOpensLast7Days: number;
    proProfileOpensLast7Days: number;
    byEventLast7Days: { eventType: string; count: number }[];
    opensByDay: { date: string; count: number }[];
  };
  marketing: {
    profileViewsTotal: number;
    bookingClicksTotal: number;
    socialClicksTotal: number;
    bookingRatePct: number;
    profileViewsLast7Days: number;
    bookingClicksLast7Days: number;
    socialClicksLast7Days: number;
    phoneClicksLast7Days: number;
    paywallViewsLast7Days: number;
    paywallOpensLast7Days: number;
    subscriptionsPurchasedLast7Days: number;
    clientLinksCreatedLast7Days: number;
    feedbackSubmittedLast7Days: number;
    signupsTrackedLast7Days: number;
    socialByPlatform: { platform: string; count: number }[];
    keyEventsLast7Days: { eventType: string; count: number }[];
  };
  trends: {
    signupsByDay: { date: string; count: number }[];
    visitsByDay: { date: string; count: number }[];
  };
};

export async function fetchAdminMetrics(auth: {
  adminKey?: string;
  accessToken?: string;
}): Promise<AdminMetrics> {
  const { getApiBaseUrl } = await import("./client");
  const headers: Record<string, string> = {};
  if (auth.adminKey?.trim()) {
    headers["X-Admin-Key"] = auth.adminKey.trim();
  } else if (auth.accessToken?.trim()) {
    headers.Authorization = `Bearer ${auth.accessToken.trim()}`;
  } else {
    throw new Error("Missing admin credentials");
  }

  const res = await fetch(`${getApiBaseUrl()}/api/admin/metrics`, { headers });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<AdminMetrics>;
}
