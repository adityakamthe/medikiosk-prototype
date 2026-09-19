"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flame,
  Activity,
  User,
  Utensils,
  Layers,
  AlertCircle,
  GitCommit,
  Eye,
  Hand,
  MessageSquare,
  Sparkles,
  Info,
  CheckCircle2
} from "lucide-react";

type ParikshaMode = "dashavidha" | "ashtavidha" | "trividha";

interface ParikshaItem {
  id: string;
  name: string;
  sanskrit: string;
  translation: string;
  icon: any;
  kioskRole: "Prashna (Kiosk)" | "Darshana (Clinician)" | "Sparshana (Clinician)";
  description: string;
  clinicalRelevance: string;
}

const DASHAVIDHA_ITEMS: ParikshaItem[] = [
  {
    id: "prakriti",
    name: "Prakriti",
    sanskrit: "प्रकृति",
    translation: "Baseline Constitution",
    icon: User,
    kioskRole: "Prashna (Kiosk)",
    description: "Innate biological temperament across Vata, Pitta, and Kapha Doshas determined at conception.",
    clinicalRelevance: "Establishes patient baseline for personalized pharmacotherapy and dietary guidance."
  },
  {
    id: "vikriti",
    name: "Vikriti",
    sanskrit: "विकृति",
    translation: "Current Dosha Imbalance",
    icon: Activity,
    kioskRole: "Prashna (Kiosk)",
    description: "Pathological deviation of Doshas from the baseline Prakriti causing active symptoms.",
    clinicalRelevance: "Guides immediate therapeutic intervention, Shamana (pacification), or Shodhana (cleansing)."
  },
  {
    id: "agni",
    name: "Agni",
    sanskrit: "अग्नि",
    translation: "Digestive & Metabolic Fire",
    icon: Flame,
    kioskRole: "Prashna (Kiosk)",
    description: "Metabolic capacity classified into Sama (balanced), Manda (slow), Tikshna (sharp), or Vishama (erratic).",
    clinicalRelevance: "Determines drug bioavailability, dosage strength, and nutritional absorption."
  },
  {
    id: "koshtha",
    name: "Koshtha",
    sanskrit: "कोष्ठ",
    translation: "Bowel Nature & Motility",
    icon: Layers,
    kioskRole: "Prashna (Kiosk)",
    description: "Gastrointestinal tract responsiveness classified as Mridu (soft), Madhyama (medium), or Krura (hard/constipated).",
    clinicalRelevance: "Essential for calibrating purgative (Virechana) doses and gastroprotective herbal adjuncts."
  },
  {
    id: "ahara-vihara",
    name: "Ahara-Vihara",
    sanskrit: "आहार-विहार",
    translation: "Diet & Lifestyle Regimen",
    icon: Utensils,
    kioskRole: "Prashna (Kiosk)",
    description: "Circadian habits, sleep architecture, seasonal adaptations (Ritucharya), and dietary incompatibilities (Viruddhahara).",
    clinicalRelevance: "Identifies lifestyle-rooted triggers and forms non-pharmacological prescription pillars."
  },
  {
    id: "nidana",
    name: "Nidana",
    sanskrit: "निदान",
    translation: "Causative Factors & Triggers",
    icon: AlertCircle,
    kioskRole: "Prashna (Kiosk)",
    description: "Primary etiological drivers, environmental stressors, dietary triggers, and occupational exposures.",
    clinicalRelevance: "Nidana Parivarjana (avoiding the cause) is the fundamental first step of Ayurvedic cure."
  },
  {
    id: "samprapti",
    name: "Samprapti",
    sanskrit: "सम्प्राप्ति",
    translation: "Pathogenesis & Disease Evolution",
    icon: GitCommit,
    kioskRole: "Prashna (Kiosk)",
    description: "Dynamic disease trajectory through 6 stages of Shat Kriya Kala from Sanchaya (accumulation) to Bheda (chronicity).",
    clinicalRelevance: "Reveals exact stage of tissue penetration (Dhatu Gati) to halt disease progression."
  }
];

