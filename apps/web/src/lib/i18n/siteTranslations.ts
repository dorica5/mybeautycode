import type { SiteLanguageCode } from "@/lib/languages";
import { BRAND_NAME } from "@/lib/brand";

export type PaymentPlanCopy = {
  title: string;
  badge?: string;
  subtitle?: string;
  priceLabel?: string;
  features: string[];
};

export type SiteTranslations = {
  nav: {
    homeAriaLabel: string;
    howItWorks: string;
    forProfessionals: string;
    payment: string;
    aboutUs: string;
  };
  heroSubtitle: string;
  download: {
    ariaLabel: string;
    appStoreTop: string;
    appStoreBottom: string;
    googlePlayTop: string;
    googlePlayNormal: string;
    googlePlayBold: string;
  };
  sections: {
    howItWorks: string;
    forProfessionals: string;
    aboutUs: string;
    payment: string;
  };
  clientSteps: [string, string, string];
  proSteps: [string, string, string];
  aboutBody: string[];
  aboutSignOff: string;
  paymentIntro: string;
  paymentFootnote: string;
  paymentDownloadHint: string;
  paymentPlans: {
    freemium: PaymentPlanCopy;
    monthly: PaymentPlanCopy;
    annual: PaymentPlanCopy;
  };
  comingSoon: string;
  language: {
    select: string;
    current: (label: string) => string;
  };
  footer: {
    privacyPolicy: string;
    contactUs: string;
    backHome: string;
    contactBody: string;
  };
};

const en: SiteTranslations = {
  nav: {
    homeAriaLabel: `${BRAND_NAME} home`,
    howItWorks: "How it works",
    forProfessionals: "For professionals",
    payment: "Plans for professionals",
    aboutUs: "About us",
  },
  heroSubtitle:
    "Your beauty history follows you — discover professionals in your area who already knows what you need",
  download: {
    ariaLabel: "Download the app",
    appStoreTop: "Download on the",
    appStoreBottom: "App Store",
    googlePlayTop: "Get it on",
    googlePlayNormal: "Google ",
    googlePlayBold: "Play",
  },
  sections: {
    howItWorks: "How it works",
    forProfessionals: "For professionals",
    aboutUs: "About us",
    payment: "Plans for professionals",
  },
  clientSteps: [
    "Download the app",
    "Search for beauty professionals",
    "Share access to your journal",
  ],
  proSteps: [
    "Create a professional account",
    "Get discovered",
    "See all client history",
  ],
  aboutBody: [
    `${BRAND_NAME} was born out of a simple frustration — why should you have to explain your hair history every time you walk into a new salon?`,
    `We built ${BRAND_NAME} to give clients ownership of their own beauty journey, and to give professionals the tools to do their best work from day one. Your treatment history, your preferences — all in one place, shared only with the professionals you choose.`,
    `We also believe that finding the right professional should be easier. Whether you are looking for a hairdresser who specialises in afro hair, a nail technician with a specific style, or a brow stylist in your area — ${BRAND_NAME} helps you discover professionals who are genuinely great at exactly what you need.`,
    `We are a small team based in Bergen, Norway, with hairdressing background and coding skills, building something we believe the beauty industry has needed for a long time.`,
  ],
  aboutSignOff: "With love, Cecilie & Dorcas 🖤",
  paymentIntro:
    "For professionals ready to grow. Always free for clients.",
  paymentFootnote:
    "Subscriptions are purchased in the app. Cancel anytime in the App Store or Google Play.",
  paymentDownloadHint: "Download the app to subscribe",
  paymentPlans: {
    freemium: {
      title: "Freemium",
      badge: "Free",
      features: [
        "{{limit}} visits included",
        "Map search — get discovered by new clients",
      ],
    },
    monthly: {
      title: "Monthly",
      priceLabel: "NOK {{monthlyPrice}} / month",
      features: [
        "Unlimited visits — cancel anytime",
        "See what other professionals have done with your clients before",
        "Map search — get discovered by new clients",
      ],
    },
    annual: {
      title: "Annual",
      badge: "2 months free",
      priceLabel: "NOK {{annualPrice}} / year",
      features: [
        "Unlimited visits — cancel anytime",
        "See what other professionals have done with your clients before",
        "Map search — get discovered by new clients",
      ],
    },
  },
  comingSoon: "Coming soon",
  language: {
    select: "Select language",
    current: (label) => `Language: ${label}`,
  },
  footer: {
    privacyPolicy: "Privacy policy",
    contactUs: "Contact us",
    backHome: "Back to home",
    contactBody:
      "Questions, feedback, or support? We would love to hear from you.",
  },
};

