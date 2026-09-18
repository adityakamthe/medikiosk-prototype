/**
 * MediKiosk Hospital Doctor Roster & Comprehensive Specialty Allocation Engine
 * Supports Emergency Care, Cardiology, Pulmonology, Gastroenterology, Neurology,
 * Orthopedics, Pediatrics, Dermatology, ENT, General Medicine, and Ministry of AYUSH.
 */

export interface DoctorProfile {
  id: string;
  name: string;
  qualification: string;
  specialty: string;
  department_code: 'general' | 'ortho' | 'pedia' | 'emergency' | 'ayush' | 'cardio' | 'pulmo' | 'gastro' | 'neuro' | 'derma' | 'ent';
  department_name: string;
  room_number: string;
  room_display: string;
  floor: string;
  avg_consult_minutes: number;
  badge_color: string;
  avatar_initials: string;
  theme_color: string;
  pill_active: string;
  pill_inactive: string;
  badge_pill: string;
  title_bar_gradient: string;
  title_bar_icon_bg: string;
  title_bar_tag_bg: string;
}

export const DOCTOR_ROSTER: Record<string, DoctorProfile> = {
  emergency: {
    id: 'dr_nair',
    name: 'Dr. Priya Nair',
    qualification: 'MBBS, MEM (Emergency Medicine & Trauma)',
    specialty: 'Emergency Medicine & Critical Care',
    department_code: 'emergency',
    department_name: 'Emergency & Trauma Care',
    room_number: 'Room ER-1',
    room_display: 'Emergency Resuscitation Bay (Room ER-1)',
    floor: 'Ground Floor, Immediate Emergency Wing',
    avg_consult_minutes: 0,
    badge_color: 'bg-rose-100 text-rose-800 border-rose-300',
    avatar_initials: 'PN',
    theme_color: 'rose',
    pill_active: 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-300/40 ring-2 ring-rose-400/50',
    pill_inactive: 'bg-rose-50 text-rose-900 border-rose-200 hover:bg-rose-100 hover:border-rose-300',
    badge_pill: 'bg-rose-200 text-rose-950 font-black',
    title_bar_gradient: 'bg-gradient-to-r from-rose-950 via-rose-900 to-red-900 text-white border-rose-700/60 shadow-xl shadow-rose-950/20',
    title_bar_icon_bg: 'bg-rose-600 text-white ring-2 ring-rose-300/40',
    title_bar_tag_bg: 'bg-rose-500/30 text-rose-100 border-rose-400/50'
  },
  cardio: {
    id: 'dr_sharma_cardio',
    name: 'Dr. Arvind Sharma',
    qualification: 'MBBS, MD, DM (Cardiology)',
    specialty: 'Cardiology & Heart Health',
    department_code: 'cardio',
    department_name: 'Cardiology OPD',
    room_number: 'Room 104',
    room_display: 'Room 104 (Cardiology Center)',
    floor: '1st Floor, Heart & Vascular Wing',
    avg_consult_minutes: 10,
    badge_color: 'bg-red-100 text-red-900 border-red-300',
    avatar_initials: 'AS',
    theme_color: 'red',
    pill_active: 'bg-red-600 text-white border-red-600 shadow-md shadow-red-300/40 ring-2 ring-red-400/50',
    pill_inactive: 'bg-red-50 text-red-900 border-red-200 hover:bg-red-100 hover:border-red-300',
    badge_pill: 'bg-red-200 text-red-950 font-black',
    title_bar_gradient: 'bg-gradient-to-r from-red-950 via-red-900 to-rose-950 text-white border-red-700/60 shadow-xl shadow-red-950/20',
    title_bar_icon_bg: 'bg-red-600 text-white ring-2 ring-red-300/40',
    title_bar_tag_bg: 'bg-red-500/30 text-red-100 border-red-400/50'
  },
  pulmo: {
    id: 'dr_chawla',
    name: 'Dr. Rajiv Chawla',
    qualification: 'MBBS, MD (Pulmonary Medicine & DTCD)',
    specialty: 'Pulmonology & Respiratory Care',
    department_code: 'pulmo',
    department_name: 'Pulmonology & Chest Clinic',
    room_number: 'Room 106',
    room_display: 'Room 106 (Respiratory OPD)',
    floor: '1st Floor, Corridor C (Near Spirometry)',
    avg_consult_minutes: 9,
    badge_color: 'bg-sky-100 text-sky-900 border-sky-300',
    avatar_initials: 'RC',
    theme_color: 'sky',
    pill_active: 'bg-sky-600 text-white border-sky-600 shadow-md shadow-sky-300/40 ring-2 ring-sky-400/50',
    pill_inactive: 'bg-sky-50 text-sky-900 border-sky-200 hover:bg-sky-100 hover:border-sky-300',
    badge_pill: 'bg-sky-200 text-sky-950 font-black',
    title_bar_gradient: 'bg-gradient-to-r from-sky-950 via-slate-900 to-cyan-950 text-white border-sky-700/60 shadow-xl shadow-sky-950/20',
    title_bar_icon_bg: 'bg-sky-600 text-white ring-2 ring-sky-300/40',
    title_bar_tag_bg: 'bg-sky-500/30 text-sky-100 border-sky-400/50'
  },
  gastro: {
    id: 'dr_sundaram',
    name: 'Dr. Meenakshi Sundaram',
    qualification: 'MBBS, MD, DNB (Gastroenterology)',
    specialty: 'Gastroenterology & Hepatology',
    department_code: 'gastro',
    department_name: 'Gastroenterology OPD',
    room_number: 'Room 109',
    room_display: 'Room 109 (Digestive Health OPD)',
    floor: 'Ground Floor, Corridor D (Near Endoscopy)',
    avg_consult_minutes: 9,
    badge_color: 'bg-amber-100 text-amber-900 border-amber-300',
    avatar_initials: 'MS',
    theme_color: 'amber',
    pill_active: 'bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-300/40 ring-2 ring-amber-400/50',
    pill_inactive: 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100 hover:border-amber-300',
    badge_pill: 'bg-amber-200 text-amber-950 font-black',
    title_bar_gradient: 'bg-gradient-to-r from-amber-950 via-stone-900 to-yellow-950 text-white border-amber-700/60 shadow-xl shadow-amber-950/20',
    title_bar_icon_bg: 'bg-amber-600 text-white ring-2 ring-amber-300/40',
    title_bar_tag_bg: 'bg-amber-500/30 text-amber-100 border-amber-400/50'
  },
  neuro: {
    id: 'dr_malhotra',
    name: 'Dr. Vikram Malhotra',
    qualification: 'MBBS, MD, DM (Neurology)',
    specialty: 'Neurology & Brain Health',
    department_code: 'neuro',
    department_name: 'Neurology OPD',
    room_number: 'Room 107',
    room_display: 'Room 107 (Neurology Suite)',
    floor: '2nd Floor, Neurosciences Wing',
    avg_consult_minutes: 12,
    badge_color: 'bg-violet-100 text-violet-900 border-violet-300',
    avatar_initials: 'VM',
    theme_color: 'violet',
    pill_active: 'bg-violet-600 text-white border-violet-600 shadow-md shadow-violet-300/40 ring-2 ring-violet-400/50',
    pill_inactive: 'bg-violet-50 text-violet-900 border-violet-200 hover:bg-violet-100 hover:border-violet-300',
    badge_pill: 'bg-violet-200 text-violet-950 font-black',
    title_bar_gradient: 'bg-gradient-to-r from-violet-950 via-slate-900 to-purple-950 text-white border-violet-700/60 shadow-xl shadow-violet-950/20',
    title_bar_icon_bg: 'bg-violet-600 text-white ring-2 ring-violet-300/40',
    title_bar_tag_bg: 'bg-violet-500/30 text-violet-100 border-violet-400/50'
  },
  ortho: {
    id: 'dr_verma',
    name: 'Dr. Rajesh Verma',
    qualification: 'MBBS, MS (Orthopedics)',
    specialty: 'Orthopedics & Joint Care',
    department_code: 'ortho',
    department_name: 'Orthopedics OPD',
    room_number: 'Room 102',
    room_display: 'Room 102 (Orthopedic OPD)',
    floor: '1st Floor, Corridor B (Near X-Ray)',
    avg_consult_minutes: 10,
    badge_color: 'bg-indigo-100 text-indigo-900 border-indigo-300',
    avatar_initials: 'RV',
    theme_color: 'indigo',
    pill_active: 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-300/40 ring-2 ring-indigo-400/50',
    pill_inactive: 'bg-indigo-50 text-indigo-900 border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300',
    badge_pill: 'bg-indigo-200 text-indigo-950 font-black',
    title_bar_gradient: 'bg-gradient-to-r from-indigo-950 via-slate-900 to-blue-950 text-white border-indigo-700/60 shadow-xl shadow-indigo-950/20',
    title_bar_icon_bg: 'bg-indigo-600 text-white ring-2 ring-indigo-300/40',
    title_bar_tag_bg: 'bg-indigo-500/30 text-indigo-100 border-indigo-400/50'
  },
  pedia: {
    id: 'dr_sen',
    name: 'Dr. Ananya Sen',
    qualification: 'MBBS, MD (Pediatrics), DCH',
    specialty: 'Pediatrics & Child Health',
    department_code: 'pedia',
    department_name: 'Pediatrics OPD',
    room_number: 'Room 105',
    room_display: 'Room 105 (Pediatric Care OPD)',
    floor: '1st Floor, Child Care Wing',
    avg_consult_minutes: 8,
    badge_color: 'bg-pink-100 text-pink-900 border-pink-300',
    avatar_initials: 'AS',
    theme_color: 'pink',
    pill_active: 'bg-pink-600 text-white border-pink-600 shadow-md shadow-pink-300/40 ring-2 ring-pink-400/50',
    pill_inactive: 'bg-pink-50 text-pink-900 border-pink-200 hover:bg-pink-100 hover:border-pink-300',
    badge_pill: 'bg-pink-200 text-pink-950 font-black',
    title_bar_gradient: 'bg-gradient-to-r from-pink-950 via-fuchsia-950 to-rose-950 text-white border-pink-700/60 shadow-xl shadow-pink-950/20',
    title_bar_icon_bg: 'bg-pink-600 text-white ring-2 ring-pink-300/40',
    title_bar_tag_bg: 'bg-pink-500/30 text-pink-100 border-pink-400/50'
  },
  derma: {
    id: 'dr_patel',
    name: 'Dr. Sunita Patel',
    qualification: 'MBBS, MD (Dermatology, Venereology & Leprosy)',
    specialty: 'Dermatology & Skin Care',
    department_code: 'derma',
    department_name: 'Dermatology OPD',
    room_number: 'Room 103',
    room_display: 'Room 103 (Skin & Allergy OPD)',
    floor: 'Ground Floor, East Wing',
    avg_consult_minutes: 8,
    badge_color: 'bg-orange-100 text-orange-900 border-orange-300',
    avatar_initials: 'SP',
    theme_color: 'orange',
    pill_active: 'bg-orange-600 text-white border-orange-600 shadow-md shadow-orange-300/40 ring-2 ring-orange-400/50',
    pill_inactive: 'bg-orange-50 text-orange-900 border-orange-200 hover:bg-orange-100 hover:border-orange-300',
    badge_pill: 'bg-orange-200 text-orange-950 font-black',
    title_bar_gradient: 'bg-gradient-to-r from-orange-950 via-stone-900 to-amber-950 text-white border-orange-700/60 shadow-xl shadow-orange-950/20',
    title_bar_icon_bg: 'bg-orange-600 text-white ring-2 ring-orange-300/40',
    title_bar_tag_bg: 'bg-orange-500/30 text-orange-100 border-orange-400/50'
  },
  ent: {
    id: 'dr_kulkarni',
    name: 'Dr. Sanjay Kulkarni',
    qualification: 'MBBS, MS (ENT / Otorhinolaryngology)',
    specialty: 'ENT & Head-Neck Care',
    department_code: 'ent',
    department_name: 'ENT OPD',
    room_number: 'Room 110',
    room_display: 'Room 110 (ENT Clinic)',
    floor: '2nd Floor, Corridor E',
    avg_consult_minutes: 8,
    badge_color: 'bg-teal-100 text-teal-900 border-teal-300',
    avatar_initials: 'SK',
    theme_color: 'teal',
    pill_active: 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-300/40 ring-2 ring-teal-400/50',
    pill_inactive: 'bg-teal-50 text-teal-900 border-teal-200 hover:bg-teal-100 hover:border-teal-300',
    badge_pill: 'bg-teal-200 text-teal-950 font-black',
    title_bar_gradient: 'bg-gradient-to-r from-teal-950 via-slate-900 to-emerald-950 text-white border-teal-700/60 shadow-xl shadow-teal-950/20',
    title_bar_icon_bg: 'bg-teal-600 text-white ring-2 ring-teal-300/40',
    title_bar_tag_bg: 'bg-teal-500/30 text-teal-100 border-teal-400/50'
  },
  ayush: {
    id: 'dr_vaidya',
    name: 'Dr. Harish Vaidya',
    qualification: 'BAMS, MD (Ayurveda - Kayachikitsa)',
    specialty: 'Ayurvedic Medicine & Panchakarma',
    department_code: 'ayush',
    department_name: 'Ministry of AYUSH Clinic',
    room_number: 'Room 108',
    room_display: 'Room 108 (AYUSH Wellness Wing)',
    floor: '2nd Floor, Ministry of AYUSH Center',
    avg_consult_minutes: 12,
    badge_color: 'bg-emerald-100 text-emerald-900 border-emerald-400',
    avatar_initials: 'HV',
    theme_color: 'emerald',
    pill_active: 'bg-emerald-700 text-white border-emerald-700 shadow-md shadow-emerald-300/40 ring-2 ring-emerald-400/50',
    pill_inactive: 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300',
    badge_pill: 'bg-emerald-200 text-emerald-950 font-black',
    title_bar_gradient: 'bg-gradient-to-r from-emerald-950 via-teal-950 to-green-950 text-white border-emerald-700/60 shadow-xl shadow-emerald-950/20',
    title_bar_icon_bg: 'bg-emerald-600 text-white ring-2 ring-emerald-300/40',
    title_bar_tag_bg: 'bg-emerald-500/30 text-emerald-100 border-emerald-400/50'
  },
  general: {
    id: 'dr_sharma',
    name: 'Dr. Vikram Sharma',
    qualification: 'MBBS, MD (General Medicine)',
    specialty: 'General Medicine & Adult OPD',
    department_code: 'general',
    department_name: 'General Medicine OPD',
    room_number: 'Room 101',
    room_display: 'Room 101 (General OPD)',
    floor: 'Ground Floor, Central OPD Corridor',
    avg_consult_minutes: 8,
    badge_color: 'bg-teal-100 text-teal-900 border-teal-300',
    avatar_initials: 'VS',
    theme_color: 'teal',
    pill_active: 'bg-pine-teal text-white border-pine-teal shadow-md shadow-teal-900/30 ring-2 ring-teal-500/50',
    pill_inactive: 'bg-teal-50 text-teal-900 border-teal-200 hover:bg-teal-100 hover:border-teal-300',
    badge_pill: 'bg-teal-200 text-teal-950 font-black',
    title_bar_gradient: 'bg-gradient-to-r from-[#003835] via-pine-teal to-[#0A5A55] text-white border-teal-700/60 shadow-xl shadow-pine-teal/20',
    title_bar_icon_bg: 'bg-pine-teal text-metallic-gold ring-2 ring-metallic-gold/30',
    title_bar_tag_bg: 'bg-peach-glow/20 text-cornsilk border-peach-glow/30'
  }
};