const ASHTAVIDHA_ITEMS: ParikshaItem[] = [
  { id: "nadi", name: "Nadi", sanskrit: "नाडी", translation: "Pulse Rhythm", icon: Activity, kioskRole: "Sparshana (Clinician)", description: "Arterial pulse speed, volume, rhythm, and doshic movement (Sarpa, Manduka, Hamsa).", clinicalRelevance: "Immediate deep systemic readout of physiological state." },
  { id: "mutra", name: "Mutra", sanskrit: "मूत्र", translation: "Urine Characteristics", icon: Layers, kioskRole: "Prashna (Kiosk)", description: "Color, frequency, burning sensation, turbidity, and diurnal volume.", clinicalRelevance: "Indicates Pitta vitiation, renal filtration, and hydration balance." },
  { id: "mala", name: "Mala", sanskrit: "मल", translation: "Stool & Excretory Pattern", icon: Layers, kioskRole: "Prashna (Kiosk)", description: "Consistency, floating/sinking (Sama vs Nirama), frequency, and abdominal discomfort.", clinicalRelevance: "Key diagnostic index for Ama (metabolic toxins) and digestive tract health." },
  { id: "jihva", name: "Jihva", sanskrit: "जिह्वा", translation: "Tongue Coating", icon: Eye, kioskRole: "Darshana (Clinician)", description: "Coating, coloration, cracks, moisture, and papillae prominence.", clinicalRelevance: "Direct visual representation of GI tract mucus and Agni status." },
  { id: "shabda", name: "Shabda", sanskrit: "शब्द", translation: "Voice & Respiration", icon: MessageSquare, kioskRole: "Prashna (Kiosk)", description: "Vocal strength, hoarseness, pitch, respiratory wheeze, and articulation.", clinicalRelevance: "Reflects Udana Vata, respiratory health, and psychological stamina." },
  { id: "sparsha", name: "Sparsha", sanskrit: "स्पर्श", translation: "Skin & Tactile Quality", icon: Hand, kioskRole: "Sparshana (Clinician)", description: "Temperature (Sheeta/Ushna), dryness (Ruksha), oiliness (Snigdha), and texture.", clinicalRelevance: "Differentiates cold Vata dryness from warm Pitta erythema." },
  { id: "druk", name: "Druk", sanskrit: "दृक्", translation: "Eyes & Sclera", icon: Eye, kioskRole: "Darshana (Clinician)", description: "Scleral clarity, icterus, conjunctival congestion, dryness, and visual fatigue.", clinicalRelevance: "Reveals Alochaka Pitta status, liver strain, and chronic exhaustion." },
  { id: "akruti", name: "Akruti", sanskrit: "आकृति", translation: "General Build & Demeanor", icon: User, kioskRole: "Darshana (Clinician)", description: "Body frame, gait, skeletal proportionality, posture, and facial symmetry.", clinicalRelevance: "Evaluates physical resilience (Bala) and tissue compactness (Samhanana)." }
];

const TRIVIDHA_ITEMS: ParikshaItem[] = [
  {
    id: "prashna",
    name: "Prashna Pariksha",
    sanskrit: "प्रश्न परीक्षा",
    translation: "Interrogation & Clinical Dialogue",
    icon: MessageSquare,
    kioskRole: "Prashna (Kiosk)",
    description: "100% self-administered conversational intake on MediKiosk in 22 regional Indic languages, systematically extracting symptoms, Agni, Koshtha, sleep, bowel habits, and causative factors.",
    clinicalRelevance: "Eliminates queue bottlenecks and hands the clinician an already-structured AYUSH diagnostic draft before the consultation starts."
  },
  {
    id: "darshana",
    name: "Darshana Pariksha",
    sanskrit: "दर्शन परीक्षा",
    translation: "Visual Inspection",
    icon: Eye,
    kioskRole: "Darshana (Clinician)",
    description: "Direct physician observation of patient posture, complexion (Varna), gait, eye sclera, tongue coating, and cutaneous signs.",
    clinicalRelevance: "Clinician validates kiosk subjective findings with direct visual objective assessment."
  },
  {
    id: "sparshana",
    name: "Sparshana Pariksha",
    sanskrit: "स्पर्शन परीक्षा",
    translation: "Palpation & Physical Contact",
    icon: Hand,
    kioskRole: "Sparshana (Clinician)",
    description: "Hands-on physician palpation of Nadi (pulse), skin temperature, lymph nodes, abdominal tenderness, and joint swelling.",
    clinicalRelevance: "Cannot be replaced by machines; protected and prioritized by offloading historical intake to the kiosk."
  }
];

