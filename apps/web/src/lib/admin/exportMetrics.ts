import type { AdminMetrics } from "./metrics";

type Row = { section: string; metric: string; value: string | number; period?: string };

function escapeCsvCell(value: string | number): string {
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function flattenMetrics(metrics: AdminMetrics): Row[] {
  const rows: Row[] = [];
  const push = (section: string, metric: string, value: string | number, period?: string) => {
    rows.push({ section, metric, value, period });
  };

  push("Report", "Generated at", metrics.generatedAt);

  push("Users", "Total users", metrics.users.total);
  push("Users", "Client accounts", metrics.users.clients);
  push("Users", "Professional accounts", metrics.users.professionals);
  push("Users", "Setup complete", metrics.users.setupComplete);
  push("Users", "Signups", metrics.users.signupsLast7Days, "7d");
  push("Users", "Signups", metrics.users.signupsLast30Days, "30d");
  push("Users", "Active users", metrics.engagement.activeUsersLast7Days, "7d");
  push("Users", "Active users", metrics.engagement.activeUsersLast30Days, "30d");

  push("Engagement", "Visits logged", metrics.engagement.visitsLast7Days, "7d");
  push("Engagement", "Visits logged", metrics.engagement.visitsTotal, "lifetime");
  push("Engagement", "Inspirations saved", metrics.engagement.inspirationsLast7Days, "7d");
  push("Engagement", "Inspirations saved", metrics.engagement.inspirationsTotal, "lifetime");
  push("Engagement", "Inspiration shares", metrics.engagement.inspirationSharesLast7Days, "7d");
  push("Engagement", "Client–pro links", metrics.engagement.clientProLinksActive, "active");
  push("Engagement", "Client–pro links", metrics.engagement.clientProLinksTotal, "total");

  push("Subscriptions", "Paying professionals", metrics.subscriptions.activeInDatabase);
  push("Subscriptions", "RevenueCat webhook configured", metrics.subscriptions.webhookConfigured ? "yes" : "no");

  push("Funnel", "Signed up", metrics.funnel.signedUp);
  push("Funnel", "Setup complete", metrics.funnel.setupComplete);
  push("Funnel", "Logged a visit", metrics.funnel.withAtLeastOneVisit);
  push("Funnel", "Saved inspiration", metrics.funnel.withAtLeastOneInspiration);
  push("Funnel", "Linked to a pro", metrics.funnel.withClientProLink);

  push("Professionals", "Multi-profession accounts", metrics.professionals.multiProfessionAccounts);
  push("Professionals", "On map (salon set)", metrics.professionals.withSalonOnMap);
  push("Professionals", "Profile views", metrics.professionals.profileViewsTotal, "lifetime");
  push("Professionals", "Booking clicks", metrics.professionals.bookingClicksTotal, "lifetime");

  for (const row of metrics.professionals.byProfession) {
    push("Profession by lane", row.code, row.count);
  }

  for (const row of metrics.geography.slice(0, 20)) {
    push("Geography", row.country, row.count);
  }

  if (metrics.map) {
    push("Map", "Map users", metrics.map.usersLast7Days, "7d");
    push("Map", "Map users", metrics.map.usersLast30Days, "30d");
    push("Map", "Map opens", metrics.map.opensLast7Days, "7d");
    push("Map", "Map opens", metrics.map.opensTotal, "lifetime");
    push("Map", "Location searches", metrics.map.searchesLast7Days, "7d");
    push("Map", "Salon pin taps", metrics.map.pinOpensLast7Days, "7d");
    push("Map", "Pro profiles from map", metrics.map.proProfileOpensLast7Days, "7d");
    for (const row of metrics.map.byEventLast7Days) {
      push("Map events", row.eventType, row.count, "7d");
    }
    for (const row of metrics.map.opensByDay) {
      push("Map opens by day", row.date, row.count);
    }
  }

  if (metrics.marketing) {
    const m = metrics.marketing;
    push("Marketing", "Profile views", m.profileViewsTotal, "lifetime");
    push("Marketing", "Profile views", m.profileViewsLast7Days, "7d");
    push("Marketing", "Booking clicks", m.bookingClicksTotal, "lifetime");
    push("Marketing", "Booking clicks", m.bookingClicksLast7Days, "7d");
    push("Marketing", "Booking rate", `${m.bookingRatePct}%`, "lifetime");
    push("Marketing", "Social clicks", m.socialClicksTotal, "lifetime");
    push("Marketing", "Social clicks", m.socialClicksLast7Days, "7d");
    push("Marketing", "Phone taps", m.phoneClicksLast7Days, "7d");
    push("Marketing", "Paywall views", m.paywallViewsLast7Days, "7d");
    push("Marketing", "Paywall opens (limit)", m.paywallOpensLast7Days, "7d");
    push("Marketing", "Subscriptions purchased", m.subscriptionsPurchasedLast7Days, "7d");
    push("Marketing", "Client linked to pro", m.clientLinksCreatedLast7Days, "7d");
    push("Marketing", "Feedback submitted", m.feedbackSubmittedLast7Days, "7d");
    push("Marketing", "Signups tracked", m.signupsTrackedLast7Days, "7d");
    for (const row of m.socialByPlatform) {
      push("Social platform", row.platform, row.count, "lifetime");
    }
    for (const row of m.keyEventsLast7Days) {
      push("Product events", row.eventType, row.count, "7d");
    }
  }

  for (const row of metrics.trends.signupsByDay) {
    push("Trend — signups", row.date, row.count);
  }
  for (const row of metrics.trends.visitsByDay) {
    push("Trend — visits", row.date, row.count);
  }

  for (const row of metrics.productEventsLast7Days) {
    push("All product events", row.eventType, row.count, "7d");
  }

  return rows;
}

export function metricsToCsv(metrics: AdminMetrics): string {
  const header = "Section,Metric,Value,Period";
  const lines = flattenMetrics(metrics).map((row) =>
    [row.section, row.metric, row.value, row.period ?? ""]
      .map(escapeCsvCell)
      .join(",")
  );
  return [header, ...lines].join("\r\n");
}

function downloadBlob(content: Blob, filename: string) {
  const url = URL.createObjectURL(content);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadMetricsCsv(metrics: AdminMetrics) {
  const csv = metricsToCsv(metrics);
  const stamp = metrics.generatedAt.slice(0, 10);
  downloadBlob(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
    `myne-analytics-${stamp}.csv`
  );
}

export async function downloadMetricsPdf(metrics: AdminMetrics) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const margin = 40;
  let y = margin;

  doc.setFontSize(18);
  doc.text("myne — Analytics Report", margin, y);
  y += 22;
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(`Generated ${new Date(metrics.generatedAt).toLocaleString()}`, margin, y);
  y += 24;
  doc.setTextColor(0);

  const rows = flattenMetrics(metrics);
  const tableBody = rows.map((r) => [
    r.section,
    r.metric,
    String(r.value),
    r.period ?? "",
  ]);

  autoTable(doc, {
    startY: 72,
    head: [["Section", "Metric", "Value", "Period"]],
    body: tableBody,
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [20, 20, 20], textColor: 255 },
    columnStyles: {
      0: { cellWidth: 110 },
      1: { cellWidth: 140 },
      2: { cellWidth: 70 },
      3: { cellWidth: 55 },
    },
    margin: { left: margin, right: margin },
  });

  const stamp = metrics.generatedAt.slice(0, 10);
  doc.save(`myne-analytics-${stamp}.pdf`);
}