/**
 * Intelligent Room & Doctor Allocation Engine
 * Dynamically assigns the required specialist based on:
 * 1. Emergency Red Flags -> Immediate Emergency Bay (Dr. Priya Nair / Room ER-1)
 * 2. Patient Age (<= 14) -> Pediatrics (Dr. Ananya Sen / Room 105)
 * 3. AYUSH Mode -> Ayurvedic Center (Dr. Harish Vaidya / Room 108)
 * 4. Proper Diagnosis & System Involvement -> Required Specialist:
 *    - Cardiovascular -> Cardiology (Dr. Arvind Sharma / Room 104)
 *    - Respiratory -> Pulmonology (Dr. Rajiv Chawla / Room 106)
 *    - Gastrointestinal -> Gastroenterology (Dr. Meenakshi Sundaram / Room 109)
 *    - Neurological -> Neurology (Dr. Vikram Malhotra / Room 107)
 *    - Musculoskeletal -> Orthopedics (Dr. Rajesh Verma / Room 102)
 *    - Dermatology / Skin -> Dermatology (Dr. Sunita Patel / Room 103)
 *    - ENT -> ENT (Dr. Sanjay Kulkarni / Room 110)
 *    - Other / General -> General Medicine (Dr. Vikram Sharma / Room 101)
 */
