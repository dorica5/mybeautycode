import type { SiteLanguageCode } from "@/lib/languages";
import { BRAND_NAME } from "@/lib/brand";
import { webBillingConfig } from "@/lib/billingConfig";

const FREE_VISIT_LIMIT = webBillingConfig.FREE_VISIT_LIMIT;

export type TermsSection = {
  heading: string;
  body: string;
};

export type TermsAndPrivacyContent = {
  pageTitle: string;
  intro: string;
  sections: TermsSection[];
};

const en: TermsAndPrivacyContent = {
  pageTitle: "Terms and Privacy",
  intro: `Welcome to ${BRAND_NAME}! By accessing or using our app, you agree to comply with these Terms and Conditions. Please read them carefully before using the app.`,
  sections: [
    {
      heading: "General Information",
      body: `${BRAND_NAME} is a journal system for beauty services that connects clients and beauty practitioners, allowing clients to share their complete treatment history with professionals, and let clients find the exact professional they are looking for through map search. Available on both iOS and Android.`,
    },
    {
      heading: "Eligibility & Account Creation",
      body: "Create a client account first, then add another account for professional use.",
    },
    {
      heading: "User Responsibilities & Content",
      body: "Professionals can upload images, text, and videos only if the client has agreed to share their journal. Both clients and professionals can delete single visit cards. Professionals can edit visits only within 7 days of creation. Clients can revoke a professional's access to their data at any time. Users may not upload inappropriate images or offensive text. Violation of this rule will result in a permanent ban without a refund.",
    },
    {
      heading: "Privacy & Data Collection",
      body: `For Professionals:\nCollected Data: First name, last name, username, profile picture, email, about me, salon phone number, salon name, and salon location. We also track client relationships (i.e., which clients have shared access with them). Treatment prices are stored but are only visible to that specific professional who wrote it.\n\nFor Clients:\nCollected Data: First name, last name, phone number, profile picture, about me.`,
    },
    {
      heading: "Subscriptions & Billing",
      body: `Client accounts are free. Professional accounts include ${FREE_VISIT_LIMIT} free visit records. Map search and discovery are free. After the free visit limit, a subscription is required to create and view visit records. Subscriptions are offered as monthly or annual plans, renew automatically until cancelled, and are purchased through the Apple App Store or Google Play. Prices are shown in the app before purchase and may change. Cancel anytime in your App Store or Google Play account settings. Subscribers get unlimited visits and access to subscriber features described in the app (including client history shared by clients, where applicable). Refund requests for subscriptions follow Apple or Google policies. Account bans do not entitle users to a refund of amounts already paid for a subscription period.`,
    },
    {
      heading: "Liability Disclaimer",
      body: `${BRAND_NAME} provides a platform for journaling treatments and finding professionals, but we do not guarantee specific results or outcomes.`,
    },
    {
      heading: "Account Termination & Enforcement",
      body: "Users who violate these Terms may have their accounts permanently banned. No refunds will be issued to banned users.",
    },
    {
      heading: "Changes to Terms",
      body: "We reserve the right to modify these terms at any time. Continued use of the app after changes constitutes acceptance of the new terms. For questions or support, contact us at hello@myne.no.",
    },
  ],
};

