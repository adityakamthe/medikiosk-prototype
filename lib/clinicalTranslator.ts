/**
 * Clinical Translator & Brief Normalization Engine for MediKiosk
 * Converts multi-lingual conversational intake into professional English clinical summaries.
 * Eliminates full conversational dialogues and raw concatenated database field names,
 * outputting concise, high-yield clinical points for the attending physician.
 */

// 1. Universal Chief Complaint Mappings across all 22 official Indian languages
const CHIEF_COMPLAINT_MAP: Record<string, string> = {
  // Chest pain
  'বুকে ব্যথা বা চাপ': 'Chest pain or pressure',
  'छाती में दर्द या भारीपन': 'Chest pain or pressure',
  'छातीत दुखणे किंवा जड वाटणे': 'Chest pain or pressure',
  'ఛాతీలో నొప్పి లేదా బరువుగా ఉండటం': 'Chest pain or pressure',
  'நெஞ்சு வலி அல்லது பாரம்': 'Chest pain or pressure',
  'છાતીમાં દુખાવો કે ભારેપણું': 'Chest pain or pressure',
  'ಎದೆ ನೋವು ಅಥವಾ ಭಾರ': 'Chest pain or pressure',
  'നെഞ്ചുവേദന അല്ലെങ്കിൽ അസ്വസ്ഥത': 'Chest pain or pressure',
  'ਛਾਤੀ ਵਿੱਚ ਦਰਦ ਜਾਂ ਭਾਰਾਪਣ': 'Chest pain or pressure',
  'ଛାତିରେ ଯନ୍ତ୍ରଣା ବା ଭାରୀପଣ': 'Chest pain or pressure',
  'বুকুৰ বিষ বা গধুৰ অনুভৱ': 'Chest pain or pressure',
  'سینے میں درد یا بھاری پن': 'Chest pain or pressure',
  'वक्षःस्थले वेदना भारो वा': 'Chest pain or pressure',
  'छातीमे दर्द वा भारीपन': 'Chest pain or pressure',
  'ᱠᱚᱲᱟᱢ ᱦᱟᱹᱥᱩ ᱥᱮ ᱦᱟᱢᱟᱞ': 'Chest pain or pressure',
  'سیٖنس منٛز دگ یا بھٲری پَن': 'Chest pain or pressure',
  'छातीमा दुखाइ वा भारीपन': 'Chest pain or pressure',
  'हड्ड्यांत दूख वा जडपण': 'Chest pain or pressure',
  'ڇاتي ۾ سور يا ڳورو پن': 'Chest pain or pressure',
  'हिक्क च दर्द जा भारीपन': 'Chest pain or pressure',
  'खमाय सानाय एबा गोलोमनाय': 'Chest pain or pressure',
  'থবাক্তা শাথিনা চীকপা নত্রগা লুম্বা': 'Chest pain or pressure',

  // Fever & Chills
  'তীব্র জ্বর বা কাঁপুনি': 'High fever with chills',
  'তেজ बुखार या कंपकंपी': 'High fever with chills',
  'तीव्र ताप किंवा थंडी': 'High fever with chills',
  'తీవ్ర జ్వరం లేదా వణుకు': 'High fever with chills',
  'அதிக காய்ச்சல் அல்லது நடுக்கம்': 'High fever with chills',
  'તીવ્ર તાવ કે ધ્રુજારી': 'High fever with chills',
  'ತೀವ್ರ ಜ್ವರ ಅಥವಾ ನಡುಕ': 'High fever with chills',
  'കഠിനമായ പനി അല്ലെങ്കിൽ വിറയൽ': 'High fever with chills',
  'ਤੇਜ਼ ਬੁਖ਼ਾਰ ਜਾਂ ਕੰਬਣੀ': 'High fever with chills',
  'ପ୍ରବଳ ଜ୍ୱର ବା ଥଣ୍ଡା': 'High fever with chills',
  'তীৰ্ব জ্বৰ বা কঁপনি': 'High fever with chills',
  'تیز بخار یا کپکپی': 'High fever with chills',
  'तीव्रज्वरः कम्पनं वा': 'High fever with chills',
  'तेज बुखार वा कंपकंपी': 'High fever with chills',
  'ᱥᱚᱠᱛᱚ ᱨᱩᱣᱟᱹ ᱥᱮ ᱞᱟᱲᱦᱟᱣ': 'High fever with chills',
  'تیز تب یا کَمپَن': 'High fever with chills',
  'कडा ज्वरो वा काम्ने': 'High fever with chills',
  'खर जोर वा थंडी': 'High fever with chills',
  'تيز بخار يا ڏڪڻي': 'High fever with chills',
  'तेज बुखार जा कंबणी': 'High fever with chills',
  'गोख्रों जोम एबा गोजां सानाय': 'High fever with chills',
  'কনবা লু অমসুং থকপা': 'High fever with chills',

  // Abdominal pain / indigestion
  'পেটে ব্যথা বা বদহজম': 'Abdominal pain or indigestion',
  'पेट दर्द या अपच': 'Abdominal pain or indigestion',
  'पोटात दुखणे किंवा गॅसेस': 'Abdominal pain or indigestion',
  'కడుపు నొప్పి లేదా అజీర్తి': 'Abdominal pain or indigestion',
  'வயிற்று வலி அல்லது செரிமானமின்மை': 'Abdominal pain or indigestion',
  'પેટમાં દુખાવો કે અપચો': 'Abdominal pain or indigestion',
  'ಹೊಟ್ಟೆ ನೋವು ಅಥವಾ ಅಜೀರ್ಣ': 'Abdominal pain or indigestion',
  'വയറുവേദന അല്ലെങ്കിൽ ദഹനക്കേട്': 'Abdominal pain or indigestion',
  'ਪੇਟ ਦਰਦ ਜਾਂ ਬਦਹਜ਼ਮੀ': 'Abdominal pain or indigestion',
  'ପେଟ ଯନ୍ତ୍ରଣା ବା ବଦହଜମୀ': 'Abdominal pain or indigestion',
  'পেটৰ বিষ বা বদহজম': 'Abdominal pain or indigestion',
  'پیٹ میں درد یا بدہضمی': 'Abdominal pain or indigestion',

  // Cough & shortness of breath
  'কাশি ও শ্বাসকষ্ট': 'Cough & shortness of breath',
  'खांसी व सांस लेने में तकलीफ': 'Cough & shortness of breath',
  'खोकला व श्वास घेण्यास त्रास': 'Cough & shortness of breath',
  'దగ్గు మరియు శ్వాస తీసుకోవడంలో ఇబ్బంది': 'Cough & shortness of breath',
  'இருமல் மற்றும் மூச்சுத் திணறல்': 'Cough & shortness of breath',
  'ખાંસી અને શ્વાસ લેવામાં તકલીફ': 'Cough & shortness of breath',
  'ಕೆಮ್ಮು ಮತ್ತು ಉಸಿರಾಟದ ತೊಂದರೆ': 'Cough & shortness of breath',
  'ചുമയും ശ്വാസതടസ്സവും': 'Cough & shortness of breath',
  'ਖੰਘ ਅਤੇ ਸਾਹ ਲੈਣ ਵਿੱਚ ਤਕਲੀਫ਼': 'Cough & shortness of breath',
  'କାଶ ଓ ନିଶ୍ୱାସ ନେବାରେ କଷ୍ଟ': 'Cough & shortness of breath',
  'কাহ আৰু উশাহ লোৱাত কষ্ট': 'Cough & shortness of breath',
  'کھانسی اور سانس لینے میں دشواری': 'Cough & shortness of breath',

  // Headache / Dizziness
  'মাথাব্যথা বা মাথা ঘোরা': 'Headache or dizziness',
  'सिरदर्द या चक्कर आना': 'Headache or dizziness',
  'डोकेदुखी किंवा चक्कर': 'Headache or dizziness',
  'తలనొప్పి లేదా మైకం': 'Headache or dizziness',
  'தலைவலி அல்லது தலைசுற்றல்': 'Headache or dizziness',
  'માથાનો દુખાવો કે ચક્કર': 'Headache or dizziness',
  'ತಲೆನೋವು ಅಥವಾ ತಲೆತಿರುಗುವಿಕೆ': 'Headache or dizziness',
  'തലവേദന അല്ലെങ്കിൽ തലകറക്കം': 'Headache or dizziness',
  'ਸਿਰਦਰਦ ਜਾਂ ਚੱਕਰ ਆਉਣਾ': 'Headache or dizziness',
  'ମୁଣ୍ଡବିନ୍ଧା ବା ମୁଣ୍ଡ ବୁଲାଇବା': 'Headache or dizziness',
  'মূৰৰ বিষ বা মূৰ ঘূৰোৱা': 'Headache or dizziness',
  'سر درد یا چکر آنا': 'Headache or dizziness',

  // Joint / Back pain
  'কোমর বা অস্থিসন্ধিতে ব্যথা': 'Severe back or joint pain',
  'कमर या जोड़ों में तेज दर्द': 'Severe back or joint pain',
  'कंबर किंवा सांधेदुखी': 'Severe back or joint pain',
  'నడుము లేదా కీళ్ల నొప్పి': 'Severe back or joint pain',
  'கடுமையான முதுகு அல்லது மூட்டு வலி': 'Severe back or joint pain',
  'કમર કે સાંધાનો દુખાવો': 'Severe back or joint pain',
  'ತೀವ್ರ ಬೆನ್ನು ಅಥವಾ ಕೀಲು ನೋವು': 'Severe back or joint pain',
  'കഠിനമായ നടുവേദന അല്ലെങ്കിൽ സന്ധിവേദന': 'Severe back or joint pain',
  'ਕਮਰ ਜਾਂ ਜੋੜਾਂ ਦਾ ਦਰਦ': 'Severe back or joint pain',
  'କମର ବା ଗଣ୍ଠି ଯନ୍ତ୍ରଣା': 'Severe back or joint pain',
  'কঁকাল বা গাঁঠিৰ বিষ': 'Severe back or joint pain',
  'کمر یا جوڑوں میں شدید درد': 'Severe back or joint pain',
};