export function allocateDoctorAndRoom(params: {
  age?: number | string | null;
  clinical_mode?: string | null;
  is_red_flag?: boolean | null;
  red_flag_count?: number | string | null;
  symptoms_text?: string | null;
  primary_system?: string | null;
  provisional_diagnosis?: string | null;
}): DoctorProfile {
  const { 
    age, 
    clinical_mode, 
    is_red_flag, 
    red_flag_count, 
    symptoms_text = '', 
    primary_system, 
    provisional_diagnosis 
  } = params;

  // 1. Critical Red Flag -> Immediate Emergency Resuscitation Bay
  const hasRedFlag = Boolean(is_red_flag) || Number(red_flag_count) > 0;
  if (hasRedFlag) {
    return DOCTOR_ROSTER.emergency;
  }

  // 2. Pediatric Patient (Age <= 14)
  const numericAge = age ? parseInt(String(age), 10) : NaN;
  if (!isNaN(numericAge) && numericAge > 0 && numericAge <= 14) {
    return DOCTOR_ROSTER.pedia;
  }

  // 3. Ministry of AYUSH Mode -> Ayurvedic Center
  if (clinical_mode === 'ayurveda') {
    return DOCTOR_ROSTER.ayush;
  }

  const text = `${symptoms_text || ''} ${primary_system || ''} ${provisional_diagnosis || ''}`.toLowerCase();

  // 4. Primary System / Diagnosis Based Specialist Allocation

  // A. Cardiovascular / Heart -> Cardiology
  if (
    primary_system === 'Cardiovascular' ||
    text.includes('cardio') ||
    text.includes('heart') ||
    text.includes('chest pain') ||
    text.includes('angina') ||
    text.includes('palpitation') ||
    text.includes('छाती में दर्द') ||
    text.includes('हार्ट') ||
    text.includes('दिल की धड़कन')
  ) {
    return DOCTOR_ROSTER.cardio;
  }

  // B. Respiratory / Chest -> Pulmonology
  if (
    primary_system === 'Respiratory' ||
    text.includes('respiratory') ||
    text.includes('asthma') ||
    text.includes('bronchitis') ||
    text.includes('wheezing') ||
    text.includes('cough') ||
    text.includes('breathless') ||
    text.includes('phlegm') ||
    text.includes('खांसी') ||
    text.includes('दमा') ||
    text.includes('सांस फूलना')
  ) {
    return DOCTOR_ROSTER.pulmo;
  }

  // C. Gastrointestinal -> Gastroenterology
  if (
    primary_system === 'Gastrointestinal' ||
    text.includes('gastro') ||
    text.includes('stomach') ||
    text.includes('abdomen') ||
    text.includes('acidity') ||
    text.includes('ulcer') ||
    text.includes('diarrhea') ||
    text.includes('constipation') ||
    text.includes('vomit') ||
    text.includes('गैस') ||
    text.includes('पेट दर्द') ||
    text.includes('एसिडिटी') ||
    text.includes('उल्टी')
  ) {
    return DOCTOR_ROSTER.gastro;
  }

  // D. Neurological -> Neurology
  if (
    primary_system === 'Neurological' ||
    text.includes('neuro') ||
    text.includes('migraine') ||
    text.includes('headache') ||
    text.includes('dizziness') ||
    text.includes('vertigo') ||
    text.includes('numbness') ||
    text.includes('tingling') ||
    text.includes('tremor') ||
    text.includes('सिरदर्द') ||
    text.includes('माइग्रेन') ||
    text.includes('चक्कर')
  ) {
    return DOCTOR_ROSTER.neuro;
  }

  // E. Musculoskeletal / Bones / Joints -> Orthopedics
  const orthoKeywords = [
    'joint', 'bone', 'fracture', 'spine', 'knee', 'hip', 'shoulder', 'elbow', 'wrist',
    'ankle', 'foot', 'leg pain', 'back pain', 'backache', 'arthritis', 'sprain', 'ligament',
    'musculoskeletal', 'कमर दर्द', 'जोड़', 'हड्डी', 'घुटने', 'मोच', 'गठिया', 'हाथ दर्द', 'पैर दर्द'
  ];
  if (primary_system === 'Musculoskeletal' || orthoKeywords.some(kw => text.includes(kw.toLowerCase()))) {
    return DOCTOR_ROSTER.ortho;
  }

  // F. Dermatology -> Skin Care
  const dermaKeywords = [
    'skin', 'rash', 'itching', 'allergy', 'eczema', 'psoriasis', 'fungal', 'boil', 'acne',
    'त्वचा', 'खुजली', 'दाने', 'चकत्ते', 'फोड़ा', 'एलर्जी'
  ];
  if (text.includes('dermatology') || dermaKeywords.some(kw => text.includes(kw.toLowerCase()))) {
    return DOCTOR_ROSTER.derma;
  }

  // G. ENT -> Ear, Nose & Throat
  const entKeywords = [
    'ear', 'throat', 'sinus', 'tonsil', 'hearing', 'tinnitus', 'nasal', 'hoarse',
    'कान', 'गला', 'टॉन्सिल', 'नाक'
  ];
  if (text.includes('ent') || entKeywords.some(kw => text.includes(kw.toLowerCase()))) {
    return DOCTOR_ROSTER.ent;
  }

  // Default: General Medicine
  return DOCTOR_ROSTER.general;
}

