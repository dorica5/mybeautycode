import Link from "next/link";
import { BRAND_NAME } from "@/lib/brand";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="border-b border-foreground/10 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="font-display text-2xl tracking-tight lowercase">
            {BRAND_NAME}
          </span>
          <nav className="flex items-center gap-6 text-sm font-medium">
            <a
              href="#for-deg"
              className="hover:opacity-80 transition-opacity"
            >
              For deg
            </a>
            <a
              href="#for-proffen"
              className="hover:opacity-80 transition-opacity"
            >
              For profesjonelle
            </a>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-5xl px-6 pt-14 pb-20 md:pt-20 md:pb-28">
          <div className="relative overflow-hidden rounded-3xl border-2 border-card-border bg-muted/70 px-8 py-16 md:px-16 md:py-22 shadow-[8px_8px_0_0_rgb(33,36,39)] md:shadow-[12px_12px_0_0_rgb(33,36,39)]">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-card/90 blur-2xl"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-background/90 blur-2xl"
            />
            <div className="relative max-w-2xl">
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-foreground/80">
                Appen
              </p>
              <h1 className="font-display text-4xl leading-tight md:text-5xl lg:text-6xl lowercase">
                Hår og velvære — samlet{" "}
                <span className="whitespace-nowrap">på ett sted.</span>
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-foreground/90 md:text-xl">
                Finn fagfolk, loggfør besøk med bilder og notater, og hold
                oversikt over din historie. Bygget for både deg som kunde og deg
                som jobber i bransjen.
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <Link
                  href="#last-ned"
                  className="inline-flex items-center justify-center rounded-full border-2 border-card-border bg-foreground px-8 py-3.5 text-sm font-semibold text-card transition hover:opacity-90"
                >
                  Last ned appen
                </Link>
                <a
                  href="#for-proffen"
                  className="inline-flex items-center justify-center rounded-full border-2 border-card-border bg-card px-8 py-3.5 text-sm font-semibold text-foreground transition hover:bg-background"
                >
                  For profesjonelle
                </a>
              </div>
            </div>
          </div>
        </section>

        <section
          id="for-deg"
          className="border-t border-foreground/10 bg-background py-20"
        >
          <div className="mx-auto max-w-5xl px-6">
            <h2 className="font-display text-3xl lowercase md:text-4xl">
              For deg
            </h2>
            <p className="mt-3 max-w-2xl text-foreground/85">
              En rolig, oversiktlig opplevelse — samme myke grøntone som i appen
              du kjenner.
            </p>
            <ul className="mt-12 grid gap-6 md:grid-cols-3">
              {[
                {
                  title: "Oppdag og koble deg til",
                  body: "Finn stylister og andre profesjonelle som matcher det du trenger.",
                },
                {
                  title: "Besøk du faktisk husker",
                  body: "Se tjenester, bilder og din egen private notat — bare for deg.",
                },
                {
                  title: "Alt på ett sted",
                  body: "Historikk og inspirasjon uten rot. Fokus på deg og håret ditt.",
                },
              ].map((item) => (
                <li
                  key={item.title}
                  className="rounded-2xl border-2 border-card-border bg-card p-6 shadow-[4px_4px_0_0_rgb(33,36,39)]"
                >
                  <h3 className="font-display text-xl lowercase">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-foreground/85">
                    {item.body}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          id="for-proffen"
          className="border-t border-foreground/10 bg-muted/40 py-20"
        >
          <div className="mx-auto max-w-5xl px-6">
            <h2 className="font-display text-3xl lowercase md:text-4xl">
              For profesjonelle
            </h2>
            <p className="mt-3 max-w-2xl text-foreground/85">
              Dokumenter kundebesøk, vis frem arbeidet ditt og bygg relasjoner —
              med et grensesnitt som føles trygt og profesjonelt.
            </p>
            <div className="mt-10 max-w-2xl rounded-2xl border-2 border-dashed border-foreground/25 bg-card/60 p-8">
              <p className="text-sm font-medium text-foreground/80">
                Kommer snart på nett: administrasjon og booking. Inntil videre
                finner du alt i {BRAND_NAME}-appen.
              </p>
            </div>
          </div>
        </section>

        <section
          id="last-ned"
          className="border-t border-foreground/10 py-20"
        >
          <div className="mx-auto max-w-5xl px-6 text-center">
            <h2 className="font-display text-3xl lowercase md:text-4xl">
              Last ned {BRAND_NAME}
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-foreground/85">
              Legg inn lenker til App Store og Google Play når de er klare.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <span className="inline-flex rounded-full border-2 border-card-border bg-card px-8 py-3.5 text-sm font-semibold text-foreground/50">
                App Store (snart)
              </span>
              <span className="inline-flex rounded-full border-2 border-card-border bg-card px-8 py-3.5 text-sm font-semibold text-foreground/50">
                Google Play (snart)
              </span>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-foreground/10 py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-6 text-sm text-foreground/70 md:flex-row">
          <span className="font-display lowercase">{BRAND_NAME}</span>
          <p>© {new Date().getFullYear()} {BRAND_NAME}. Alle rettigheter forbeholdt.</p>
        </div>
      </footer>
    </div>
  );
}