const nb: SiteTranslations = {
  nav: {
    homeAriaLabel: `${BRAND_NAME} hjem`,
    howItWorks: "Slik fungerer det",
    forProfessionals: "For fagfolk",
    payment: "Abonnement for fagpersoner",
    aboutUs: "Om oss",
  },
  heroSubtitle:
    "Din skjønnhetshistorikk følger deg — finn fagfolk i ditt område som allerede vet hva du trenger",
  download: {
    ariaLabel: "Last ned appen",
    appStoreTop: "Last ned i",
    appStoreBottom: "App Store",
    googlePlayTop: "Få den på",
    googlePlayNormal: "Google ",
    googlePlayBold: "Play",
  },
  sections: {
    howItWorks: "Slik fungerer det",
    forProfessionals: "For fagfolk",
    aboutUs: "Om oss",
    payment: "Abonnement for fagpersoner",
  },
  clientSteps: [
    "Last ned appen",
    "Søk etter skjønnhetsfagfolk",
    "Del tilgang til journalen din",
  ],
  proSteps: [
    "Opprett en profesjonell konto",
    "Bli oppdaget",
    "Se all kundehistorikk",
  ],
  aboutBody: [
    `${BRAND_NAME} ble til av en enkel frustrasjon — hvorfor må du forklare hårhistorikken din hver gang du går inn på en ny salong?`,
    `Vi bygde ${BRAND_NAME} for å gi kunder eierskap til sin egen skjønnhetsreise, og gi fagfolk verktøyene de trenger for å gjøre sitt aller beste fra dag én. Behandlingshistorikk, preferanser — alt på ett sted, delt bare med de fagfolkene du velger.`,
    `Vi tror også at det skal være enklere å finne riktig fagperson. Enten du leter etter en frisør som spesialiserer seg på afrohår, en negletekniker med en bestemt stil, eller en brynstylist i ditt område — ${BRAND_NAME} hjelper deg å oppdage fagfolk som virkelig er gode på akkurat det du trenger.`,
    `Vi er et lite team basert i Bergen, Norge, med frisørbakgrunn og kodeferdigheter, som bygger noe vi tror skjønnhetsbransjen har trengt lenge.`,
  ],
  aboutSignOff: "Med kjærlighet, Cecilie & Dorcas 🖤",
  paymentIntro:
    "For fagfolk klare til å vokse. Alltid gratis for kunder.",
  paymentFootnote:
    "Abonnement kjøpes i appen. Avslutt når som helst i App Store eller Google Play.",
  paymentDownloadHint: "Last ned appen for å abonnere",
  paymentPlans: {
    freemium: {
      title: "Freemium",
      badge: "Gratis",
      features: [
        "{{limit}} besøk inkludert",
        "Kartsøk - bli oppdaget av nye kunder",
      ],
    },
    monthly: {
      title: "Månedlig",
      priceLabel: "NOK {{monthlyPrice}} / måned",
      features: [
        "Ubegrensede besøk - avslutt når som helst",
        "Se hva andre profesjonelle har gjort med kundene dine tidligere",
        "Kartsøk - bli oppdaget av nye kunder",
      ],
    },
    annual: {
      title: "Årlig",
      badge: "2 måneder gratis",
      priceLabel: "NOK {{annualPrice}} / år",
      features: [
        "Ubegrensede besøk - avslutt når som helst",
        "Se hva andre profesjonelle har gjort med kundene dine tidligere",
        "Kartsøk - bli oppdaget av nye kunder",
      ],
    },
  },
  comingSoon: "Snart",
  language: {
    select: "Velg språk",
    current: (label) => `Språk: ${label}`,
  },
  footer: {
    privacyPolicy: "Personvernerklæring",
    contactUs: "Kontakt oss",
    backHome: "Tilbake til forsiden",
    contactBody:
      "Spørsmål, tilbakemeldinger eller behov for support? Vi hører gjerne fra deg.",
  },
};