const nb: TermsAndPrivacyContent = {
  pageTitle: "Vilkår og personvern",
  intro: `Velkommen til ${BRAND_NAME}! Ved å bruke appen vår godtar du disse vilkårene. Les dem nøye før du bruker appen.`,
  sections: [
    {
      heading: "Generell informasjon",
      body: `${BRAND_NAME} er et journalsystem for skjønnhetstjenester som kobler kunder og skjønnhetsfagfolk, slik at kunder kan dele full behandlingshistorikk med fagfolk, og finne akkurat den fagpersonen de leter etter via kartsøk. Tilgjengelig på både iOS og Android.`,
    },
    {
      heading: "Kvalifikasjon og opprettelse av konto",
      body: "Opprett en kundekonto først, og legg deretter til en egen konto for profesjonell bruk.",
    },
    {
      heading: "Brukeransvar og innhold",
      body: "Fagfolk kan laste opp bilder, tekst og videoer bare dersom kunden har samtykket til å dele journalen sin. Både kunder og fagfolk kan slette enkelte besøkskort. Fagfolk kan redigere besøk bare innen 7 dager etter opprettelse. Kunder kan når som helst trekke tilbake en fagpersons tilgang til dataene sine. Brukere kan ikke laste opp upassende bilder eller støtende tekst. Brudd på denne regelen fører til permanent utestengelse uten refusjon.",
    },
    {
      heading: "Personvern og datainnsamling",
      body: `For fagfolk:\nInnsamlede data: Fornavn, etternavn, brukernavn, profilbilde, e-post, om meg, salongtelefonnummer, salongnavn og salonglokasjon. Vi sporer også kundeforhold (dvs. hvilke kunder som har delt tilgang med dem). Behandlingspriser lagres, men er bare synlige for den fagpersonen som skrev dem.\n\nFor kunder:\nInnsamlede data: Fornavn, etternavn, telefonnummer, profilbilde, om meg.`,
    },
    {
      heading: "Abonnement og betaling",
      body: `Kundekontoer er gratis. Profesjonelle kontoer inkluderer ${FREE_VISIT_LIMIT} gratis besøk. Kartsøk og oppdagelse er gratis. Etter gratisgrensen kreves abonnement for å opprette og se besøk. Abonnement tilbys som måneds- eller årsplan, fornyes automatisk til det sies opp, og kjøpes via App Store eller Google Play. Pris vises i appen før kjøp og kan endres. Si opp når som helst i kontoinnstillingene i App Store eller Google Play. Abonnenter får ubegrensede besøk og tilgang til abonnentfunksjoner beskrevet i appen (inkludert kundehistorikk delt av kunden, der det er aktuelt). Refusjon for abonnement følger Apples eller Googles retningslinjer. Utestengelse gir ikke refusjon for allerede betalt abonnementsperiode.`,
    },
    {
      heading: "Ansvarsfraskrivelse",
      body: `${BRAND_NAME} tilbyr en plattform for journalføring av behandlinger og for å finne fagfolk, men vi garanterer ikke spesifikke resultater eller utfall.`,
    },
    {
      heading: "Avslutning av konto og håndheving",
      body: "Brukere som bryter disse vilkårene kan få kontoen permanent utestengt. Det utbetales ingen refusjon til utestengte brukere.",
    },
    {
      heading: "Endringer i vilkårene",
      body: "Vi forbeholder oss retten til å endre disse vilkårene når som helst. Fortsatt bruk av appen etter endringer innebærer at du godtar de nye vilkårene. For spørsmål eller support, kontakt oss på hello@myne.no.",
    },
  ],
};

const sv: TermsAndPrivacyContent = {
  pageTitle: "Villkor och integritet",
  intro: `Välkommen till ${BRAND_NAME}! Genom att använda vår app godkänner du dessa villkor. Läs dem noggrant innan du använder appen.`,
  sections: [
    {
      heading: "Allmän information",
      body: `${BRAND_NAME} är ett journalsystem för skönhetstjänster som kopplar samman kunder och skönhetsproffs, så att kunder kan dela sin fullständiga behandlingshistorik med proffs och hitta exakt den proffs de söker via kartsökning. Tillgängligt på både iOS och Android.`,
    },
    {
      heading: "Behörighet och skapande av konto",
      body: "Skapa först ett kundkonto och lägg sedan till ett separat konto för professionellt bruk.",
    },
    {
      heading: "Användaransvar och innehåll",
      body: "Proffs kan ladda upp bilder, text och videor endast om kunden har godkänt att dela sin journal. Både kunder och proffs kan radera enskilda besökskort. Proffs kan redigera besök endast inom 7 dagar efter att de skapats. Kunder kan när som helst återkalla en proffs åtkomst till sina data. Användare får inte ladda upp olämpliga bilder eller stötande text. Brott mot denna regel leder till permanent avstängning utan återbetalning.",
    },
    {
      heading: "Integritet och datainsamling",
      body: `För proffs:\nInsamlade data: Förnamn, efternamn, användarnamn, profilbild, e-post, om mig, salongtelefonnummer, salongnamn och salongplats. Vi spårar även kundrelationer (dvs. vilka kunder som har delat åtkomst med dem). Behandlingspriser lagras men är endast synliga för den proffs som skrev dem.\n\nFör kunder:\nInsamlade data: Förnamn, efternamn, telefonnummer, profilbild, om mig.`,
    },
    {
      heading: "Abonnemang och betalning",
      body: `Kundkonton är gratis. Professionella konton inkluderar ${FREE_VISIT_LIMIT} gratis besök. Kartsökning och upptäckt är gratis. Efter gratisgränsen krävs abonnemang för att skapa och se besök. Abonnemang erbjuds som månads- eller årsplan, förnyas automatiskt tills det sägs upp och köps via App Store eller Google Play. Pris visas i appen före köp och kan ändras. Säg upp när som helst i kontoinställningarna i App Store eller Google Play. Abonnenter får obegränsade besök och tillgång till abonnentfunktioner som beskrivs i appen (inklusive kundhistorik som delats av kunden, där det är tillämpligt). Återbetalning för abonnemang följer Apples eller Googles riktlinjer. Avstängning ger inte rätt till återbetalning för redan betald abonnemangsperiod.`,
    },
    {
      heading: "Ansvarsfriskrivning",
      body: `${BRAND_NAME} tillhandahåller en plattform för att journalföra behandlingar och hitta proffs, men vi garanterar inte specifika resultat eller utfall.`,
    },
    {
      heading: "Avslutning av konto och tillämpning",
      body: "Användare som bryter mot dessa villkor kan få sitt konto permanent avstängt. Ingen återbetalning ges till avstängda användare.",
    },
    {
      heading: "Ändringar av villkoren",
      body: "Vi förbehåller oss rätten att ändra dessa villkor när som helst. Fortsatt användning av appen efter ändringar innebär att du godkänner de nya villkoren. För frågor eller support, kontakta oss på hello@myne.no.",
    },
  ],
};

