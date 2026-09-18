import type { ReactNode } from "react";

function IconFrame({ src, alt }: { src: string; alt: string }) {
  return (
    <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-peach-glow/50">
      <img src={src} alt={alt} className="h-7 w-7" />
    </span>
  );
}

export function IconPaper() {
  return <IconFrame src="/assets/icons/paper-records.svg" alt="" />;
}
export function IconTime() {
  return <IconFrame src="/assets/icons/time-pressure.svg" alt="" />;
}
export function IconVoice() {
  return <IconFrame src="/assets/icons/voice-intake.svg" alt="" />;
}
export function IconOcr() {
  return <IconFrame src="/assets/icons/ocr-scan.svg" alt="" />;
}
export function IconShield() {
  return <IconFrame src="/assets/icons/privacy-shield.svg" alt="" />;
}
export function IconNetwork() {
  return <IconFrame src="/assets/icons/fhir-network.svg" alt="" />;
}
export function IconLotus() {
  return <IconFrame src="/assets/icons/lotus-dosha.svg" alt="" />;
}

export function IconSummary({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" stroke="#004643" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 8h18l8 8v24H12z" />
      <path d="M30 8v8h8M16 24h16M16 30h12M16 36h8" />
    </svg>
  );
}

export function IconHitl({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" stroke="#004643" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="24" cy="16" r="6" />
      <path d="M10 38c2-8 8-12 14-12s12 4 14 12" />
      <path d="M34 14l6-2M36 20l6 2" />
    </svg>
  );
}

export function IconCode({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" stroke="#004643" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M18 16L10 24l8 8M30 16l8 8-8 8M26 12l-4 24" />
    </svg>
  );
}

export function PeachIcon({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-peach-glow/50">
      {children}
    </span>
  );
}