const sv: SiteTranslations = {
  nav: {
    homeAriaLabel: `${BRAND_NAME} hem`,
    howItWorks: "Så fungerar det",
    forProfessionals: "För proffs",
    payment: "Abonnemang för proffs",
    aboutUs: "Om oss",
  },
  heroSubtitle:
    "Din skönhetshistorik följer med dig — upptäck proffs i ditt område som redan vet vad du behöver",
  download: {
    ariaLabel: "Ladda ner appen",
    appStoreTop: "Ladda ner i",
    appStoreBottom: "App Store",
    googlePlayTop: "Hämta den på",
    googlePlayNormal: "Google ",
    googlePlayBold: "Play",
  },
  sections: {
    howItWorks: "Så fungerar det",
    forProfessionals: "För proffs",
    aboutUs: "Om oss",
    payment: "Abonnemang för proffs",
  },
  clientSteps: [
    "Ladda ner appen",
    "Sök efter skönhetsproffs",
    "Dela åtkomst till din journal",
  ],
  proSteps: [
    "Skapa ett professionellt konto",
    "Bli upptäckt",
    "Se all kundhistorik",
  ],
  aboutBody: [
    `${BRAND_NAME} föddes ur en enkel frustration — varför ska du behöva förklara din hårhistorik varje gång du går in på en ny salong?`,
    `Vi byggde ${BRAND_NAME} för att ge kunder äganderätt över sin egen skönhetsresa och ge proffs verktygen de behöver för att göra sitt bästa från dag ett. Behandlingshistorik, preferenser — allt på ett ställe, delat endast med de proffs du väljer.`,
    `Vi tror också att det ska vara enklare att hitta rätt proffs. Oavsett om du letar efter en frisör som specialiserar sig på afrohår, en nagelteknolog med en specifik stil eller en brynstylist i ditt område — ${BRAND_NAME} hjälper dig upptäcka proffs som verkligen är bra på precis det du behöver.`,
    `Vi är ett litet team baserat i Bergen, Norge, med frisörbakgrund och kodningskunskaper, som bygger något vi tror skönhetsbranschen har behövt länge.`,
  ],
  aboutSignOff: "Med kärlek, Cecilie & Dorcas 🖤",
  paymentIntro:
    "För proffs redo att växa. Alltid gratis för kunder.",
  paymentFootnote:
    "Prenumeration köps i appen. Avsluta när som helst i App Store eller Google Play.",
  paymentDownloadHint: "Ladda ner appen för att prenumerera",
  paymentPlans: {
    freemium: {
      title: "Freemium",
      badge: "Gratis",
      features: [
        "{{limit}} besök ingår",
        "Kartsökning — bli upptäckt av nya kunder",
      ],
    },
    monthly: {
      title: "Månadsvis",
      priceLabel: "NOK {{monthlyPrice}} / månad",
      features: [
        "Obegränsade besök — avsluta när som helst",
        "Se vad andra proffs har gjort med dina kunder tidigare",
        "Kartsökning — bli upptäckt av nya kunder",
      ],
    },
    annual: {
      title: "Årsvis",
      badge: "2 månader gratis",
      priceLabel: "NOK {{annualPrice}} / år",
      features: [
        "Obegränsade besök — avsluta när som helst",
        "Se vad andra proffs har gjort med dina kunder tidigare",
        "Kartsökning — bli upptäckt av nya kunder",
      ],
    },
  },
  comingSoon: "Snart",
  language: {
    select: "Välj språk",
    current: (label) => `Språk: ${label}`,
  },
  footer: {
    privacyPolicy: "Integritetspolicy",
    contactUs: "Kontakta oss",
    backHome: "Tillbaka till startsidan",
    contactBody:
      "Frågor, feedback eller behov av support? Vi hör gärna av dig.",
  },
};

