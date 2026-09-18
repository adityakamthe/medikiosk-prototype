"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  CountUp,
  DepthHeadline,
  LineMaskReveal,
  MockupTilt,
  SectionIntro,
  StaggerGrid,
} from "./motion";
import {
  IconCode,
  IconHitl,
  IconLotus,
  IconNetwork,
  IconOcr,
  IconPaper,
  IconShield,
  IconSummary,
  IconTime,
  IconVoice,
  PeachIcon,
} from "./icons";

const NAV = [
  { href: "#product", label: "Product" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#ayush", label: "AYUSH Integration" },
  { href: "#compliance", label: "Compliance" },
  { href: "#contact", label: "Contact" },
];

const STEPS = [
  {
    title: "Identify & Authenticate",
    copy: "ABHA-linked identity, DPDP consent capture, and language selection — before a single clinical question is asked.",
    img: "/assets/images/step-auth.jpg",
    alt: "Kiosk authentication screen with ABHA login",
  },
  {
    title: "Adaptive History Intake",
    copy: "Voice and touch conversation in 22 languages, structured around SOCRATES, with real-time red-flag triage.",
    img: "/assets/images/hero-kiosk.jpg",
    alt: "Kiosk clinical intake interface",
  },
  {
    title: "Document Digitization",
    copy: "On-kiosk OCR for prescriptions and labs, handwriting recognition, and fuzzy matching against known drug names.",
    img: "/assets/images/step-scan.jpg",
    alt: "Document scan and OCR overlay on kiosk",
  },
  {
    title: "Summarization & FHIR Routing",
    copy: "A dual-language physician-editable draft, coded and bundled as FHIR R4 for the hospital record.",
    img: "/assets/images/dashboard-summary.jpg",
    alt: "Physician summary dashboard",
  },
  {
    title: "Clinician Consultation",
    copy: "The physician walks in with full context already on screen — and retains final edit control before attestation.",
    img: "/assets/images/dashboard-summary.jpg",
    alt: "Clinician consultation dashboard",
  },
];

export default function LandingPage() {
  const [demoOpen, setDemoOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!demoOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDemoOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [demoOpen]);

  return (
    <div className="min-h-screen bg-cornsilk text-ink-black">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-metallic-gold focus:px-3 focus:py-2"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-50 bg-pine-teal">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <a href="#top" className="font-[family-name:var(--font-sora)] text-base font-bold tracking-tight text-cornsilk md:text-lg">
            MediKiosk
          </a>
          <nav className="hidden items-center gap-6 text-sm text-cornsilk/85 lg:flex" aria-label="Primary">
            {NAV.map((item) => (
              <a key={item.href} href={item.href} className="transition-opacity hover:text-cornsilk hover:opacity-100">
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/patient"
              className="rounded-full bg-cornsilk/20 hover:bg-cornsilk/30 border border-cornsilk/40 px-3 py-2 text-xs font-semibold text-cornsilk md:px-4 md:text-sm transition-all"
            >
              Patient Portal
            </Link>
            <Link
              href="/kiosk"
              className="hidden sm:inline-block rounded-full border border-cornsilk/30 px-3 py-2 text-xs font-semibold text-cornsilk/90 hover:text-cornsilk hover:bg-white/10 transition-all md:px-3.5 md:text-sm"
            >
              On-Site Kiosk
            </Link>
            <Link
              href="/clinician"
              className="rounded-full bg-metallic-gold hover:brightness-105 px-3 py-2 text-xs font-semibold text-ink-black md:px-4 md:text-sm transition-all shadow-xs"
            >
              Clinician Login
            </Link>
          </div>
        </div>
        <nav className="flex gap-4 overflow-x-auto border-t border-cornsilk/10 px-4 py-2 text-xs text-cornsilk/80 lg:hidden" aria-label="Mobile">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className="whitespace-nowrap">
              {item.label}
            </a>
          ))}
        </nav>
      </header>

      <main id="main">
        {/* Hero */}
        <section id="top" className="relative overflow-hidden">
          <img
            src="/assets/illustrations/bg-abstract.svg"
            alt=""
            className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.18]"
          />
          <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:px-6 md:py-24 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="mb-5 inline-flex rounded-full border border-border-strong bg-peach-glow/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-pine-teal">
                AI Clinical Intake · SIH 2026
              </p>
              <h1 className="font-[family-name:var(--font-sora)] text-4xl font-bold leading-[1.12] tracking-tight md:text-6xl">
                <LineMaskReveal
                  lines={["Structured clinical history —", "before the patient enters the room."]}
                />
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-text-secondary md:text-lg">
                Multimodal voice and touch intake for Indian hospital OPDs. Allopathic and AYUSH in one
                ABDM-compliant workflow — so the consult starts with context, not paperwork.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setDemoOpen(true)}
                  className="rounded-full bg-metallic-gold px-5 py-3 text-sm font-semibold text-ink-black transition-opacity hover:opacity-85 active:scale-95"
                >
                  Watch Demo
                </button>
                <a
                  href="#how-it-works"
                  className="rounded-full border border-border-strong px-5 py-3 text-sm font-semibold text-ink-black transition-colors hover:bg-ink-black/5 active:scale-95"
                >
                  View Architecture
                </a>
              </div>
            </div>
            <MockupTilt>
              <div className="raised-card overflow-hidden rounded-3xl border border-border bg-cornsilk">
                <img
                  src="/assets/images/hero-kiosk.jpg"
                  alt="MediKiosk self-service intake screen"
                  className="h-auto w-full"
                />
              </div>
            </MockupTilt>
          </div>
          <div className="relative border-t border-border bg-cornsilk">
            <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-3 md:px-6">
              <StatBlock
                label="Patients moving through a busy Indian OPD each day"
                left={4000}
                right={10000}
                joiner="–"
              />
              <StatBlock
                label="Average consult window in high-volume OPDs"
                left={2}
                right={5}
                joiner="–"
                suffix=" min"
              />
              <div>
                <p className="font-[family-name:var(--font-sora)] text-3xl font-bold text-metallic-gold md:text-4xl">
                  <CountUp to={40} />%
                </p>
                <p className="mt-2 text-sm text-text-secondary">Time lost to paper records before the physician even looks up</p>
              </div>
            </div>
          </div>
        </section>

        {/* Problem */}
        <section id="product" className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-28">
          <SectionIntro eyebrow="The Problem">
            <h2 className="font-[family-name:var(--font-sora)] text-3xl font-bold tracking-tight md:text-5xl">
              <LineMaskReveal lines={["The consult is short.", "The history is not."]} />
            </h2>
          </SectionIntro>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <article className="raised-card rounded-3xl border border-border bg-white/40 p-8">
              <h3 className="font-[family-name:var(--font-sora)] text-xl font-bold">The OPD bottleneck</h3>
              <p className="mt-3 text-text-secondary leading-relaxed">
                High-throughput OPDs compress a full history into minutes. Paper folders arrive incomplete.
                Prior labs sit in a bag. The physician reconstructs the story while the queue grows.
              </p>
            </article>
            <article className="raised-card rounded-3xl border border-border bg-peach-glow/35 p-8">
              <h3 className="font-[family-name:var(--font-sora)] text-xl font-bold">The AYUSH constraint</h3>
              <p className="mt-3 text-text-secondary leading-relaxed">
                Dashavidha Pariksha cannot be rushed into a two-minute window. Prakriti, Vikriti, Agni, and
                lifestyle history need structured time — before the clinician begins Darshana and Sparshana.
              </p>
            </article>
          </div>
          <StaggerGrid className="mt-8 grid gap-5 md:grid-cols-3">
            <ProblemCard icon={<IconPaper />} title="Fragmented paper records" copy="Loose prescriptions, unlabeled labs, and missing prior notes at the point of care." />
            <ProblemCard icon={<IconTime />} title="Time pressure" copy="2–5 minutes to listen, examine, decide, and document — history is the first casualty." />
            <ProblemCard icon={<IconVoice />} title="Missed history" copy="Literacy, language, and queue anxiety mean the story that matters never gets told." />
          </StaggerGrid>
        </section>

        {/* Comparison */}
        <section className="bg-pine-teal py-20 text-cornsilk md:py-24">
          <div className="mx-auto max-w-6xl px-4 md:px-6">
            <SectionIntro eyebrow="Why existing tools fall short" light>
              <h2 className="font-[family-name:var(--font-sora)] text-3xl font-bold tracking-tight md:text-4xl">
                <LineMaskReveal lines={["Built for registration.", "Not for clinical intake."]} />
              </h2>
            </SectionIntro>
            <div className="mt-10 overflow-hidden rounded-2xl border border-cornsilk/15">
              {[
                ["Registration kiosks", "Identity and tokens — no structured clinical history."],
                ["mHealth apps", "Assume a smartphone, literacy, and home connectivity."],
                ["Manual triage", "Inconsistent, unscalable, and lost the moment the shift ends."],
                ["Generic OCR", "Text extraction without drug matching, labs, or clinical context."],
                ["AYUSH EHRs", "Documentation after the consult — not a history captured before it."],
              ].map(([name, line]) => (
                <div
                  key={name}
                  className="grid gap-2 border-b border-cornsilk/15 px-5 py-4 md:grid-cols-[220px_1fr] md:items-center"
                >
                  <p className="font-semibold">{name}</p>
                  <p className="text-sm text-cornsilk/75">{line}</p>
                </div>
              ))}
              <div className="grid gap-2 border-2 border-metallic-gold bg-ink-black px-5 py-5 md:grid-cols-[220px_1fr] md:items-center">
                <p className="font-[family-name:var(--font-sora)] font-bold text-metallic-gold">MediKiosk</p>
                <p className="text-sm text-cornsilk">
                  Voice + touch intake, dual-system history, document intelligence, and ABDM-ready FHIR — before the room.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Modules */}
        <section className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-28">
          <SectionIntro eyebrow="One Platform">
            <DepthHeadline>
              <h2 className="font-[family-name:var(--font-sora)] text-3xl font-bold tracking-tight md:text-5xl">
                Full clinical context, before consultation.
              </h2>
            </DepthHeadline>
          </SectionIntro>
          <StaggerGrid className="mt-12 grid gap-5 md:grid-cols-2">
            <ModuleCard
              icon={<IconVoice />}
              title="Conversational engine"
              copy="Voice and touch intake in 22 languages, SOCRATES-structured, with real-time red-flag triage."
            />
            <ModuleCard
              icon={<IconOcr />}
              title="Document intelligence"
              copy="OCR and handwriting recognition, drug fuzzy-matching, and out-of-range lab flagging."
            />
            <ModuleCard
              icon={
                <PeachIcon>
                  <IconSummary />
                </PeachIcon>
              }
              title="Summary generator"
              copy="Dual-language physician-editable drafts — a starting point, never a locked record."
            />
            <ModuleCard
              icon={<IconShield />}
              title="Consent & ABDM"
              copy="DPDP consent, ABHA authentication, and FHIR R4 bundling for hospital systems."
            />
          </StaggerGrid>
        </section>

        {/* AYUSH */}
        <section id="ayush" className="border-y border-border bg-peach-glow/25 py-20 md:py-28">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 md:grid-cols-2 md:px-6">
            <div>
              <SectionIntro eyebrow="AYUSH Integration">
                <h2 className="font-[family-name:var(--font-sora)] text-3xl font-bold tracking-tight md:text-5xl">
                  <LineMaskReveal lines={["Dashavidha, without", "compressing the consult."]} />
                </h2>
              </SectionIntro>
              <p className="mt-6 max-w-lg text-text-secondary leading-relaxed">
                MediKiosk self-administers <em className="font-[family-name:var(--font-source-serif)] not-italic">Prashna</em>{" "}
                (interrogation) only.{" "}
                <em className="font-[family-name:var(--font-source-serif)] not-italic">Darshana</em> and{" "}
                <em className="font-[family-name:var(--font-source-serif)] not-italic">Sparshana</em> remain with the
                clinician. We do not oversell what a kiosk can see or feel.
              </p>
              <div className="mt-8 flex items-center gap-3">
                <IconLotus />
                <p className="text-sm text-text-secondary">Classical parameters, modern kiosk execution.</p>
              </div>
              <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {["Prakriti", "Vikriti", "Agni", "Koshtha", "Ahara-Vihara"].map((term) => (
                  <li
                    key={term}
                    className="rounded-2xl border border-border bg-cornsilk px-3 py-4 text-center font-[family-name:var(--font-source-serif)] text-lg font-semibold text-pine-teal"
                  >
                    {term}
                  </li>
                ))}
                <li className="flex items-center justify-center rounded-2xl border border-dashed border-border-strong px-3 py-4 text-center text-xs uppercase tracking-[0.14em] text-text-secondary">
                  Prashna only
                </li>
              </ul>
            </div>
            <MockupTilt>
              <img
                src="/assets/illustrations/ayush-radial.jpg"
                alt="Geometric radial diagram representing Dashavidha Pariksha"
                className="w-full rounded-3xl border border-border"
              />
            </MockupTilt>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-28">
          <SectionIntro eyebrow="How MediKiosk Works">
            <h2 className="font-[family-name:var(--font-sora)] text-3xl font-bold tracking-tight md:text-5xl">
              <LineMaskReveal lines={["Five steps from queue", "to a ready consult."]} />
            </h2>
          </SectionIntro>
          <div className="mt-12 grid items-start gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <ol className="flex flex-col gap-2">
              {STEPS.map((item, i) => (
                <li key={item.title}>
                  <button
                    type="button"
                    onClick={() => setStep(i)}
                    className={`w-full rounded-2xl border px-4 py-4 text-left transition-colors ${
                      step === i
                        ? "border-metallic-gold bg-peach-glow/40"
                        : "border-border bg-transparent"
                    }`}
                  >
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-pine-teal">
                      Step {i + 1}
                    </span>
                    <span className="mt-1 block font-[family-name:var(--font-sora)] font-bold">{item.title}</span>
                    <span className="mt-1 block text-sm text-text-secondary">{item.copy}</span>
                  </button>
                </li>
              ))}
            </ol>
            <div className="lg:sticky lg:top-24">
              <MockupTilt>
                <div className="raised-card overflow-hidden rounded-3xl border border-border">
                  <img src={STEPS[step].img} alt={STEPS[step].alt} className="h-auto w-full" />
                </div>
              </MockupTilt>
            </div>
          </div>
        </section>

        {/* Trust */}
        <section id="compliance" className="border-t border-border bg-white/30 py-20 md:py-28">
          <div className="mx-auto max-w-6xl px-4 md:px-6">
            <SectionIntro eyebrow="Engineered for Trust">
              <h2 className="font-[family-name:var(--font-sora)] text-3xl font-bold tracking-tight md:text-5xl">
                <LineMaskReveal lines={["Compliant by design,", "editable by the physician."]} />
              </h2>
            </SectionIntro>
            <StaggerGrid className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
              <TrustCard icon={<IconShield />} title="DPDP Act 2023 Aligned" copy="Purpose-limited consent captured at the kiosk, not buried in a PDF." />
              <TrustCard icon={<IconNetwork />} title="ABDM M1 / M2 / M3" copy="ABHA auth, health records, and facility-linked exchange paths." />
              <TrustCard
                icon={
                  <PeachIcon>
                    <IconSummary />
                  </PeachIcon>
                }
                title="FHIR R4"
                copy="Clinical bundles the hospital stack can actually ingest."
              />
              <TrustCard
                icon={
                  <PeachIcon>
                    <IconCode />
                  </PeachIcon>
                }
                title="NAMASTE / SNOMED / ICD-11"
                copy="Dual-coding so AYUSH and allopathic records speak the same graph."
              />
              <TrustCard
                icon={
                  <PeachIcon>
                    <IconHitl />
                  </PeachIcon>
                }
                title="Human-in-the-Loop"
                copy="The physician retains final edit control before attestation."
              />
            </StaggerGrid>
          </div>
        </section>

        {/* Impact */}
        <section className="relative overflow-hidden bg-ink-black py-20 text-cornsilk md:py-28">
          <img
            src="/assets/illustrations/bg-abstract.svg"
            alt=""
            className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-luminosity"
          />
          <div className="relative mx-auto max-w-6xl px-4 md:px-6">
            <SectionIntro eyebrow="Measured Impact" light>
              <h2 className="font-[family-name:var(--font-sora)] text-3xl font-bold tracking-tight md:text-5xl">
                Time returned to the consult. Access returned to the patient.
              </h2>
            </SectionIntro>
            <div className="mt-14 grid gap-10 md:grid-cols-3">
              <div>
                <p className="font-[family-name:var(--font-sora)] text-4xl font-bold text-metallic-gold md:text-5xl">
                  <CountUp to={2} />–<CountUp to={3} /> min
                </p>
                <p className="mt-3 text-cornsilk/75">Saved per consultation by moving history off the consult clock.</p>
              </div>
              <div>
                <p className="font-[family-name:var(--font-sora)] text-4xl font-bold text-metallic-gold md:text-5xl">
                  <CountUp to={22} />
                </p>
                <p className="mt-3 text-cornsilk/75">Languages supported for voice and touch intake.</p>
              </div>
              <div>
                <p className="font-[family-name:var(--font-sora)] text-4xl font-bold text-metallic-gold md:text-5xl">
                  <CountUp to={0} />
                </p>
                <p className="mt-3 text-cornsilk/75">
                  Patients excluded by literacy or smartphone access — the kiosk does not require either.
                </p>
              </div>
            </div>
            <div className="mt-16 overflow-hidden rounded-3xl border border-cornsilk/10">
              <object
                type="image/svg+xml"
                data="/assets/video/records-loop.svg"
                aria-label="Animated loop: scattered paper records assembling into a structured FHIR timeline"
                className="h-auto w-full"
              />
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="bg-metallic-gold py-20 md:py-24">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-10 px-4 md:flex-row md:items-center md:px-6">
            <div>
              <h2 className="font-[family-name:var(--font-sora)] text-3xl font-bold tracking-tight text-ink-black md:text-5xl">
                Ready to see MediKiosk in action?
              </h2>
              <p className="mt-4 max-w-lg text-ink-black/75">
                SIH 2026 · Problem SIH26047 · Ministry of Ayush / All India Institute of Ayurveda
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setDemoOpen(true)}
                  className="rounded-full bg-ink-black px-5 py-3 text-sm font-semibold text-cornsilk"
                >
                  Watch Demo
                </button>
                <a
                  href="#contact"
                  className="rounded-full border border-ink-black px-5 py-3 text-sm font-semibold text-ink-black"
                >
                  Team Contact
                </a>
              </div>
            </div>
            <img
              src="/assets/images/cta-kiosk-small.svg"
              alt="MediKiosk kiosk terminal illustration"
              className="w-full max-w-xs"
            />
          </div>
        </section>
      </main>

      <footer id="contact" className="bg-ink-black text-cornsilk">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-4 md:px-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-peach-glow">Product</p>
            <ul className="mt-4 space-y-2 text-sm text-cornsilk/75">
              <li><a href="#product">Modules</a></li>
              <li><a href="#how-it-works">How it works</a></li>
              <li><a href="#ayush">AYUSH integration</a></li>
            </ul>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-peach-glow">Team</p>
            <ul className="mt-4 space-y-2 text-sm text-cornsilk/75">
              <li>SIH 2026 hackathon team</li>
              <li>Built for Indian OPD workflows</li>
            </ul>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-peach-glow">Contact</p>
            <ul className="mt-4 space-y-2 text-sm text-cornsilk/75">
              <li>
                <Link href="/kiosk">Patient kiosk</Link>
              </li>
              <li>
                <Link href="/clinician">Clinician dashboard</Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-peach-glow">Compliance docs</p>
            <ul className="mt-4 space-y-2 text-sm text-cornsilk/75">
              <li><a href="#compliance">DPDP &amp; ABDM</a></li>
              <li><a href="#compliance">FHIR R4 / dual coding</a></li>
            </ul>
          </div>
        </div>
        <div className="overflow-hidden px-3 pb-6 md:px-6">
          <p className="select-none font-[family-name:var(--font-sora)] text-[18vw] font-bold leading-[0.85] tracking-tighter text-cornsilk/80">
            MediKiosk
          </p>
        </div>
      </footer>

      {demoOpen ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-ink-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="demo-title"
          onClick={() => setDemoOpen(false)}
        >
          <div
            className="max-w-3xl overflow-hidden rounded-3xl border border-border bg-cornsilk"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4">
              <h2 id="demo-title" className="font-[family-name:var(--font-sora)] font-bold">
                Paper to structured intake
              </h2>
              <button type="button" className="text-sm font-semibold" onClick={() => setDemoOpen(false)}>
                Close
              </button>
            </div>
            <object
              type="image/svg+xml"
              data="/assets/video/records-loop.svg"
              aria-label="Animated loop: paper records becoming a structured FHIR timeline"
              className="w-full"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StatBlock({
  label,
  left,
  right,
  joiner,
  suffix = "",
}: {
  label: string;
  left: number;
  right: number;
  joiner: string;
  suffix?: string;
}) {
  return (
    <div>
      <p className="font-[family-name:var(--font-sora)] text-3xl font-bold text-metallic-gold md:text-4xl">
        <CountUp to={left} />
        {joiner}
        <CountUp to={right} />
        {suffix}
      </p>
      <p className="mt-2 text-sm text-text-secondary">{label}</p>
    </div>
  );
}

function ProblemCard({ icon, title, copy }: { icon: ReactNode; title: string; copy: string }) {
  return (
    <article className="raised-card rounded-3xl border border-border bg-cornsilk p-6">
      {icon}
      <h3 className="mt-4 font-[family-name:var(--font-sora)] text-lg font-bold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-text-secondary">{copy}</p>
    </article>
  );
}

function ModuleCard({ icon, title, copy }: { icon: ReactNode; title: string; copy: string }) {
  return (
    <article className="raised-card group rounded-3xl border border-border bg-cornsilk p-7 transition-transform duration-300 hover:-translate-y-1">
      {icon}
      <h3 className="mt-5 font-[family-name:var(--font-sora)] text-xl font-bold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-text-secondary">{copy}</p>
    </article>
  );
}

function TrustCard({ icon, title, copy }: { icon: ReactNode; title: string; copy: string }) {
  return (
    <article className="raised-card rounded-2xl border border-border bg-cornsilk p-5">
      {icon}
      <h3 className="mt-4 font-[family-name:var(--font-sora)] text-base font-bold leading-snug">{title}</h3>
      <p className="mt-2 text-sm text-text-secondary">{copy}</p>
    </article>
  );
}