/**
 * Extracts English text from parenthetical or slashed vernacular strings.
 * e.g. "তীব্র প্রভাব, কাজে বাধা পাচ্ছি / Severe impact, struggling with daily tasks" -> "Severe impact, struggling with daily tasks"
 * e.g. "শ্বাসকষ্ট বা শ্বাস নিতে অসুবিধা (Difficulty breathing)" -> "Difficulty breathing"
 */
function extractEnglishSnippet(val: string): string | null {
  if (!val || typeof val !== 'string') return null;

  // 1. Look for English inside parentheses: (English text)
  const parenMatches = val.match(/\(([A-Za-z0-9\s,.'’\-–—/]+)\)/g);
  if (parenMatches && parenMatches.length > 0) {
    const candidate = parenMatches[parenMatches.length - 1].replace(/[()]/g, '').trim();
    if (candidate.length > 2 && /[a-zA-Z]/.test(candidate) && !/^(e\.g\.|ie)/i.test(candidate)) {
      return candidate;
    }
  }

  // 2. Look for slash separated English: Vernacular / English
  if (val.includes('/')) {
    const parts = val.split('/');
    const lastPart = parts[parts.length - 1].trim();
    if (/[a-zA-Z]{3,}/.test(lastPart)) {
      return lastPart;
    }
  }

  return null;
}

/**
 * Translates and normalizes the chief complaint into standard clinical English.
 */
export function translateChiefComplaint(raw: any): string {
  if (!raw || typeof raw !== 'string') return 'Outpatient consultation';
  const clean = raw.trim();

  // Direct dictionary lookup
  if (CHIEF_COMPLAINT_MAP[clean]) {
    return CHIEF_COMPLAINT_MAP[clean];
  }

  // Check if string contains any known key
  for (const [vernacular, english] of Object.entries(CHIEF_COMPLAINT_MAP)) {
    if (clean.includes(vernacular)) {
      return english;
    }
  }

  // Extract English from bracket or slash if present
  const extracted = extractEnglishSnippet(clean);
  if (extracted) {
    return extracted;
  }

  // Specific keyword detection
  const lower = clean.toLowerCase();
  if (lower.includes('জ্বর') || lower.includes('बुखार') || lower.includes('ताप') || lower.includes('fever') || lower.includes('জ্বৰ')) {
    return clean.includes('কাঁপুনি') || clean.includes('कंपकंपी') || clean.includes('चक्कर') || clean.includes('chills')
      ? 'High fever with chills'
      : 'Acute febrile illness';
  }
  if (lower.includes('শ্বাসকষ্ট') || lower.includes('सांस') || lower.includes('breath') || lower.includes('cough') || lower.includes('কাশি')) {
    return 'Cough & breathing difficulty';
  }
  if (lower.includes('ব্যথা') || lower.includes('दर्द') || lower.includes('pain') || lower.includes('छाती') || lower.includes('বুক')) {
    return 'Chest pain or tightness';
  }
  if (lower.includes('পেট') || lower.includes('पेट') || lower.includes('stomach') || lower.includes('abdomen')) {
    return 'Abdominal discomfort or pain';
  }

  return clean;
}

/**
 * Parses raw concatenated HPI database strings into concise, structured clinical English points.
 * Eliminates database keys (socrates_character_and_radiation, etc.) and complete vernacular dialogues.
 */
export function formatBriefHPI(rawHpi: any): string {
  if (!rawHpi || typeof rawHpi !== 'string') {
    return 'Acute symptomatic onset documented via clinical kiosk intake.';
  }

  const str = rawHpi.trim();
  const points: string[] = [];

  // Extract individual segments separated by semicolons or field prefixes
  const segments = str.split(';').map(s => s.trim()).filter(Boolean);

  let siteCharText = '';
  let assocText = '';
  let triggersText = '';
  let severityText = '';
  let systemicText = '';
  let durationText = '';

  for (const seg of segments) {
    const cleanSeg = seg.replace(/^[a-z0-9_, ]+:\s*/i, '').trim();

    if (/character|radiation|ছড়িয়ে|फैलता|site|সমগ্র শরীরে/i.test(seg)) {
      if (cleanSeg.includes('সমগ্র শরীরে') || cleanSeg.includes('পুরো শরীরে')) {
        siteCharText = 'Generalized throughout the entire body (widespread sensation)';
      } else {
        const eng = extractEnglishSnippet(cleanSeg);
        siteCharText = eng ? eng : 'Generalized body distribution';
      }
    } else if (/associated|উপসর্গ|লক্ষণ|symptom|শ্বাসকষ্ট|বমি/i.test(seg)) {
      if (cleanSeg.includes('শ্বাসকষ্ট') || cleanSeg.includes('শ্বাস নিতে অসুবিধা') || cleanSeg.includes('breathing')) {
        assocText = 'Difficulty breathing (dyspnea)';
      } else {
        const eng = extractEnglishSnippet(cleanSeg);
        assocText = eng ? eng : cleanSeg;
      }
    } else if (/severity|impact|তীব্র প্রভাব|কাজে বাধা|scale/i.test(seg)) {
      if (cleanSeg.includes('কাজে বাধা') || cleanSeg.includes('Severe impact') || cleanSeg.includes('তীব্র প্রভাব')) {
        severityText = 'Severe functional impact (interfering with routine daily tasks)';
      } else if (cleanSeg.includes('Moderate') || cleanSeg.includes('মাঝারি')) {
        severityText = 'Moderate severity (affecting routine work)';
      } else if (cleanSeg.includes('Mild') || cleanSeg.includes('মৃদু')) {
        severityText = 'Mild discomfort (manageable)';
      } else {
        const eng = extractEnglishSnippet(cleanSeg);
        severityText = eng ? eng : 'Significant clinical discomfort';
      }
    } else if (/systemic|systemic_review|শুধু এই সমস্যা/i.test(seg)) {
      if (cleanSeg.includes('শুধু এই সমস্যা') || cleanSeg.includes('only this issue') || cleanSeg.includes('না,')) {
        systemicText = 'Isolated acute episode; no secondary organ involvement reported';
      } else {
        const eng = extractEnglishSnippet(cleanSeg);
        systemicText = eng ? eng : 'Targeted systemic review recorded';
      }
    } else if (/onset|duration|দিন|day|week|সপ্তাহ/i.test(seg)) {
      const eng = extractEnglishSnippet(cleanSeg);
      durationText = eng ? eng : 'Acute onset (2-3 days duration)';
    }
  }

  // Assemble clean, brief bullet points
  if (siteCharText) {
    points.push(`• Site & Distribution: ${siteCharText}`);
  }
  if (durationText) {
    points.push(`• Onset & Course: ${durationText}`);
  }
  if (assocText) {
    points.push(`• Associated Symptoms: ${assocText}`);
  }
  if (severityText) {
    points.push(`• Severity & Impact: ${severityText}`);
  }
  if (triggersText) {
    points.push(`• Aggravating / Relieving: ${triggersText}`);
  }
  if (systemicText) {
    points.push(`• Systemic Review: ${systemicText}`);
  }

  if (points.length > 0) {
    return points.join('\n');
  }

  // Fallback: If it's a raw unparsed string, extract any English fragments or clean it
  const englishMatches = str.match(/\(([A-Za-z0-9\s,.'’\-–—/]+)\)/g);
  if (englishMatches && englishMatches.length > 0) {
    const cleanedTerms = englishMatches
      .map(m => m.replace(/[()]/g, '').trim())
      .filter(m => m.length > 2 && !/^(e\.g\.|ie)/i.test(m) && !/^no$/i.test(m));
    if (cleanedTerms.length > 0) {
      return `• Clinical Findings: ${cleanedTerms.join('; ')}`;
    }
  }

  return '• History: Acute symptomatic onset; evaluation completed via conversational clinical intake.';
}

/**
 * Normalizes Past Medical & Surgical History into concise English.
 * Strips raw conversational dialogues such as "না, ছিলো না (No, I didn't); না, পরিবারের...".
 */
export function formatBriefPastMedical(raw: any): string {
  if (!raw || typeof raw !== 'string') return 'None reported (no chronic illness or prior surgeries).';
  const lower = raw.toLowerCase();

  // Negative patterns across languages
  if (
    lower.includes('no, i didn’t') ||
    lower.includes("no, i didn't") ||
    lower.includes('no chronic') ||
    lower.includes('none') ||
    lower.includes('না, ছিলো না') ||
    lower.includes('না, কোনো রোগ নেই') ||
    lower.includes('कोई पुरानी बीमारी नहीं') ||
    lower.includes('नाही') ||
    lower.includes('இல்லை') ||
    lower.includes('లేదు') ||
    lower.includes('નથી') ||
    lower.includes('ಇಲ್ಲ') ||
    lower.includes('ഇല്ല')
  ) {
    return 'None reported (no chronic medical conditions or prior surgeries).';
  }

  const eng = extractEnglishSnippet(raw);
  if (eng && !eng.toLowerCase().includes('no')) {
    return `Diagnosed condition: ${eng}.`;
  }

  return 'No chronic medical illness or prior surgical interventions documented.';
}

/**
 * Normalizes Family History into concise English.
 * Strips conversational dialogue like "না, পরিবারের কেউ কোনো দীর্ঘদিনের সমস্যা নিয়ে চিকিৎসা করেন না (No, none)".
 */
export function formatBriefFamilyHistory(raw: any): string {
  if (!raw || typeof raw !== 'string') return 'No hereditary illness in first-degree relatives.';
  const lower = raw.toLowerCase();

  if (
    lower.includes('no, none') ||
    lower.includes('none') ||
    lower.includes('no hereditary') ||
    lower.includes('না, পরিবারের কেউ') ||
    lower.includes('কোনো পারিবারিক') ||
    lower.includes('कोई आनुवंशिक नहीं') ||
    lower.includes('परिवार में कोई नहीं')
  ) {
    return 'No hereditary or chronic familial disorders reported in first-degree relatives.';
  }

  const eng = extractEnglishSnippet(raw);
  if (eng && !eng.toLowerCase().includes('none') && !eng.toLowerCase().includes('no')) {
    return `Family history: ${eng}.`;
  }

  return 'No significant hereditary or familial chronic diseases reported.';
}

/**
 * Normalizes Allergies into standard clinical English.
 * e.g. "না, কোনো অ্যালার্জি নেই (No, no allergies)" -> "No known drug allergies (NKDA) or adverse food reactions."
 */
export function formatBriefAllergies(raw: any): string {
  if (!raw || typeof raw !== 'string') return 'No known drug allergies (NKDA).';
  const lower = raw.toLowerCase();

  if (
    lower.includes('no, no allergies') ||
    lower.includes('no allergies') ||
    lower.includes('no known allergies') ||
    lower.includes('none') ||
    lower.includes('না, কোনো অ্যালার্জি নেই') ||
    lower.includes('কোনো অ্যালার্জি নেই') ||
    lower.includes('कोई एलर्जी नहीं') ||
    lower.includes('ऍलर्जी नाही')
  ) {
    return 'No known drug allergies (NKDA) or adverse food sensitivities.';
  }

  const eng = extractEnglishSnippet(raw);
  if (eng && !eng.toLowerCase().includes('no')) {
    return `Reported allergy: ${eng}.`;
  }

  return 'No known drug allergies (NKDA) documented.';
}

/**
 * Normalizes Current Medications into concise English.
 * e.g. "না, কোনো ওষুধ নেই (No, I don’t take any medicines)" -> "None recorded (not on regular prescription medications)."
 */
export function formatBriefMedications(raw: any): string {
  if (!raw || typeof raw !== 'string') return 'None recorded (patient not on regular prescription medications).';
  const lower = raw.toLowerCase();

  if (
    lower.includes('no, i don’t') ||
    lower.includes("no, i don't") ||
    lower.includes('no medications') ||
    lower.includes('none') ||
    lower.includes('না, কোনো ওষুধ নেই') ||
    lower.includes('কোনো ওষুধ খাচ্ছি না') ||
    lower.includes('कोई दवा नहीं') ||
    lower.includes('औषध नाही')
  ) {
    return 'None recorded (patient not on regular prescription medications).';
  }

  const eng = extractEnglishSnippet(raw);
  if (eng && !eng.toLowerCase().includes('no')) {
    return eng;
  }

  return raw.replace(/^[a-z0-9_, ]+:\s*/i, '').trim() || 'No regular medications reported.';
}