export default function AyushParikshaVisualizer() {
  const [activeMode, setActiveMode] = useState<ParikshaMode>("dashavidha");
  const [selectedItemId, setSelectedItemId] = useState<string>("prakriti");

  const currentItems =
    activeMode === "dashavidha"
      ? DASHAVIDHA_ITEMS
      : activeMode === "ashtavidha"
      ? ASHTAVIDHA_ITEMS
      : TRIVIDHA_ITEMS;

  const activeItem =
    currentItems.find((i) => i.id === selectedItemId) || currentItems[0];

  const handleModeChange = (mode: ParikshaMode) => {
    setActiveMode(mode);
    if (mode === "dashavidha") setSelectedItemId("prakriti");
    else if (mode === "ashtavidha") setSelectedItemId("nadi");
    else setSelectedItemId("prashna");
  };

  return (
    <div className="w-full overflow-hidden rounded-3xl border border-border bg-peach-glow/20 p-5 shadow-lg backdrop-blur-sm sm:p-7">
      {/* Top Mode Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-4">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-pine-teal text-cornsilk">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="font-[family-name:var(--font-sora)] text-xs font-bold uppercase tracking-wider text-pine-teal">
            Ayurvedic Clinical Frameworks
          </span>
        </div>

        <div className="flex rounded-xl bg-cornsilk/80 p-1 border border-border">
          <button
            type="button"
            onClick={() => handleModeChange("trividha")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              activeMode === "trividha"
                ? "bg-pine-teal text-cornsilk shadow-sm"
                : "text-text-secondary hover:text-pine-teal"
            }`}
          >
            Trividha (3)
          </button>
          <button
            type="button"
            onClick={() => handleModeChange("ashtavidha")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              activeMode === "ashtavidha"
                ? "bg-pine-teal text-cornsilk shadow-sm"
                : "text-text-secondary hover:text-pine-teal"
            }`}
          >
            Ashtavidha (8)
          </button>
          <button
            type="button"
            onClick={() => handleModeChange("dashavidha")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              activeMode === "dashavidha"
                ? "bg-pine-teal text-cornsilk shadow-sm"
                : "text-text-secondary hover:text-pine-teal"
            }`}
          >
            Dashavidha (10)
          </button>
        </div>
      </div>

      {/* Interactive Radial / Grid Showcase */}
      <div className="mt-6 grid gap-6 lg:grid-cols-12 items-center">
        {/* Left Interactive Circular Wheel Diagram */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center">
          <div className="relative flex h-72 w-72 sm:h-80 sm:w-80 items-center justify-center rounded-full border-2 border-pine-teal/30 bg-cornsilk/90 p-4 shadow-inner">
            {/* Outer Subtle Orbit Ring */}
            <div className="absolute inset-2 rounded-full border border-dashed border-pine-teal/20 pointer-events-none" />

            {/* Central Lotus & Framework Core */}
            <div className="relative z-10 flex h-28 w-28 flex-col items-center justify-center rounded-full border-2 border-pine-teal bg-pine-teal text-cornsilk shadow-md text-center p-2">
              <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-metallic-gold" strokeWidth="2">
                <path d="M12 3c1.5 3 4 5 7 5-2 3-5 5-7 9-2-4-5-6-7-9 3 0 5.5-2 7-5z" fill="currentColor" fillOpacity="0.3" />
                <circle cx="12" cy="12" r="2" fill="currentColor" />
              </svg>
              <span className="font-[family-name:var(--font-source-serif)] text-xs font-bold leading-tight mt-0.5">
                {activeMode === "trividha" ? "Trividha" : activeMode === "ashtavidha" ? "Ashtavidha" : "Dashavidha"}
              </span>
              <span className="text-[9px] uppercase tracking-wider text-peach-glow font-semibold">Pariksha</span>
            </div>

            {/* Radial Item Nodes placed along the circle */}
            {currentItems.map((item, idx) => {
              const total = currentItems.length;
              const angle = (idx / total) * 2 * Math.PI - Math.PI / 2;
              const radius = 105; // radius in px
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;
              const isSelected = item.id === activeItem.id;
              const IconComp = item.icon;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedItemId(item.id)}
                  style={{
                    transform: `translate(${x}px, ${y}px)`
                  }}
                  className={`group absolute flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full border transition-all duration-200 ${
                    isSelected
                      ? "scale-110 border-2 border-pine-teal bg-peach-glow text-pine-teal shadow-md ring-2 ring-pine-teal/20"
                      : "border-border bg-cornsilk text-pine-teal hover:border-pine-teal hover:scale-105"
                  }`}
                  title={`${item.name} (${item.translation})`}
                >
                  <IconComp className="h-4 w-4 transition-transform group-hover:scale-110" />
                  <span className="sr-only">{item.name}</span>
                </button>
              );
            })}
          </div>

          {/* Subtext below radial */}
          <p className="mt-3 text-center text-xs text-text-secondary font-[family-name:var(--font-source-serif)] italic">
            Click any parameter on the wheel to explore clinical mapping
          </p>
        </div>

        {/* Right Detail Card for Selected Parameter */}
        <div className="lg:col-span-6 flex flex-col justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeItem.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="rounded-2xl border border-border bg-cornsilk p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-peach-glow text-pine-teal border border-border">
                    {(() => {
                      const IconComp = activeItem.icon;
                      return <IconComp className="h-5 w-5" />;
                    })()}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-[family-name:var(--font-sora)] text-lg font-bold text-pine-teal">
                        {activeItem.name}
                      </h4>
                      <span className="rounded-md bg-peach-glow/30 px-2 py-0.5 text-xs font-semibold text-pine-teal">
                        {activeItem.sanskrit}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary font-medium">{activeItem.translation}</p>
                  </div>
                </div>

                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    activeItem.kioskRole.includes("Kiosk")
                      ? "bg-pine-teal text-cornsilk"
                      : "border border-pine-teal/40 bg-peach-glow/20 text-pine-teal"
                  }`}
                >
                  <CheckCircle2 className="h-3 w-3" />
                  {activeItem.kioskRole}
                </span>
              </div>

              <div className="mt-4 space-y-3 text-sm">
                <div>
                  <span className="font-semibold text-pine-teal text-xs uppercase tracking-wider block mb-1">
                    Clinical Definition & Assessment
                  </span>
                  <p className="text-text-secondary leading-relaxed text-xs sm:text-sm">
                    {activeItem.description}
                  </p>
                </div>

                <div className="rounded-xl border border-border/80 bg-peach-glow/20 p-3">
                  <span className="font-semibold text-pine-teal text-xs uppercase tracking-wider block mb-1">
                    Diagnostic Impact for Clinician
                  </span>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    {activeItem.clinicalRelevance}
                  </p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Quick Select Pill Buttons */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {currentItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedItemId(item.id)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                  item.id === activeItem.id
                    ? "bg-pine-teal text-cornsilk shadow-xs"
                    : "border border-border bg-cornsilk/80 text-text-secondary hover:border-pine-teal hover:text-pine-teal"
                }`}
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Classical Guardrail Banner */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-cornsilk/90 px-4 py-3 text-xs text-text-secondary">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-pine-teal shrink-0" />
          <span>
            <strong>Prashna (Interrogation)</strong> is kiosk-administered across 22 Indic languages;{" "}
            <strong>Darshana</strong> and <strong>Sparshana</strong> remain with the physician.
          </span>
        </div>
        <span className="rounded-md border border-border bg-peach-glow/40 px-2 py-0.5 font-semibold text-pine-teal text-[11px]">
          Charaka & Sushruta Samhita Aligned
        </span>
      </div>
    </div>
  );
}