const da: SiteTranslations = {
  nav: {
    homeAriaLabel: `${BRAND_NAME} hjem`,
    howItWorks: "Sådan virker det",
    forProfessionals: "For fagfolk",
    payment: "Abonnement for fagfolk",
    aboutUs: "Om os",
  },
  heroSubtitle:
    "Din skønhedshistorik følger dig — find fagfolk i dit område, som allerede ved, hvad du har brug for",
  download: {
    ariaLabel: "Download appen",
    appStoreTop: "Download i",
    appStoreBottom: "App Store",
    googlePlayTop: "Hent den på",
    googlePlayNormal: "Google ",
    googlePlayBold: "Play",
  },
  sections: {
    howItWorks: "Sådan virker det",
    forProfessionals: "For fagfolk",
    aboutUs: "Om os",
    payment: "Abonnement for fagfolk",
  },
  clientSteps: [
    "Download appen",
    "Søg efter skønhedsprofessionelle",
    "Del adgang til din journal",
  ],
  proSteps: [
    "Opret en professionel konto",
    "Bliv opdaget",
    "Se al kundehistorik",
  ],
  aboutBody: [
    `${BRAND_NAME} opstod ud fra en simpel frustration — hvorfor skal du forklare din hårhistorie hver gang, du går ind i en ny salon?`,
    `Vi byggede ${BRAND_NAME} for at give kunder ejerskab over deres egen skønhedsrejse og give fagfolk værktøjerne til at levere deres bedste arbejde fra dag ét. Behandlingshistorik, præferencer — alt ét sted, delt kun med de fagfolk, du vælger.`,
    `Vi tror også, at det skal være nemmere at finde den rette fagperson. Uanset om du leder efter en frisør, der specialiserer sig i afrohår, en negletekniker med en bestemt stil eller en brynstylist i dit område — ${BRAND_NAME} hjælper dig med at opdage fagfolk, der virkelig er gode til præcis det, du har brug for.`,
    `Vi er et lille team baseret i Bergen, Norge, med frisørbaggrund og kodningsfærdigheder, der bygger noget, vi tror skønhedsbranchen har haft brug for i lang tid.`,
  ],
  aboutSignOff: "Med kærlighed, Cecilie & Dorcas 🖤",
  paymentIntro:
    "For fagfolk klar til at vokse. Altid gratis for kunder.",
  paymentFootnote:
    "Abonnement købes i appen. Opsig når som helst i App Store eller Google Play.",
  paymentDownloadHint: "Download appen for at abonnere",
  paymentPlans: {
    freemium: {
      title: "Freemium",
      badge: "Gratis",
      features: [
        "{{limit}} besøg inkluderet",
        "Kortsøgning — bliv opdaget af nye kunder",
      ],
    },
    monthly: {
      title: "Månedlig",
      priceLabel: "NOK {{monthlyPrice}} / måned",
      features: [
        "Ubegrænsede besøg — opsig når som helst",
        "Se hvad andre professionelle har gjort med dine kunder tidligere",
        "Kortsøgning — bliv opdaget af nye kunder",
      ],
    },
    annual: {
      title: "Årligt",
      badge: "2 måneder gratis",
      priceLabel: "NOK {{annualPrice}} / år",
      features: [
        "Ubegrænsede besøg — opsig når som helst",
        "Se hvad andre professionelle har gjort med dine kunder tidligere",
        "Kortsøgning — bliv opdaget af nye kunder",
      ],
    },
  },
  comingSoon: "Snart",
  language: {
    select: "Vælg sprog",
    current: (label) => `Sprog: ${label}`,
  },
  footer: {
    privacyPolicy: "Privatlivspolitik",
    contactUs: "Kontakt os",
    backHome: "Tilbage til forsiden",
    contactBody:
      "Spørgsmål, feedback eller brug for support? Vi hører gerne fra dig.",
  },
};

export const siteTranslations: Record<SiteLanguageCode, SiteTranslations> = {
  en,
  nb,
  sv,
  da,
};

export function getSiteTranslations(language: SiteLanguageCode): SiteTranslations {
  return siteTranslations[language];
}
