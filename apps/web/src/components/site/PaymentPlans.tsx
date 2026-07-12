"use client";

import { AppDownloadBadges } from "@/components/site/AppDownloadBadges";
import {
  formatBillingTemplate,
  webBillingConfig,
} from "@/lib/billingConfig";
import { useSiteLanguage } from "@/providers/LanguageProvider";

function PlanCard({
  title,
  price,
  subtitle,
  badge,
  cornerBadge,
  features,
}: {
  title: string;
  price?: string;
  subtitle?: string;
  badge?: string;
  cornerBadge?: string;
  features: string[];
}) {
  return (
    <article className="relative flex flex-col overflow-hidden rounded-[18px] border-2 border-foreground/10 bg-primary-white p-4 text-foreground md:h-full md:p-5">
      {cornerBadge ? (
        <span className="absolute right-0 top-0 rounded-bl-[14px] rounded-tr-[18px] bg-foreground px-3 py-1.5 text-xs font-semibold tracking-wide text-primary-white">
          {cornerBadge}
        </span>
      ) : null}

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 pr-2">
          <h3 className="text-lg font-medium">{title}</h3>
          {badge ? (
            <span className="rounded-full bg-secondary-green/80 px-2.5 py-1 text-xs font-medium">
              {badge}
            </span>
          ) : null}
        </div>
        {subtitle ? <p className="mt-1.5 text-sm">{subtitle}</p> : null}
        {price ? (
          <p className="mt-2 text-sm font-medium md:text-base">{price}</p>
        ) : null}
      </div>

      <ul className="mt-4 space-y-2 md:flex-1">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm">
            <span
              className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground"
              aria-hidden
            />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

export function PaymentPlans() {
  const { t } = useSiteLanguage();
  const { paymentPlans: plans } = t;
  const billingValues = {
    limit: webBillingConfig.FREE_VISIT_LIMIT,
    monthlyPrice: webBillingConfig.MONTHLY_PRICE_NOK,
    annualPrice: webBillingConfig.ANNUAL_PRICE_NOK,
  };

  const freemiumFeatures = plans.freemium.features.map((feature) =>
    formatBillingTemplate(feature, billingValues)
  );
  const monthlyFeatures = plans.monthly.features.map((feature) =>
    formatBillingTemplate(feature, billingValues)
  );
  const annualFeatures = plans.annual.features.map((feature) =>
    formatBillingTemplate(feature, billingValues)
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <p className="text-center text-base text-foreground md:text-lg">
        {t.paymentIntro}
      </p>

      <div className="flex flex-col gap-4 md:grid md:grid-cols-3 md:items-stretch md:gap-5">
        <PlanCard
          title={plans.freemium.title}
          badge={plans.freemium.badge}
          features={freemiumFeatures}
        />

        <PlanCard
          title={plans.monthly.title}
          price={
            plans.monthly.priceLabel
              ? formatBillingTemplate(plans.monthly.priceLabel, billingValues)
              : undefined
          }
          features={monthlyFeatures}
        />

        <PlanCard
          title={plans.annual.title}
          price={
            plans.annual.priceLabel
              ? formatBillingTemplate(plans.annual.priceLabel, billingValues)
              : undefined
          }
          cornerBadge={plans.annual.badge}
          features={annualFeatures}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-3 max-md:mt-10 md:mt-0">
        <p className="text-center text-sm text-foreground">
          {t.paymentDownloadHint}
        </p>
        <AppDownloadBadges />
      </div>

      <p className="relative z-10 max-w-md self-center text-center text-sm text-foreground max-md:mt-8 md:max-w-none md:text-base">
        {t.paymentFootnote}
      </p>
    </div>
  );
}