/**
 * Calculates Estimated Wait Time String
 */
export function getEstimatedQueueTime(
  patientsAhead: number,
  doctor: DoctorProfile
): { timeString: string; minutes: number } {
  if (doctor.department_code === 'emergency') {
    return {
      timeString: 'Immediate (Zero Wait — Priority Emergency Triage)',
      minutes: 0
    };
  }

  if (patientsAhead <= 0) {
    return {
      timeString: 'Next in line (~2–5 minutes)',
      minutes: 3
    };
  }

  const estMin = Math.max(5, patientsAhead * doctor.avg_consult_minutes);
  const minRange = Math.max(5, estMin - 3);
  const maxRange = estMin + 4;

  return {
    timeString: `Approx. ${minRange}–${maxRange} mins (${patientsAhead} patient${patientsAhead > 1 ? 's' : ''} ahead)`,
    minutes: estMin
  };
}

/**
 * Web Audio Siren Warble (960Hz to 770Hz) for Emergency Alert
 */
export function playEmergencySirenAudio(): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    gain.gain.setValueAtTime(0.3, ctx.currentTime);

    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(960, now);
    osc.frequency.setValueAtTime(770, now + 0.25);
    osc.frequency.setValueAtTime(960, now + 0.5);
    osc.frequency.setValueAtTime(770, now + 0.75);
    osc.frequency.setValueAtTime(960, now + 1.0);
    osc.frequency.setValueAtTime(770, now + 1.25);

    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.6);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 1.6);
  } catch (err) {
    console.warn('Web Audio Siren not supported or blocked:', err);
  }
}

/**
 * Web Audio Chime (E5 -> C5) for General Notification
 */
export function playHospitalChime(): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.5);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(523.25, now + 0.25);
    gain2.gain.setValueAtTime(0.25, now + 0.25);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.25);
    osc2.stop(now + 0.8);
  } catch (err) {
    console.warn('Web Audio Chime error:', err);
  }
}