const da: TermsAndPrivacyContent = {
  pageTitle: "Vilkår og privatliv",
  intro: `Velkommen til ${BRAND_NAME}! Ved at bruge vores app accepterer du disse vilkår. Læs dem omhyggeligt, før du bruger appen.`,
  sections: [
    {
      heading: "Generel information",
      body: `${BRAND_NAME} er et journalsystem til skønhedsydelser, der forbinder kunder og skønhedsprofessionelle, så kunder kan dele deres fulde behandlingshistorik med fagfolk og finde præcis den professionelle, de leder efter, via kortsøgning. Tilgængelig på både iOS og Android.`,
    },
    {
      heading: "Berettigelse og oprettelse af konto",
      body: "Opret først en kundekonto, og tilføj derefter en separat konto til professionel brug.",
    },
    {
      heading: "Brugeransvar og indhold",
      body: "Fagfolk kan uploade billeder, tekst og videoer kun hvis kunden har accepteret at dele sin journal. Både kunder og fagfolk kan slette enkelte besøgskort. Fagfolk kan redigere besøg kun inden for 7 dage efter oprettelse. Kunder kan til enhver tid tilbagekalde en fagpersons adgang til deres data. Brugere må ikke uploade upassende billeder eller stødende tekst. Overtrædelse af denne regel medfører permanent udelukkelse uden refusion.",
    },
    {
      heading: "Privatliv og dataindsamling",
      body: `For fagfolk:\nIndsamlede data: Fornavn, efternavn, brugernavn, profilbillede, e-mail, om mig, salontelefonnummer, salonnavn og salonlokation. Vi sporer også kundeforhold (dvs. hvilke kunder der har delt adgang med dem). Behandlingspriser gemmes, men er kun synlige for den fagperson, der skrev dem.\n\nFor kunder:\nIndsamlede data: Fornavn, efternavn, telefonnummer, profilbillede, om mig.`,
    },
    {
      heading: "Abonnement og betaling",
      body: `Kundekonti er gratis. Professionelle konti inkluderer ${FREE_VISIT_LIMIT} gratis besøg. Kortsøgning og opdagelse er gratis. Efter gratisgrænsen kræves abonnement for at oprette og se besøg. Abonnement tilbydes som måneds- eller årsplan, fornyes automatisk, indtil det opsiges, og købes via App Store eller Google Play. Pris vises i appen før køb og kan ændres. Opsig når som helst i kontoindstillingerne i App Store eller Google Play. Abonnenter får ubegrænsede besøg og adgang til abonnentfunktioner beskrevet i appen (inklusive kundehistorik delt af kunden, hvor det er relevant). Refusion for abonnement følger Apples eller Googles retningslinjer. Udelukkelse giver ikke ret til refusion for allerede betalt abonnementsperiode.`,
    },
    {
      heading: "Ansvarsfraskrivelse",
      body: `${BRAND_NAME} tilbyder en platform til journalføring af behandlinger og til at finde fagfolk, men vi garanterer ikke specifikke resultater eller udfald.`,
    },
    {
      heading: "Lukning af konto og håndhævelse",
      body: "Brugere, der overtræder disse vilkår, kan få deres konto permanent udelukket. Der udbetales ingen refusion til udelukkede brugere.",
    },
    {
      heading: "Ændringer af vilkårene",
      body: "Vi forbeholder os retten til at ændre disse vilkår til enhver tid. Fortsat brug af appen efter ændringer betyder, at du accepterer de nye vilkår. For spørgsmål eller support, kontakt os på hello@myne.no.",
    },
  ],
};

export const termsAndPrivacyContent: Record<
  SiteLanguageCode,
  TermsAndPrivacyContent
> = {
  en,
  nb,
  sv,
  da,
};

export function getTermsAndPrivacy(
  language: SiteLanguageCode
): TermsAndPrivacyContent {
  return termsAndPrivacyContent[language];
}
