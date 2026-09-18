/**
 * MediKiosk Deterministic Red-Flag Rule Engine (Module A §4.2)
 * Pure deterministic rule engine — NEVER LLM generated.
 * Returns red-flag rule object if matched, or null if clear.
 */

export interface RedFlagTrigger {
  rule_id: string;
  severity: 'CRITICAL' | 'HIGH';
  title: string;
  patient_instruction_hi: string;
  patient_instruction_en: string;
  triage_alert_message: string;
  allocated_doctor_id?: string;
  doctor_name?: string;
  room_number?: string;
  department_code?: string;
}

export interface RedFlagConfirmationQuestion {
  id: string;
  category: string;
  question_localized: string;
  question_en: string;
  section: string;
  field_name: string;
  framework_stage: string;
  options: string[];
}

/**
 * Stage 1: Detect if a symptom warrants targeted emergency confirmation.
 * Prevents direct red alerts on a single initial symptom.
 */
export function detectRedFlagSuspicion(text: string): string | null {
  const t = text.toLowerCase();

  // Cardiac / Chest suspicion
  if (
    t.includes('chest pain') ||
    t.includes('chest pressure') ||
    t.includes('chest tightness') ||
    t.includes('crushing') ||
    t.includes('heart attack') ||
    t.includes('cardiac') ||
    t.includes('angina') ||
    t.includes('छाती में दर्द') ||
    t.includes('सीना दर्द') ||
    t.includes('छाती में भारीपन') ||
    t.includes('छाती में दबाव') ||
    t.includes('दिल का दौरा') ||
    t.includes('हार्ट अटैक')
  ) {
    return 'cardiac';
  }

  // Stroke / Neurological suspicion
  if (
    t.includes('facial droop') ||
    t.includes('slurred speech') ||
    t.includes('sudden weakness') ||
    t.includes('hemiparesis') ||
    t.includes('stroke') ||
    t.includes('paralysis') ||
    t.includes('fainted') ||
    t.includes('blackout') ||
    t.includes('passed out') ||
    t.includes('unconscious') ||
    t.includes('loss of consciousness') ||
    t.includes('convulsion') ||
    t.includes('seizure') ||
    t.includes('epilepsy') ||
    t.includes('collapsed') ||
    t.includes('बेहोश') ||
    t.includes('चक्कर खाकर गिर') ||
    t.includes('दौरे') ||
    t.includes('लकवा') ||
    t.includes('मुंह टेढ़ा')
  ) {
    return 'neuro';
  }

  // Respiratory suspicion
  if (
    t.includes('shortness of breath') ||
    t.includes('difficulty breathing') ||
    t.includes('trouble breathing') ||
    t.includes('cannot breathe') ||
    t.includes("can't breathe") ||
    t.includes('breathless') ||
    t.includes('gasping') ||
    t.includes('suffocating') ||
    t.includes('choking') ||
    t.includes('stridor') ||
    t.includes('सांस नहीं आ रही') ||
    t.includes('दम घुट रहा') ||
    t.includes('सांस फूलना') ||
    t.includes('सांस लेने में तकलीफ')
  ) {
    return 'respiratory';
  }

  // Active Bleeding / Hemorrhage suspicion
  if (
    t.includes('vomiting blood') ||
    t.includes('coughing blood') ||
    t.includes('blood in vomit') ||
    t.includes('blood in cough') ||
    t.includes('blood in stool') ||
    t.includes('blood in urine') ||
    t.includes('hematemesis') ||
    t.includes('hemoptysis') ||
    t.includes('खून की उल्टी') ||
    t.includes('खांसी में खून') ||
    t.includes('मल में खून') ||
    t.includes('पेशाब में खून') ||
    t.includes('बहुत ज्यादा खून') ||
    t.includes('uncontrolled bleeding') ||
    t.includes('heavy bleeding') ||
    t.includes('भारी रक्तस्राव')
  ) {
    return 'hemorrhage';
  }

  // Severe / Excruciating Pain suspicion
  if (
    t.includes('10/10') ||
    t.includes('9/10') ||
    t.includes('8/10') ||
    t.includes('10 out of 10') ||
    t.includes('9 out of 10') ||
    t.includes('8 out of 10') ||
    t.includes('score 10') ||
    t.includes('score 9') ||
    t.includes('score 8') ||
    t.includes('pain 10') ||
    t.includes('pain 9') ||
    t.includes('pain 8') ||
    t.includes('pain is 10') ||
    t.includes('pain is 9') ||
    t.includes('pain is 8') ||
    t.includes('unbearable') ||
    t.includes('excruciating') ||
    t.includes('worst headache') ||
    t.includes('thunderclap') ||
    t.includes('severe headache') ||
    t.includes('acute abdomen') ||
    t.includes('severe stomach pain') ||
    t.includes('severe abdominal pain') ||
    t.includes('severe back or joint pain') ||
    t.includes('severe chest pain') ||
    t.includes('terrible pain') ||
    t.includes('extreme pain') ||
    t.includes('intense pain') ||
    t.includes('hurts so bad') ||
    t.includes('hurts badly') ||
    t.includes("can't bear") ||
    t.includes("cannot bear") ||
    (t.includes('severe') && t.includes('pain')) ||
    t.includes('असहनीय दर्द') ||
    t.includes('बहुत तेज दर्द') ||
    t.includes('तीव्र दर्द') ||
    t.includes('तीव्र असहनीय') ||
    t.includes('बर्दाश्त नहीं') ||
    t.includes('सहन नहीं') ||
    t.includes('बहुत ज्यादा दर्द') ||
    t.includes('भयंकर दर्द') ||
    t.includes('असह्य वेदना') ||
    t.includes('तीव्र वेदना') ||
    t.includes('खूप जास्त दुखत') ||
    t.includes('கடுமையான வலி') ||
    t.includes('தாங்க முடியாத வலி') ||
    t.includes('తీవ్రమైన నొప్పి') ||
    t.includes('భరించలేని నొప్పి') ||
    t.includes('প্রচণ্ড ব্যথা') ||
    t.includes('অসহ্য ব্যথা') ||
    t.includes('અસહ્ય દુખાવો') ||
    t.includes('તદ્દન અસહ્ય') ||
    t.includes('ತೀವ್ರ ನೋವು') ||
    t.includes('ಅಸಹನೀಯ ನೋವು') ||
    t.includes('കഠിനമായ വേദന') ||
    t.includes('സഹിക്കാൻ കഴിയാത്ത വേദന') ||
    t.includes('ਬਹੁਤ ਤੇਜ਼ ਦਰਦ') ||
    t.includes('ਅਸਹਿਣਯੋਗ ਦਰਦ')
  ) {
    return 'severe_pain';
  }

  // Toxicology / Poisoning / Snakebite / Trauma
  if (
    t.includes('poison') ||
    t.includes('snake bite') ||
    t.includes('overdose') ||
    t.includes('chemical') ||
    t.includes('pesticide') ||
    t.includes('accident') ||
    t.includes('head injury') ||
    t.includes('severe burn') ||
    t.includes('कीटनाशक') ||
    t.includes('जहर') ||
    t.includes('सांप ने काटा')
  ) {
    return 'toxicology';
  }

  return null;
}

/**
 * Stage 2: Generate the confirming follow-on question to clear or corroborate the emergency.
 */
// Localized Emergency Confirmation Dictionary across all 10 Indian official kiosk languages
const EMERGENCY_CONFIRMATION_DATA: Record<string, Record<string, { q: string; en: string; yes: string; no: string }>> = {
  cardiac: {
    en: {
      q: 'To assess urgency: Is your chest pain heavy, tight, or spreading to your arm or jaw, with cold sweats or severe breathlessness?',
      en: 'To assess urgency: Is your chest pain heavy, tight, or spreading to your arm or jaw, with cold sweats or severe breathlessness?',
      yes: 'Yes, heavy crushing or radiating pain with sweating',
      no: 'No, mild or muscular discomfort, can wait for regular doctor'
    },
    hi: {
      q: 'स्थिति की गंभीरता जांचने के लिए: क्या छाती में भारी दबाव है, दर्द बाएं हाथ या जबड़े में फैल रहा है, या अत्यधिक पसीना व सांस फूल रही है?',
      en: 'To assess urgency: Is your chest pain heavy, tight, or spreading to your arm or jaw, with cold sweats or severe breathlessness?',
      yes: 'हाँ, भारी दबाव व पसीने के साथ तेज दर्द (तुरंत इमरजेंसी मदद चाहिए)',
      no: 'नहीं, हल्का या मांसपेशियों का दर्द (नियमित डॉक्टर को दिखा सकते हैं)'
    },
    mr: {
      q: 'तातडी तपासण्यासाठी: छातीत तीव्र दाब, वेदना डाव्या हाताकडे किंवा जबड्याकडे पसरत आहेत, किंवा प्रचंड घाम आणि धाप लागत आहे का?',
      en: 'To assess urgency: Is your chest pain heavy, tight, or spreading to your arm or jaw, with cold sweats or severe breathlessness?',
      yes: 'होय, छातीत तीव्र दाब, घाम आणि असह्य वेदना (तातडीची मदत हवी)',
      no: 'नाही, सामान्य किंवा स्नायूंचे दुखणे (नियमित डॉक्टरांना दाखवू शकतो)'
    },
    bn: {
      q: 'জরুরী অবস্থা যাচাই করতে: বুকে কি ভারী চাপ, ব্যথা কি বাহু বা চোয়ালে ছড়িয়ে পড়ছে, এবং অতিরিক্ত ঘাম বা শ্বাসকষ্ট হচ্ছে?',
      en: 'To assess urgency: Is your chest pain heavy, tight, or spreading to your arm or jaw, with cold sweats or severe breathlessness?',
      yes: 'হ্যাঁ, বুকে তীব্র চাপ, ঘাম এবং অসহ্য ব্যথা (জরুরী সাহায্য প্রয়োজন)',
      no: 'না, হালকা বা পেশীর ব্যথা (সাধারণ ডাক্তারকে দেখানো সম্ভব)'
    },
    te: {
      q: 'అత్యవసర పరిస్థితిని అంచనా వేయడానికి: ఛాతీలో తీవ్రమైన ఒత్తిడి, నొప్పి ఎడమ చేయి లేదా దవడకు వ్యాపిస్తుందా, లేదా విపరీతమైన చెమట మరియు శ్వాస ఆడకపోవడం ఉందా?',
      en: 'To assess urgency: Is your chest pain heavy, tight, or spreading to your arm or jaw, with cold sweats or severe breathlessness?',
      yes: 'అవును, ఛాతీలో తీవ్రమైన నొప్పి మరియు చెమట (తక్షణ అత్యవసర సహాయం కావాలి)',
      no: 'లేదు, తేలికపాటి లేదా కండరాల నొప్పి (రెగ్యులర్ డాక్టర్ వద్ద వేచి ఉండవచ్చు)'
    },
    ta: {
      q: 'அவசரநிலையை மதிப்பிட: மார்பில் கடுமையான அழுத்தம், வலி இடது கை அல்லது தாடைக்கு பரவுகிறதா, அல்லது அதிக வியர்வை மற்றும் மூச்சுத்திணறல் உள்ளதா?',
      en: 'To assess urgency: Is your chest pain heavy, tight, or spreading to your arm or jaw, with cold sweats or severe breathlessness?',
      yes: 'ஆம், மார்பில் கடுமையான வலி, வியர்வை (உடனடி அவசர சிகிச்சை தேவை)',
      no: 'இல்லை, லேசான அல்லது தசை வலி (வழக்கமான மருத்துவரிடம் காட்டலாம்)'
    },
    gu: {
      q: 'તાકીદ ચકાસવા માટે: શું છાતીમાં ભારે દબાણ છે, દુખાવો હાથ અથવા જડબામાં ફેલાઈ રહ્યો છે, અથવા ભારે પરસેવો અને શ્વાસ લેવામાં તકલીફ છે?',
      en: 'To assess urgency: Is your chest pain heavy, tight, or spreading to your arm or jaw, with cold sweats or severe breathlessness?',
      yes: 'હા, છાતીમાં ભારે દબાણ અને પરસેવો (તાત્કાલિક ઇમરજન્સી મદદ જોઈએ)',
      no: 'ના, સામાન્ય અથવા સ્નાયુનો દુખાવો (નિયમિત ડૉક્ટરને બતાવી શકાય)'
    },
    kn: {
      q: 'ತುರ್ತುಸ್ಥಿತಿಯನ್ನು ನಿರ್ಣಯಿಸಲು: ಎದೆಯಲ್ಲಿ ಭಾರವಾದ ಒತ್ತಡ, ನೋವು ಕೈ ಅಥವಾ ದವಡೆಗೆ ಹರಡುತ್ತಿದೆಯೇ, ಅಥವಾ ಅತಿಯಾದ ಬೆವರು ಮತ್ತು ಉಸಿರಾಟದ ತೊಂದರೆ ಇದೆಯೇ?',
      en: 'To assess urgency: Is your chest pain heavy, tight, or spreading to your arm or jaw, with cold sweats or severe breathlessness?',
      yes: 'ಹೌದು, ಎದೆಯಲ್ಲಿ ತೀವ್ರ ಒತ್ತಡ ಮತ್ತು ಬೆವರು (ತಕ್ಷಣ ತುರ್ತು ನೆರವು ಬೇಕು)',
      no: 'ಇಲ್ಲ, ಸೌಮ್ಯ ಅಥವಾ ಸ್ನಾಯು ನೋವು (ಸಾಮಾನ್ಯ ವೈದ್ಯರಿಗೆ ತೋರಿಸಬಹುದು)'
    },
    ml: {
      q: 'അടിയന്തിരാവസ്ഥ വിലയിരുത്താൻ: നെഞ്ചിൽ കഠിനമായ ഭാരവും വേദന കൈയിലേക്കോ താടിയെല്ലിലേക്കോ പടരുന്നുണ്ടോ, അമിതമായ വിയർപ്പും ശ്വാസതടസ്സവുമുണ്ടോ?',
      en: 'To assess urgency: Is your chest pain heavy, tight, or spreading to your arm or jaw, with cold sweats or severe breathlessness?',
      yes: 'അതെ, നെഞ്ചിൽ കഠിനമായ വേദനയും വിയർപ്പും (ഉടൻ അത്യാഹിത വിഭാഗം വേണം)',
      no: 'അല്ല, നേരിയ അല്ലെങ്കിൽ പേശിവേദന (സാധാരണ ഡോക്ടറെ കാണിക്കാം)'
    },
    pa: {
      q: 'ਐਮਰਜੈਂਸੀ ਜਾਂਚ ਲਈ: ਕੀ ਛਾਤੀ ਵਿੱਚ ਭਾਰੀ ਦਬਾਅ ਹੈ, ਦਰਦ ਖੱਬੀ ਬਾਂਹ ਜਾਂ ਜਬਾੜੇ ਵੱਲ ਫੈਲ ਰਿਹਾ ਹੈ, ਜਾਂ ਬਹੁਤ ਜ਼ਿਆਦਾ ਪਸੀਨਾ ਅਤੇ ਸਾਹ ਚੜ੍ਹ ਰਿਹਾ ਹੈ?',
      en: 'To assess urgency: Is your chest pain heavy, tight, or spreading to your arm or jaw, with cold sweats or severe breathlessness?',
      yes: 'ਹਾਂ, ਛਾਤੀ ਵਿੱਚ ਭਾਰੀ ਦਬਾਅ ਅਤੇ ਪਸੀਨਾ (ਤੁਰੰਤ ਐਮਰਜੈਂਸੀ ਮਦਦ ਚਾਹੀਦੀ ਹੈ)',
      no: 'ਨਹੀਂ, ਹਲਕਾ ਜਾਂ ਮਾਸਪੇਸ਼ੀਆਂ ਦਾ ਦਰਦ (ਆਮ ਡਾਕਟਰ ਨੂੰ ਦਿਖਾ ਸਕਦੇ ਹਾਂ)'
    }
  },
  respiratory: {
    en: {
      q: 'To assess urgency: Are you gasping for air even while resting, or unable to speak a complete sentence without stopping for breath?',
      en: 'To assess urgency: Are you gasping for air even while resting, or unable to speak a complete sentence without stopping for breath?',
      yes: 'Yes, gasping for breath even while sitting still',
      no: 'No, breathing is manageable, mild cough or throat irritation'
    },
    hi: {
      q: 'स्थिति की गंभीरता जांचने के लिए: क्या बैठे-बैठे भी सांस उखड़ रही है या बिना रुके पूरा वाक्य बोलने में भारी तकलीफ हो रही है?',
      en: 'To assess urgency: Are you gasping for air even while resting, or unable to speak a complete sentence without stopping for breath?',
      yes: 'हाँ, बैठे-बैठे भी सांस लेने में भारी तकलीफ है',
      no: 'नहीं, सांस सामान्य है, केवल हल्की खांसी या खराश है'
    },
    mr: {
      q: 'तातडी तपासण्यासाठी: बसल्या जागीही श्वास घेण्यास प्रचंड त्रास होतो आहे का किंवा एक वाक्यही न थांबता बोलता येत नाही का?',
      en: 'To assess urgency: Are you gasping for air even while resting, or unable to speak a complete sentence without stopping for breath?',
      yes: 'होय, बसल्या जागीही धाप लागत आहे (तातडीची मदत हवी)',
      no: 'नाही, श्वास सामान्य आहे, केवळ हलका खोकला किंवा खवखव आहे'
    },
    bn: {
      q: 'জরুরী অবস্থা যাচাই করতে: বসে থাকা অবস্থাতেও কি তীব্র শ্বাসকষ্ট হচ্ছে অথবা একটানা একটা বাক্যও বলা যাচ্ছে না?',
      en: 'To assess urgency: Are you gasping for air even while resting, or unable to speak a complete sentence without stopping for breath?',
      yes: 'হ্যাঁ, বসে থেকেও শ্বাস নিতে খুব কষ্ট হচ্ছে',
      no: 'না, শ্বাস স্বাভাবিক, শুধু হালকা কাশি বা গলা খুসখুস করছে'
    },
    te: {
      q: 'అత్యవసర పరిస్థితిని అంచనా వేయడానికి: కూర్చున్నప్పుడు కూడా శ్వాస తీసుకోవడం కష్టంగా ఉందా లేదా ఆగకుండా పూర్తి వాక్యం మాట్లాడలేకపోతున్నారా?',
      en: 'To assess urgency: Are you gasping for air even while resting, or unable to speak a complete sentence without stopping for breath?',
      yes: 'అవును, కూర్చున్నా తీవ్రమైన శ్వాస సమస్య ఉంది',
      no: 'లేదు, శ్వాస సాధారణంగా ఉంది, స్వల్ప దగ్గు మాత్రమే'
    },
    ta: {
      q: 'அவசரநிலையை மதிப்பிட: ஓய்வில் இருக்கும்போதும் மூச்சுத் திணறல் உள்ளதா அல்லது மூச்சு வாங்காமல் ஒரு முழு வாக்கியம் பேச முடியவில்லையா?',
      en: 'To assess urgency: Are you gasping for air even while resting, or unable to speak a complete sentence without stopping for breath?',
      yes: 'ஆம், அமர்ந்திருக்கும்போதும் கடுமையான மூச்சுத்திணறல் உள்ளது',
      no: 'இல்லை, சுவாசம் சாதாரணமாக உள்ளது, லேசான இருமல் மட்டுமே'
    },
    gu: {
      q: 'તાકીદ ચકાસવા માટે: શું બેઠા બેઠા પણ શ્વાસ લેવામાં ભારે તકલીફ થાય છે અથવા અટક્યા વિના આખું વાક્ય બોલી શકાતું નથી?',
      en: 'To assess urgency: Are you gasping for air even while resting, or unable to speak a complete sentence without stopping for breath?',
      yes: 'હા, બેઠા બેઠા પણ શ્વાસ લેવામાં મુશ્કેલી છે',
      no: 'ના, શ્વાસ સામાન્ય છે, ફક્ત હળવી ખાંસી કે ગળામાં ખરાશ છે'
    },
    kn: {
      q: 'ತುರ್ತುಸ್ಥಿತಿಯನ್ನು ನಿರ್ಣಯಿಸಲು: ವಿಶ್ರಾಂತಿಯಲ್ಲಿದ್ದಾಗಲೂ ಉಸಿರಾಡಲು ಕಷ್ಟವಾಗುತ್ತಿದೆಯೇ ಅಥವಾ ನಿಲ್ಲದೆ ಸಂಪೂರ್ಣ ವಾಕ್ಯವನ್ನು ಮಾತನಾಡಲು ಸಾಧ್ಯವಾಗುತ್ತಿಲ್ಲವೇ?',
      en: 'To assess urgency: Are you gasping for air even while resting, or unable to speak a complete sentence without stopping for breath?',
      yes: 'ಹೌದು, ಕುಳಿತಿದ್ದರೂ ಉಸಿರಾಟದ ತೀವ್ರ ತೊಂದರೆ ಇದೆ',
      no: 'ಇಲ್ಲ, ಉಸಿರಾಟ ಸಾಮಾನ್ಯವಾಗಿದೆ, ಕೇವಲ ಸೌಮ್ಯ ಕೆಮ್ಮು ಇದೆ'
    },
    ml: {
      q: 'അടിയന്തിരാവസ്ഥ വിലയിരുത്താൻ: വിശ്രമിക്കുമ്പോഴും കഠിനമായ ശ്വാസതടസ്സമുണ്ടോ അതോ നിർത്താതെ ഒരു വാചകം പൂർത്തിയാക്കാൻ കഴിയുന്നില്ലേ?',
      en: 'To assess urgency: Are you gasping for air even while resting, or unable to speak a complete sentence without stopping for breath?',
      yes: 'അതെ, ഇരിക്കുമ്പോഴും ശ്വാസമെടുക്കാൻ കഠിന പ്രയാസമുണ്ട്',
      no: 'അല്ല, ശ്വാസം സാധാരണമാണ്, നേരിയ ചുമയോ തൊണ്ടവേദനയോ മാത്രം'
    },
    pa: {
      q: 'ਐਮਰਜੈਂਸੀ ਜਾਂਚ ਲਈ: ਕੀ ਬੈਠੇ-ਬੈਠੇ ਵੀ ਸਾਹ ਲੈਣ ਵਿੱਚ ਬਹੁਤ ਤਕਲੀਫ਼ ਹੋ ਰਹੀ ਹੈ ਜਾਂ ਬਿਨਾਂ ਰੁਕੇ ਪੂਰਾ ਵਾਕ ਬੋਲਿਆ ਨਹੀਂ ਜਾ ਰਿਹਾ?',
      en: 'To assess urgency: Are you gasping for air even while resting, or unable to speak a complete sentence without stopping for breath?',
      yes: 'ਹਾਂ, ਬੈਠੇ ਹੋਏ ਵੀ ਸਾਹ ਲੈਣ ਵਿੱਚ ਭਾਰੀ ਔਖਿਆਈ ਹੈ',
      no: 'ਨਹੀਂ, ਸਾਹ ਆਮ ਹੈ, ਸਿਰਫ਼ ਹਲਕੀ ਖੰਘ ਜਾਂ ਖਰਾਸ਼ ਹੈ'
    }
  },
  severe_pain: {
    en: {
      q: 'To assess urgency: Is this pain completely unbearable like the worst pain of your life (8 to 10/10), making you unable to stand or walk?',
      en: 'To assess urgency: Is this pain completely unbearable like the worst pain of your life (8 to 10/10), making you unable to stand or walk?',
      yes: 'Yes, completely unbearable acute pain (8 to 10/10)',
      no: 'No, painful but manageable, can wait for OPD consultation'
    },
    hi: {
      q: 'स्थिति की गंभीरता जांचने के लिए: क्या यह दर्द पूरी तरह असहनीय (8 से 10/10) है और आप खड़े होने या चलने में असमर्थ हैं?',
      en: 'To assess urgency: Is this pain completely unbearable like the worst pain of your life (8 to 10/10), making you unable to stand or walk?',
      yes: 'हाँ, असहनीय तीव्र दर्द (8 से 10/10)',
      no: 'नहीं, दर्द है पर सहनीय है, ओपीडी में दिखा सकते हैं'
    },
    mr: {
      q: 'तातडी तपासण्यासाठी: हा त्रास किंवा वेदना पूर्णपणे असह्य (८ ते १०/१०) आहे का आणि उभे राहणे किंवा चालणे अशक्य झाले आहे का?',
      en: 'To assess urgency: Is this pain completely unbearable like the worst pain of your life (8 to 10/10), making you unable to stand or walk?',
      yes: 'होय, असह्य तीव्र वेदना (८ ते १०/१०)',
      no: 'नाही, वेदना आहे पण सहन करण्याजोगी आहे, ओपीडीमध्ये दाखवू शकतो'
    },
    bn: {
      q: 'জরুরী অবস্থা যাচাই করতে: এই ব্যথা কি সম্পূর্ণ অসহ্য (৮ থেকে ১০/১০) এবং আপনি দাঁড়াতে বা হাঁটতে অক্ষম?',
      en: 'To assess urgency: Is this pain completely unbearable like the worst pain of your life (8 to 10/10), making you unable to stand or walk?',
      yes: 'হ্যাঁ, সম্পূর্ণ অসহ্য তীব্র ব্যথা (৮ থেকে ১০/১০)',
      no: 'না, ব্যথা আছে তবে সহ্য করার মতো, নিয়মিত দেখা সম্ভব'
    },
    te: {
      q: 'అత్యవసర పరిస్థితిని అంచనా వేయడానికి: ఈ నొప్పి పూర్తిగా భరించలేనంతగా (8 నుండి 10/10) ఉందా మరియు నిలబడటం లేదా నడవలేకపోతున్నారా?',
      en: 'To assess urgency: Is this pain completely unbearable like the worst pain of your life (8 to 10/10), making you unable to stand or walk?',
      yes: 'అవును, భరించలేని తీవ్రమైన నొప్పి (8 నుండి 10/10)',
      no: 'లేదు, నొప్పి ఉంది కానీ భరించదగినది, ఓపీడీలో చూపించవచ్చు'
    },
    ta: {
      q: 'அவசரநிலையை மதிப்பிட: இந்த வலி முற்றிலும் தாங்க முடியாத தீவிரமானதா (8 முதல் 10/10), உங்களால் நிற்கவோ நடக்கவோ முடியவில்லையா?',
      en: 'To assess urgency: Is this pain completely unbearable like the worst pain of your life (8 to 10/10), making you unable to stand or walk?',
      yes: 'ஆம், தாங்க முடியாத தீவிர வலி (8 முதல் 10/10)',
      no: 'இல்லை, வலி உள்ளது ஆனால் சமாளிக்கக்கூடியது'
    },
    gu: {
      q: 'તાકીદ ચકાસવા માટે: શું આ દુખાવો તદ્દન અસહ્ય (૮ થી ૧૦/૧૦) છે અને તમે ઊભા રહેવા કે ચાલવા અસમર્થ છો?',
      en: 'To assess urgency: Is this pain completely unbearable like the worst pain of your life (8 to 10/10), making you unable to stand or walk?',
      yes: 'હા, તદ્દન અસહ્ય તીવ્ર દુખાવો (૮ થી ૧૦/૧૦)',
      no: 'ના, દુખાવો છે પણ સહન થઈ શકે તેવો છે'
    },
    kn: {
      q: 'ತುರ್ತುಸ್ಥಿತಿಯನ್ನು ನಿರ್ಣಯಿಸಲು: ಈ ನೋವು ಸಂಪೂರ್ಣವಾಗಿ ಅಸಹನೀಯವಾಗಿದೆಯೇ (8 ರಿಂದ 10/10) ಮತ್ತು ನಿಲ್ಲಲು ಅಥವಾ ನಡೆಯಲು ಅಸಾಧ್ಯವಾಗಿದೆಯೇ?',
      en: 'To assess urgency: Is this pain completely unbearable like the worst pain of your life (8 to 10/10), making you unable to stand or walk?',
      yes: 'ಹೌದು, ಸಂಪೂರ್ಣ ಅಸಹನೀಯ ತೀವ್ರ ನೋವು (8 ರಿಂದ 10/10)',
      no: 'ಇಲ್ಲ, ನೋವಿದೆ ಆದರೆ ಸಹಿಸಿಕೊಳ್ಳಬಹುದು'
    },
    ml: {
      q: 'അടിയന്തിരാവസ്ഥ വിലയിരുത്താൻ: ഈ വേദന പൂർണ്ണമായും അസഹനീയമാണോ (8 മുതൽ 10/10 വരെ), നിൽക്കാനോ നടക്കാനോ കഴിയുന്നില്ലേ?',
      en: 'To assess urgency: Is this pain completely unbearable like the worst pain of your life (8 to 10/10), making you unable to stand or walk?',
      yes: 'അതെ, അസഹനീയമായ അതികഠിന വേദന (8 മുതൽ 10/10)',
      no: 'അല്ല, വേദനയുണ്ട് എന്നാൽ സഹിക്കാവുന്നതാണ്'
    },
    pa: {
      q: 'ਐਮਰਜੈਂਸੀ ਜਾਂਚ ਲਈ: ਕੀ ਇਹ ਦਰਦ ਬਿਲਕੁਲ ਅਸਹਿਣਯੋਗ (8 ਤੋਂ 10/10) ਹੈ ਅਤੇ ਤੁਸੀਂ ਖੜ੍ਹੇ ਹੋਣ ਜਾਂ ਤੁਰਨ ਵਿੱਚ ਅਸਮਰੱਥ ਹੋ?',
      en: 'To assess urgency: Is this pain completely unbearable like the worst pain of your life (8 to 10/10), making you unable to stand or walk?',
      yes: 'ਹਾਂ, ਬਿਲਕੁਲ ਅਸਹਿਣਯੋਗ ਤੇਜ਼ ਦਰਦ (8 ਤੋਂ 10/10)',
      no: 'ਨਹੀਂ, ਦਰਦ ਹੈ ਪਰ ਸਹਿਣਯੋਗ ਹੈ, ਓਪੀਡੀ ਵਿੱਚ ਦਿਖਾ ਸਕਦੇ ਹਾਂ'
    }
  },
  hemorrhage: {
    en: {
      q: 'To assess urgency: Is there continuous active heavy bleeding, or did you vomit a large volume of fresh blood?',
      en: 'To assess urgency: Is there continuous active heavy bleeding, or did you vomit a large volume of fresh blood?',
      yes: 'Yes, continuous heavy bleeding or vomiting blood',
      no: 'No, minor spotting or old dark specks only'
    },
    hi: {
      q: 'स्थिति की गंभीरता जांचने के लिए: क्या लगातार तेज खून बह रहा है या उल्टी में अधिक मात्रा में ताजा खून आया है?',
      en: 'To assess urgency: Is there continuous active heavy bleeding, or did you vomit a large volume of fresh blood?',
      yes: 'हाँ, लगातार भारी रक्तस्राव या खून की उल्टी',
      no: 'नहीं, मामूली सा धब्बा या केवल हल्का सा खून'
    },
    mr: {
      q: 'तातडी तपासण्यासाठी: सतत मोठ्या प्रमाणात रक्तस्त्राव होत आहे का किंवा उलट्यांमध्ये भरपूर ताजे रक्त आले आहे का?',
      en: 'To assess urgency: Is there continuous active heavy bleeding, or did you vomit a large volume of fresh blood?',
      yes: 'होय, सतत मोठा रक्तस्त्राव किंवा रक्ताची उलटी',
      no: 'नाही, केवळ किरकोळ डाग किंवा जुने डाग आहेत'
    },
    bn: {
      q: 'জরুরী অবস্থা যাচাই করতে: ক্রমাগত কি প্রচুর রক্তক্ষরণ হচ্ছে বা বমিতে কি বেশি পরিমাণে তাজা রক্ত এসেছে?',
      en: 'To assess urgency: Is there continuous active heavy bleeding, or did you vomit a large volume of fresh blood?',
      yes: 'হ্যাঁ, ক্রমাগত ভারী রক্তপাত বা রক্তবমি',
      no: 'না, সামান্য রক্তের দাগ মাত্র'
    },
    te: {
      q: 'అత్యవసర పరిస్థితిని అంచనా వేయడానికి: నిరంతరం విపరీతమైన రక్తస్రావం జరుగుతోందా లేదా వాంతిలో తాజా రక్తం పడిందా?',
      en: 'To assess urgency: Is there continuous active heavy bleeding, or did you vomit a large volume of fresh blood?',
      yes: 'అవును, తీవ్ర రక్తస్రావం లేదా రక్తం వాంతులు',
      no: 'లేదు, కేవలం స్వల్ప రక్తపు చుక్కలు మాత్రమే'
    },
    ta: {
      q: 'அவசரநிலையை மதிப்பிட: தொடர்ந்து அதிக ரத்தப்போக்கு உள்ளதா அல்லது வாந்தியில் அதிக அளவில் புதிய ரத்தம் வந்ததா?',
      en: 'To assess urgency: Is there continuous active heavy bleeding, or did you vomit a large volume of fresh blood?',
      yes: 'ஆம், தொடர் ரத்தப்போக்கு அல்லது ரத்த வாந்தி',
      no: 'இல்லை, லேசான கறை மட்டுமே'
    },
    gu: {
      q: 'તાકીદ ચકાસવા માટે: શું સતત ભારે રક્તસ્રાવ થઈ રહ્યો છે અથવા ઉલટીમાં વધુ પ્રમાણમાં તાજું લોહી આવ્યું છે?',
      en: 'To assess urgency: Is there continuous active heavy bleeding, or did you vomit a large volume of fresh blood?',
      yes: 'હા, સતત ભારે રક્તસ્રાવ અથવા લોહીની ઉલટી',
      no: 'ના, સામાન્ય ડાઘ અથવા સહેજ લોહી છે'
    },
    kn: {
      q: 'ತುರ್ತುಸ್ಥಿತಿಯನ್ನು ನಿರ್ಣಯಿಸಲು: ನಿರಂತರವಾಗಿ ಭಾರಿ ರಕ್ತಸ್ರಾವವಾಗುತ್ತಿದೆಯೇ ಅಥವಾ ವಾಂತಿಯಲ್ಲಿ ಹೆಚ್ಚು ತಾಜಾ ರಕ್ತ ಬಂದಿದೆಯೇ?',
      en: 'To assess urgency: Is there continuous active heavy bleeding, or did you vomit a large volume of fresh blood?',
      yes: 'ಹೌದು, ನಿರಂತರ ಭಾರಿ ರಕ್ತಸ್ರಾವ ಅಥವಾ ರಕ್ತ ವಾಂತಿ',
      no: 'ಇಲ್ಲ, ಕೇವಲ ಸಣ್ಣ ರಕ್ತದ ಕಲೆ ಮಾತ್ರ'
    },
    ml: {
      q: 'അടിയന്തിരാവസ്ഥ വിലയിരുത്താൻ: തുടർച്ചയായി കഠിനമായ രക്തസ്രാവമുണ്ടോ അല്ലെങ്കിൽ ഛർദ്ദിയിൽ ധാരാളം രക്തം വന്നോ?',
      en: 'To assess urgency: Is there continuous active heavy bleeding, or did you vomit a large volume of fresh blood?',
      yes: 'അതെ, കഠിനമായ രക്തസ്രാവം അല്ലെങ്കിൽ രക്തം ഛർദ്ദിക്കൽ',
      no: 'അല്ല, ചെറിയ രക്തക്കറ മാത്രം'
    },
    pa: {
      q: 'ਐਮਰਜੈਂਸੀ ਜਾਂਚ ਲਈ: ਕੀ ਲਗਾਤਾਰ ਤੇਜ਼ ਖੂਨ ਵਹਿ ਰਿਹਾ ਹੈ ਜਾਂ ਉਲਟੀ ਵਿੱਚ ਜ਼ਿਆਦਾ ਖੂਨ ਆਇਆ ਹੈ?',
      en: 'To assess urgency: Is there continuous active heavy bleeding, or did you vomit a large volume of fresh blood?',
      yes: 'ਹਾਂ, ਲਗਾਤਾਰ ਭਾਰੀ ਖੂਨ ਵਹਿਣਾ ਜਾਂ ਖੂਨ ਦੀ ਉਲਟੀ',
      no: 'ਨਹੀਂ, ਮਾਮੂਲੀ ਦਾਗ਼ ਜਾਂ ਹਲਕਾ ਜਿਹਾ ਖੂਨ ਹੈ'
    }
  },
  neuro: {
    en: {
      q: 'To assess urgency: Did you completely lose consciousness, have a seizure/convulsion, or notice sudden facial droop or weakness on one side?',
      en: 'To assess urgency: Did you completely lose consciousness, have a seizure/convulsion, or notice sudden facial droop or weakness on one side?',
      yes: 'Yes, lost consciousness, seizure, or one-sided paralysis',
      no: 'No, just mild dizziness or lightheadedness without fainting'
    },
    hi: {
      q: 'स्थिति की गंभीरता जांचने के लिए: क्या आप पूरी तरह बेहोश हुए थे, दौरा पड़ा था, या चेहरे/शरीर में लकवा जैसा महसूस हुआ?',
      en: 'To assess urgency: Did you completely lose consciousness, have a seizure/convulsion, or notice sudden facial droop or weakness on one side?',
      yes: 'हाँ, बेहोश हुए थे / दौरा या एक तरफ कमजोरी',
      no: 'नहीं, केवल हल्का चक्कर या कमजोरी है, बेहोश नहीं हुए'
    },
    mr: {
      q: 'तातडी तपासण्यासाठी: तुम्ही पूर्णपणे बेशुद्ध पडला होता का, झटका आला होता, किंवा चेहऱ्याची/एका बाजूची हालचाल बंद झाली आहे का?',
      en: 'To assess urgency: Did you completely lose consciousness, have a seizure/convulsion, or notice sudden facial droop or weakness on one side?',
      yes: 'होय, बेशुद्ध पडलो / झटका किंवा एका बाजूला अर्धांगवायू',
      no: 'नाही, केवळ हलकी चक्कर किंवा अशक्तपणा आहे'
    },
    bn: {
      q: 'জরুরী অবস্থা যাচাই করতে: আপনি কি সম্পূর্ণ অজ্ঞান হয়েছিলেন, খিঁচুনি হয়েছিল, বা শরীরের একপাশে পক্ষাঘাত বা মুখ বেঁকে গেছে?',
      en: 'To assess urgency: Did you completely lose consciousness, have a seizure/convulsion, or notice sudden facial droop or weakness on one side?',
      yes: 'হ্যাঁ, অজ্ঞান হওয়া / খিঁচুনি বা একপাশে অবশ ভাব',
      no: 'না, কেবল হালকা মাথা ঘোরা বা দুর্বলতা আছে'
    },
    te: {
      q: 'అత్యవసర పరిస్థితిని అంచనా వేయడానికి: మీరు పూర్తిగా స్పృహ కోల్పోయారా, ఫిట్స్ వచ్చాయా, లేదా ముఖం/ఒకవైపు పక్షవాతం వచ్చిందా?',
      en: 'To assess urgency: Did you completely lose consciousness, have a seizure/convulsion, or notice sudden facial droop or weakness on one side?',
      yes: 'అవును, స్పృహ కోల్పోవడం / ఫిట్స్ లేదా ఒకవైపు బలహీనత',
      no: 'లేదు, కేవలం తేలికపాటి తలతిరుగుడు మాత్రమే'
    },
    ta: {
      q: 'அவசரநிலையை மதிப்பிட: நீங்கள் முழுமையாக மயக்கமடைந்தீர்களா, வலிப்பு வந்ததா, அல்லது முகத்தில்/ஒரு பக்கத்தில் பக்கவாதம் போன்ற பலவீனம் ஏற்பட்டதா?',
      en: 'To assess urgency: Did you completely lose consciousness, have a seizure/convulsion, or notice sudden facial droop or weakness on one side?',
      yes: 'ஆம், மயக்கம் / வலிப்பு அல்லது ஒரு பக்க பக்கவாதம்',
      no: 'இல்லை, லேசான மயக்கம் அல்லது பலவீனம் மட்டுமே'
    },
    gu: {
      q: 'તાકીદ ચકાસવા માટે: શું તમે તદ્દન બેભાન થઈ ગયા હતા, આંચકી આવી હતી, અથવા ચહેરા/એક તરફ લકવા જેવી નબળાઈ છે?',
      en: 'To assess urgency: Did you completely lose consciousness, have a seizure/convulsion, or notice sudden facial droop or weakness on one side?',
      yes: 'હા, બેભાન થવું / આંચકી અથવા એક બાજુ લકવો',
      no: 'ના, ફક્ત હળવો ચક્કર કે નબળાઈ છે'
    },
    kn: {
      q: 'ತುರ್ತುಸ್ಥಿತಿಯನ್ನು ನಿರ್ಣಯಿಸಲು: ನೀವು ಸಂಪೂರ್ಣವಾಗಿ ಪ್ರಜ್ಞೆ ತಪ್ಪಿದ್ದೀರಾ, ಫಿಟ್ಸ್ ಬಂದಿತ್ತೇ, ಅಥವಾ ಮುಖ/ಒಂದು ಬದಿಯಲ್ಲಿ ಪಾರ್ಶ್ವವಾಯು ಲಕ್ಷಣವಿದೆಯೇ?',
      en: 'To assess urgency: Did you completely lose consciousness, have a seizure/convulsion, or notice sudden facial droop or weakness on one side?',
      yes: 'ಹೌದು, ಪ್ರಜ್ಞೆ ತಪ್ಪುವುದು / ಫಿಟ್ಸ್ ಅಥವಾ ಒಂದು ಬದಿಯ ದೌರ್ಬಲ್ಯ',
      no: 'ಇಲ್ಲ, ಕೇವಲ ಸೌಮ್ಯ ತಲೆತಿರುಗುವಿಕೆ ಮಾತ್ರ'
    },
    ml: {
      q: 'അടിയന്തിരാവസ്ഥ വിലയിരുത്താൻ: പൂർണ്ണമായും ബോധം പോയോ, അപസ്മാരം ഉണ്ടായോ, അതോ മുഖത്തോ ഒരു വശത്തോ തളർച്ച അനുഭവപ്പെട്ടോ?',
      en: 'To assess urgency: Did you completely lose consciousness, have a seizure/convulsion, or notice sudden facial droop or weakness on one side?',
      yes: 'അതെ, ബോധക്ഷയം / അപസ്മാരം അല്ലെങ്കിൽ ഒരു വശത്തെ തളർച്ച',
      no: 'അല്ല, നേരിയ തലകറക്കം അല്ലെങ്കിൽ ക്ഷീണം മാത്രം'
    },
    pa: {
      q: 'ਐਮਰਜੈਂਸੀ ਜਾਂਚ ਲਈ: ਕੀ ਤੁਸੀਂ ਪੂਰੀ ਤਰ੍ਹਾਂ ਬੇਹੋਸ਼ ਹੋ ਗਏ ਸੀ, ਦੌਰਾ ਪਿਆ ਸੀ, ਜਾਂ ਚਿਹਰੇ/ਇੱਕ ਪਾਸੇ ਲਕਵਾ ਮਹਿਸੂਸ ਹੋਇਆ?',
      en: 'To assess urgency: Did you completely lose consciousness, have a seizure/convulsion, or notice sudden facial droop or weakness on one side?',
      yes: 'ਹਾਂ, ਬੇਹੋਸ਼ ਹੋਣਾ / ਦੌਰਾ ਜਾਂ ਇੱਕ ਪਾਸੇ ਕਮਜ਼ੋਰੀ',
      no: 'ਨਹੀਂ, ਸਿਰਫ਼ ਹਲਕਾ ਚੱਕਰ ਜਾਂ ਕਮਜ਼ੋਰੀ ਹੈ'
    }
  },
  toxicology: {
    en: {
      q: 'To assess urgency: Was there toxic ingestion, chemical poisoning, or severe trauma needing immediate resuscitation?',
      en: 'To assess urgency: Was there toxic ingestion, chemical poisoning, or severe trauma needing immediate resuscitation?',
      yes: 'Yes, toxic exposure or severe acute emergency',
      no: 'No, manageable condition, can proceed with regular consultation'
    },
    hi: {
      q: 'स्थिति की गंभीरता जांचने के लिए: क्या किसी विषैले पदार्थ/रसायन का सेवन हुआ है या गंभीर चोट आई है?',
      en: 'To assess urgency: Was there toxic ingestion, chemical poisoning, or severe trauma needing immediate resuscitation?',
      yes: 'हाँ, जहरीला पदार्थ या गंभीर आपातकालीन स्थिति',
      no: 'नहीं, सामान्य स्थिति है, नियमित जांच जारी रखें'
    },
    mr: {
      q: 'तातडी तपासण्यासाठी: विषारी पदार्थ/रसायन पोटात गेले आहे का किंवा गंभीर दुखापत झाली आहे का?',
      en: 'To assess urgency: Was there toxic ingestion, chemical poisoning, or severe trauma needing immediate resuscitation?',
      yes: 'होय, विषबाधा किंवा गंभीर अपघात',
      no: 'नाही, सामान्य स्थिती आहे, नियमित तपासणी सुरू ठेवा'
    },
    bn: {
      q: 'জরুরী অবস্থা যাচাই করতে: কোনো বিষাক্ত পদার্থ খাওয়া হয়েছে বা গুরুতর আঘাত লেগেছে কি?',
      en: 'To assess urgency: Was there toxic ingestion, chemical poisoning, or severe trauma needing immediate resuscitation?',
      yes: 'হ্যাঁ, বিষাক্ত কিছু খাওয়া বা গুরুতর জরুরী অবস্থা',
      no: 'না, সাধারণ অবস্থা, নিয়মিত পরামর্শ সম্ভব'
    },
    te: {
      q: 'అత్యవసర పరిస్థితిని అంచనా వేయడానికి: విషపూరిత పదార్థం తీసుకోవడం లేదా తీవ్రమైన గాయం జరిగిందా?',
      en: 'To assess urgency: Was there toxic ingestion, chemical poisoning, or severe trauma needing immediate resuscitation?',
      yes: 'అవును, విషపూరిత పదార్థం లేదా తీవ్రమైన అత్యవసరం',
      no: 'లేదు, సాధారణ పరిస్థితి, రెగ్యులర్ సంప్రదింపు సరిపోతుంది'
    },
    ta: {
      q: 'அவசரநிலையை மதிப்பிட: விஷப்பொருள் உட்கொள்ளப்பட்டதா அல்லது தீவிர விபத்து/காயம் ஏற்பட்டுள்ளதா?',
      en: 'To assess urgency: Was there toxic ingestion, chemical poisoning, or severe trauma needing immediate resuscitation?',
      yes: 'ஆம், நச்சுப்பொருள் அல்லது தீவிர அவசரநிலை',
      no: 'இல்லை, இயல்பான நிலை, வழக்கமான ஆலோசனை தொடரலாம்'
    },
    gu: {
      q: 'તાકીદ ચકાસવા માટે: શું કોઈ ઝેરી પદાર્થ/રસાયણ લેવાયું છે અથવા ગંભીર ઇજા થઈ છે?',
      en: 'To assess urgency: Was there toxic ingestion, chemical poisoning, or severe trauma needing immediate resuscitation?',
      yes: 'હા, ઝેરી પદાર્થ અથવા ગંભીર કટોકટી',
      no: 'ના, સામાન્ય સ્થિતિ છે, નિયમિત તપાસ ચાલુ રાખો'
    },
    kn: {
      q: 'ತುರ್ತುಸ್ಥಿತಿಯನ್ನು ನಿರ್ಣಯಿಸಲು: ವಿಷಕಾರಿ ಪದಾರ್ಥ ಸೇವಿಸಲಾಗಿದೆಯೇ ಅಥವಾ ತೀವ್ರ ಗಾಯವಾಗಿದೆಯೇ?',
      en: 'To assess urgency: Was there toxic ingestion, chemical poisoning, or severe trauma needing immediate resuscitation?',
      yes: 'ಹೌದು, ವಿಷಕಾರಿ ವಸ್ತು ಅಥವಾ ತೀವ್ರ ತುರ್ತುಸ್ಥಿತಿ',
      no: 'ಇಲ್ಲ, ಸಾಮಾನ್ಯ ಸ್ಥಿತಿ, ನಿಯಮಿತ ಸಮಾಲೋಚನೆ ಮುಂದುವರಿಸಿ'
    },
    ml: {
      q: 'അടിയന്തിരാവസ്ഥ വിലയിരുത്താൻ: വിഷവസ്തുക്കൾ ഉള്ളിൽ ചെന്നിട്ടുണ്ടോ അല്ലെങ്കിൽ ഗുരുതരമായ പരിക്കേറ്റോ?',
      en: 'To assess urgency: Was there toxic ingestion, chemical poisoning, or severe trauma needing immediate resuscitation?',
      yes: 'അതെ, വിഷബാധ അല്ലെങ്കിൽ ഗുരുതര അത്യാഹിതം',
      no: 'അല്ല, സാധാരണ അവസ്ഥ, തുടർ പരിശോധന മതിയാകും'
    },
    pa: {
      q: 'ਐਮਰਜੈਂਸੀ ਜਾਂਚ ਲਈ: ਕੀ ਕੋਈ ਜ਼ਹਿਰੀਲਾ ਪਦਾਰਥ/ਰਸਾਇਣ ਅੰਦਰ ਗਿਆ ਹੈ ਜਾਂ ਗੰਭੀਰ ਸੱਟ ਲੱਗੀ ਹੈ?',
      en: 'To assess urgency: Was there toxic ingestion, chemical poisoning, or severe trauma needing immediate resuscitation?',
      yes: 'ਹਾਂ, ਜ਼ਹਿਰੀਲਾ ਪਦਾਰਥ ਜਾਂ ਗੰਭੀਰ ਐਮਰਜੈਂਸੀ',
      no: 'ਨਹੀਂ, ਆਮ ਸਥਿਤੀ ਹੈ, ਨਿਯਮਿਤ ਜਾਂਚ ਜਾਰੀ ਰੱਖੋ'
    }
  }
};

/**
 * Stage 2: Generate the confirming follow-on question to clear or corroborate the emergency.
 * Strictly guarantees English when language is 'en' and proper native language for all supported Indian languages.
 */
export function getEmergencyConfirmationQuestion(category: string, language: string): RedFlagConfirmationQuestion {
  const normLang = (language || 'en').toLowerCase().trim();
  const catKey = EMERGENCY_CONFIRMATION_DATA[category] ? category : 'toxicology';
  const catData = EMERGENCY_CONFIRMATION_DATA[catKey];
  
  // Choose exact language, falling back to English if requested or unknown, or Hindi if hindi-family
  const langData = catData[normLang] || (normLang === 'hi' ? catData.hi : catData.en);
  const isEn = normLang === 'en';

  return {
    id: 'q_emergency_confirmation',
    category,
    question_localized: isEn ? langData.en : langData.q,
    question_en: langData.en,
    section: 'emergency_confirmation',
    field_name: `emergency_confirmation_${category}`,
    framework_stage: 'emergency_confirmation',
    options: [langData.yes, langData.no]
  };
}

/**
 * Stage 3: Evaluate patient response to the confirmation question.
 * Returns whether emergency is confirmed or cleared.
 */
export function evaluateConfirmationAnswer(
  answerText: string,
  category: string
): { isConfirmed: boolean; isCleared: boolean; trigger: RedFlagTrigger | null } {
  const t = (answerText || '').toLowerCase();
  const hasAffirmativeOrSevereIndicators =
    t.includes('असहनीय') ||
    t.includes('असह्य') ||
    t.includes('बहुत तेज') ||
    t.includes('तीव्र') ||
    t.includes('unbearable') ||
    t.includes('excruciating') ||
    t.includes('severe') ||
    t.includes('10/10') ||
    t.includes('9/10') ||
    t.includes('8/10');

  const isExplicitlyClearing =
    !hasAffirmativeOrSevereIndicators && (
      t.startsWith('no') ||
      t.startsWith('नहीं') ||
      t.includes('no,') ||
      t.includes('नहीं,') ||
      t.includes('can wait') ||
      t.includes('regular doctor') ||
      t.includes('regular consultation') ||
      t.includes('manageable') ||
      (t.includes('सहनीय') && !t.includes('असहनीय')) ||
      (t.includes('सह्य') && !t.includes('असह्य')) ||
      t.includes('muscular') ||
      t.includes('मांसपेशियों') ||
      t.includes('muscle') ||
      t.includes('mild') ||
      t.includes('हल्का') ||
      t.includes('acidity') ||
      t.includes('एसिडिटी') ||
      t.includes('गैस') ||
      t.includes('gas') ||
      t.includes('heartburn') ||
      t.includes('normal') ||
      (t.includes('सामान्य') && !t.includes('असामान्य')) ||
      t.includes('minor') ||
      t.includes('मामूली') ||
      t.includes('just dizziness') ||
      t.includes('चक्कर या कमजोरी')
    );

  if (isExplicitlyClearing) {
    return { isConfirmed: false, isCleared: true, trigger: null };
  }

  const isExplicitlyConfirming =
    t.startsWith('yes') ||
    t.startsWith('हाँ') ||
    t.startsWith('हा') ||
    t.startsWith('जी') ||
    t.startsWith('yeah') ||
    t.startsWith('yep') ||
    t.startsWith('sure') ||
    t.startsWith('correct') ||
    t.startsWith('true') ||
    t.startsWith('indeed') ||
    t.startsWith('होय') ||
    t.startsWith('हो') ||
    t.startsWith('ஆம்') ||
    t.startsWith('అవును') ||
    t.startsWith('হ্যাঁ') ||
    t.startsWith('હા') ||
    t.startsWith('ಹೌದು') ||
    t.startsWith('അതെ') ||
    t.startsWith('ਹਾਂ') ||
    t.includes('yes,') ||
    t.includes('हाँ,') ||
    t.includes('crushing') ||
    t.includes('radiating') ||
    t.includes('gasping') ||
    t.includes('unbearable') ||
    t.includes('excruciating') ||
    t.includes('severe pain') ||
    t.includes('very severe') ||
    t.includes('terrible pain') ||
    t.includes('extreme pain') ||
    t.includes('hurts so bad') ||
    t.includes('hurts badly') ||
    t.includes("can't bear") ||
    t.includes("cannot bear") ||
    t.includes("can't stand") ||
    t.includes("cannot walk") ||
    t.includes('8 to 10') ||
    t.includes('8-10') ||
    t.includes('9/10') ||
    t.includes('10/10') ||
    t.includes('10 out of 10') ||
    t.includes('9 out of 10') ||
    t.includes('8 out of 10') ||
    t.includes('lost consciousness') ||
    t.includes('seizure') ||
    t.includes('paralysis') ||
    t.includes('vomiting blood') ||
    t.includes('heavy bleeding') ||
    t.includes('urgent') ||
    t.includes('इमरजेंसी') ||
    t.includes('असहनीय') ||
    t.includes('बहुत तेज दर्द') ||
    t.includes('तीव्र दर्द') ||
    t.includes('बर्दाश्त नहीं') ||
    t.includes('सहन नहीं') ||
    t.includes('असह्य वेदना') ||
    t.includes('तीव्र वेदना') ||
    t.includes('கடுமையான வலி') ||
    t.includes('తీవ్రమైన నొప్పి') ||
    t.includes('প্রচণ্ড ব্যথা') ||
    t.includes('અસહ્ય દુખાવો') ||
    t.includes('ತೀವ್ರ ನೋವು') ||
    t.includes('കഠിനമായ വേദന') ||
    t.includes('ਬਹੁਤ ਤੇਜ਼ ਦਰਦ') ||
    t.includes('बेहोश हुए') ||
    t.includes('toxic exposure') ||
    t.includes('acute emergency');

  if (isExplicitlyConfirming) {
    const triggerMap: Record<string, RedFlagTrigger> = {
      cardiac: {
        rule_id: 'RF_CARDIAC_CONFIRMED',
        severity: 'CRITICAL',
        title: 'Confirmed Acute Cardiac Emergency (Crushing/Radiating Chest Pain)',
        patient_instruction_hi: 'आपकी स्थिति की गंभीरता की पुष्टि हो गई है। कृपया तुरंत आपातकालीन कक्ष (Room ER-1) में डॉ. प्रिया नायर से मिलें।',
        patient_instruction_en: 'Acute cardiac emergency confirmed. Please proceed directly to Emergency Room ER-1 to see Dr. Priya Nair immediately.',
        triage_alert_message: 'CRITICAL: Patient confirmed acute crushing/radiating chest pain with diaphoresis/dyspnea.',
        allocated_doctor_id: 'dr_nair',
        doctor_name: 'Dr. Priya Nair',
        room_number: 'Room ER-1',
        department_code: 'emergency'
      },
      respiratory: {
        rule_id: 'RF_RESPIRATORY_CONFIRMED',
        severity: 'CRITICAL',
        title: 'Confirmed Severe Respiratory Distress (Dyspnea at Rest)',
        patient_instruction_hi: 'कृपया तुरंत आपातकालीन कक्ष (Room ER-1) पर जाएं — ऑक्सीजन व इमरजेंसी टीम सतर्क है।',
        patient_instruction_en: 'Please proceed immediately to Emergency Room ER-1 — acute respiratory distress confirmed.',
        triage_alert_message: 'CRITICAL: Patient confirmed gasping for air at rest / respiratory compromise.',
        allocated_doctor_id: 'dr_nair',
        doctor_name: 'Dr. Priya Nair',
        room_number: 'Room ER-1',
        department_code: 'emergency'
      },
      severe_pain: {
        rule_id: 'RF_SEVERE_PAIN_CONFIRMED',
        severity: 'CRITICAL',
        title: 'Confirmed Excruciating Pain (Score 8-10/10 / Acute Emergency)',
        patient_instruction_hi: 'आपकी दर्द की तीव्रता अत्यधिक है। कृपया तुरंत आपातकालीन कक्ष (Room ER-1) में डॉ. प्रिया नायर से मिलें।',
        patient_instruction_en: 'Excruciating pain intensity confirmed. Please proceed directly to Emergency Room ER-1 to see Dr. Priya Nair immediately.',
        triage_alert_message: 'CRITICAL: Patient confirmed unbearable excruciating pain (8-10/10).',
        allocated_doctor_id: 'dr_nair',
        doctor_name: 'Dr. Priya Nair',
        room_number: 'Room ER-1',
        department_code: 'emergency'
      },
      hemorrhage: {
        rule_id: 'RF_HEMORRHAGE_CONFIRMED',
        severity: 'CRITICAL',
        title: 'Confirmed Active Severe Hemorrhage',
        patient_instruction_hi: 'कृपया तुरंत आपातकालीन कक्ष (Room ER-1) पर जाएं — सक्रिय रक्तस्राव प्रोटोकॉल लागू है।',
        patient_instruction_en: 'Please proceed immediately to Emergency Room ER-1 — active severe hemorrhage confirmed.',
        triage_alert_message: 'CRITICAL: Patient confirmed active severe bleeding or hematemesis.',
        allocated_doctor_id: 'dr_nair',
        doctor_name: 'Dr. Priya Nair',
        room_number: 'Room ER-1',
        department_code: 'emergency'
      },
      neuro: {
        rule_id: 'RF_NEURO_CONFIRMED',
        severity: 'CRITICAL',
        title: 'Confirmed Neurological Crisis (Syncope / Seizure / Stroke signs)',
        patient_instruction_hi: 'कृपया तुरंत आपातकालीन कक्ष (Room ER-1) पर जाएं — डॉ. प्रिया नायर को सूचित कर दिया गया है।',
        patient_instruction_en: 'Please step to Emergency Room ER-1 immediately for urgent assessment by Dr. Priya Nair.',
        triage_alert_message: 'CRITICAL: Patient confirmed loss of consciousness, seizure, or focal neurological deficit.',
        allocated_doctor_id: 'dr_nair',
        doctor_name: 'Dr. Priya Nair',
        room_number: 'Room ER-1',
        department_code: 'emergency'
      }
    };

    const trigger = triggerMap[category] || {
      rule_id: 'RF_EMERGENCY_CONFIRMED',
      severity: 'CRITICAL',
      title: 'Confirmed Acute Medical Emergency',
      patient_instruction_hi: 'कृपया तुरंत आपातकालीन कक्ष (Room ER-1) पर जाएं — डॉ. प्रिया नायर को सूचित कर दिया गया है।',
      patient_instruction_en: 'Please proceed immediately to Emergency Room ER-1 to see Dr. Priya Nair.',
      triage_alert_message: 'CRITICAL: Patient confirmed acute emergency presentation on clinical follow-up.',
      allocated_doctor_id: 'dr_nair',
      doctor_name: 'Dr. Priya Nair',
      room_number: 'Room ER-1',
      department_code: 'emergency'
    };

    return { isConfirmed: true, isCleared: false, trigger };
  }

  // If patient did not explicitly clear and still describes significant pain or distress, corroborate emergency
  const hasDistress = 
    t.includes('pain') || 
    t.includes('hurt') || 
    t.includes('ache') ||
    t.includes('दर्द') || 
    t.includes('दुख') || 
    t.includes('वेदना') || 
    t.includes('नొప్పి') || 
    t.includes('வலி') || 
    t.includes('ব্যথা') || 
    t.includes('breath') || 
    t.includes('सांस');

  if (hasDistress && (category === 'severe_pain' || category === 'cardiac' || category === 'respiratory')) {
    const fallbackTrigger = {
      rule_id: category === 'cardiac' ? 'RF_CARDIAC_CONFIRMED' : category === 'respiratory' ? 'RF_RESPIRATORY_CONFIRMED' : 'RF_SEVERE_PAIN_CONFIRMED',
      severity: 'CRITICAL' as const,
      title: 'Confirmed Acute Medical Emergency',
      patient_instruction_hi: 'कृपया तुरंत आपातकालीन कक्ष (Room ER-1) पर जाएं — डॉ. प्रिया नायर को सूचित कर दिया गया है।',
      patient_instruction_en: 'Please proceed immediately to Emergency Room ER-1 to see Dr. Priya Nair.',
      triage_alert_message: 'CRITICAL: Patient confirmed acute emergency pain presentation on clinical follow-up.',
      allocated_doctor_id: 'dr_nair',
      doctor_name: 'Dr. Priya Nair',
      room_number: 'Room ER-1',
      department_code: 'emergency'
    };
    return { isConfirmed: true, isCleared: false, trigger: fallbackTrigger };
  }

  return { isConfirmed: false, isCleared: true, trigger: null };
}

export function checkRedFlagRules(
  transcript: string,
  section: string,
  field_name: string,
  value: string
): RedFlagTrigger | null {
  const text = `${transcript} ${field_name} ${value}`.toLowerCase();

  // Rule 1: Acute Chest Pain, Pressure, or Cardiac Warning
  if (
    text.includes('chest pain') ||
    text.includes('chest pressure') ||
    text.includes('chest tightness') ||
    text.includes('crushing') ||
    text.includes('radiating to arm') ||
    text.includes('radiates to arm') ||
    text.includes('heart attack') ||
    text.includes('cardiac') ||
    text.includes('angina') ||
    text.includes('छाती में दर्द') ||
    text.includes('सीना दर्द') ||
    text.includes('छाती में भारीपन') ||
    text.includes('छाती में दबाव') ||
    text.includes('दिल का दौरा') ||
    text.includes('हार्ट अटैक')
  ) {
    return {
      rule_id: 'RF_CARDIAC_ACUTE',
      severity: 'CRITICAL',
      title: 'Acute Chest Pain / Cardiac Emergency Warning',
      patient_instruction_hi: 'कृपया तुरंत आपातकालीन कक्ष (Room ER-1) पर जाएं — डॉ. प्रिया नायर (इमरजेंसी लीड) को सूचित कर दिया गया है।',
      patient_instruction_en: 'Please proceed directly to Emergency Room ER-1 immediately — Dr. Priya Nair (Emergency Lead) has been notified.',
      triage_alert_message: 'CRITICAL: Acute chest pain, pressure, or cardiac emergency presentation.',
      allocated_doctor_id: 'dr_nair',
      doctor_name: 'Dr. Priya Nair',
      room_number: 'Room ER-1',
      department_code: 'emergency'
    };
  }

  // Rule 2: FAST Stroke Protocol Symptoms
  if (
    text.includes('facial droop') ||
    text.includes('slurred speech') ||
    text.includes('sudden weakness') ||
    text.includes('hemiparesis') ||
    text.includes('stroke') ||
    text.includes('paralysis') ||
    text.includes('बोलने में तकलीफ') ||
    text.includes('मुंह टेढ़ा') ||
    text.includes('लकवा') ||
    text.includes('एक तरफ कमजोरी')
  ) {
    return {
      rule_id: 'RF_STROKE_FAST',
      severity: 'CRITICAL',
      title: 'Acute Stroke Symptoms (FAST)',
      patient_instruction_hi: 'कृपया तुरंत आपातकालीन कक्ष (Room ER-1) पर जाएं। स्ट्रोक टीम और डॉ. प्रिया नायर अलर्ट पर हैं।',
      patient_instruction_en: 'Please proceed to Emergency Room ER-1 immediately. Stroke team and Dr. Priya Nair are alerted.',
      triage_alert_message: 'CRITICAL: Patient reported sudden facial/speech/weakness symptoms (FAST stroke flag).',
      allocated_doctor_id: 'dr_nair',
      doctor_name: 'Dr. Priya Nair',
      room_number: 'Room ER-1',
      department_code: 'emergency'
    };
  }

  // Rule 3: Severe Respiratory Distress
  if (
    text.includes('shortness of breath') ||
    text.includes('difficulty breathing') ||
    text.includes('trouble breathing') ||
    text.includes('cannot breathe') ||
    text.includes("can't breathe") ||
    text.includes('breathless') ||
    text.includes('gasping') ||
    text.includes('suffocating') ||
    text.includes('choking') ||
    text.includes('stridor') ||
    text.includes('सांस नहीं आ रही') ||
    text.includes('दम घुट रहा') ||
    text.includes('सांस फूलना') ||
    text.includes('सांस लेने में तकलीफ')
  ) {
    return {
      rule_id: 'RF_RESPIRATORY_DISTRESS',
      severity: 'CRITICAL',
      title: 'Severe Respiratory Distress',
      patient_instruction_hi: 'कृपया तुरंत आपातकालीन कक्ष (Room ER-1) पर जाएं — ऑक्सीजन और इमरजेंसी टीम तैयार है।',
      patient_instruction_en: 'Please proceed to Emergency Room ER-1 immediately — oxygen and resuscitation team alerted.',
      triage_alert_message: 'CRITICAL: Patient reported dyspnea, acute shortness of breath, or respiratory distress.',
      allocated_doctor_id: 'dr_nair',
      doctor_name: 'Dr. Priya Nair',
      room_number: 'Room ER-1',
      department_code: 'emergency'
    };
  }

  // Rule 4: Critical Bleeding / Hemorrhage (Hematemesis / Hemoptysis)
  if (
    text.includes('vomiting blood') ||
    text.includes('coughing blood') ||
    text.includes('blood in vomit') ||
    text.includes('blood in cough') ||
    text.includes('blood in stool') ||
    text.includes('blood in urine') ||
    text.includes('hematemesis') ||
    text.includes('hemoptysis') ||
    text.includes('खून की उल्टी') ||
    text.includes('खांसी में खून') ||
    text.includes('मल में खून') ||
    text.includes('पेशाब में खून') ||
    text.includes('बहुत ज्यादा खून') ||
    text.includes('uncontrolled bleeding') ||
    text.includes('heavy bleeding') ||
    text.includes('भारी रक्तस्राव')
  ) {
    return {
      rule_id: 'RF_HEMORRHAGE_ACUTE',
      severity: 'CRITICAL',
      title: 'Active Severe Hemorrhage / Bleeding',
      patient_instruction_hi: 'कृपया तुरंत आपातकालीन कक्ष (Room ER-1) पर जाएं — ट्रॉमा व इमरजेंसी टीम को सूचित कर दिया गया है।',
      patient_instruction_en: 'Please proceed immediately to Emergency Room ER-1 — active bleeding protocol initiated.',
      triage_alert_message: 'CRITICAL: Active severe hemorrhage (hematemesis / hemoptysis / acute bleeding).',
      allocated_doctor_id: 'dr_nair',
      doctor_name: 'Dr. Priya Nair',
      room_number: 'Room ER-1',
      department_code: 'emergency'
    };
  }

  // Rule 5: Syncope / Loss of Consciousness / Seizures
  if (
    text.includes('fainted') ||
    text.includes('blackout') ||
    text.includes('passed out') ||
    text.includes('unconscious') ||
    text.includes('loss of consciousness') ||
    text.includes('convulsion') ||
    text.includes('seizure') ||
    text.includes('epilepsy') ||
    text.includes('collapsed') ||
    text.includes('बेहोश') ||
    text.includes('चक्कर खाकर गिर') ||
    text.includes('दौरे')
  ) {
    return {
      rule_id: 'RF_NEURO_SYNCOPE',
      severity: 'CRITICAL',
      title: 'Syncope / Altered Consciousness / Seizure',
      patient_instruction_hi: 'कृपया तुरंत आपातकालीन कक्ष (Room ER-1) पर जाएं — डॉ. प्रिया नायर को सूचित किया गया है।',
      patient_instruction_en: 'Please step to Emergency Room ER-1 immediately for urgent assessment by Dr. Priya Nair.',
      triage_alert_message: 'CRITICAL: Recent syncope, loss of consciousness, or seizure activity reported.',
      allocated_doctor_id: 'dr_nair',
      doctor_name: 'Dr. Priya Nair',
      room_number: 'Room ER-1',
      department_code: 'emergency'
    };
  }

  // Rule 6: Extreme / Excruciating Pain (Score 8-10, Unbearable, Thunderclap Headache, Acute Abdomen)
  if (
    text.includes('10/10') ||
    text.includes('9/10') ||
    text.includes('8/10') ||
    text.includes('score 10') ||
    text.includes('score 9') ||
    text.includes('score 8') ||
    text.includes('pain 10') ||
    text.includes('pain 9') ||
    text.includes('pain 8') ||
    text.includes('pain is 10') ||
    text.includes('pain is 9') ||
    text.includes('10 out of 10') ||
    text.includes('9 out of 10') ||
    text.includes('8 out of 10') ||
    text.includes('unbearable') ||
    text.includes('excruciating') ||
    text.includes('terrible pain') ||
    text.includes('extreme pain') ||
    text.includes('hurts so bad') ||
    text.includes('hurts badly') ||
    text.includes("can't bear") ||
    text.includes("cannot bear") ||
    text.includes('worst headache') ||
    text.includes('thunderclap') ||
    text.includes('severe headache') ||
    text.includes('acute abdomen') ||
    text.includes('severe stomach pain') ||
    text.includes('severe abdominal pain') ||
    text.includes('severe chest pain') ||
    text.includes('असहनीय दर्द') ||
    text.includes('बहुत तेज दर्द') ||
    text.includes('तीव्र दर्द') ||
    text.includes('तीव्र असहनीय') ||
    text.includes('बर्दाश्त नहीं') ||
    text.includes('सहन नहीं') ||
    text.includes('बहुत ज्यादा दर्द') ||
    text.includes('भयंकर दर्द') ||
    text.includes('असह्य वेदना') ||
    text.includes('तीव्र वेदना') ||
    text.includes('खूप जास्त दुखत') ||
    text.includes('கடுமையான வலி') ||
    text.includes('தாங்க முடியாத வலி') ||
    text.includes('తీవ్రమైన నొప్పి') ||
    text.includes('భరించలేని నొప్పి') ||
    text.includes('প্রচণ্ড ব্যথা') ||
    text.includes('অসহ্য ব্যথা') ||
    text.includes('અસહ્ય દુખાવો') ||
    text.includes('ತೀವ್ರ ನೋವು') ||
    text.includes('ಕഠിനമായ വേദന') ||
    text.includes('ਬਹੁਤ ਤੇਜ਼ ਦਰਦ') ||
    (text.includes('severe') && text.includes('pain'))
  ) {
    return {
      rule_id: 'RF_SEVERE_EXCRUCIATING_PAIN',
      severity: 'CRITICAL',
      title: 'Severe Excruciating Pain (Score >= 8/10 / Acute Emergency)',
      patient_instruction_hi: 'आपकी दर्द की तीव्रता बहुत अधिक है। कृपया तुरंत आपातकालीन कक्ष (Room ER-1) में डॉ. प्रिया नायर से मिलें।',
      patient_instruction_en: 'Severe pain intensity reported. Please proceed directly to Emergency Room ER-1 to see Dr. Priya Nair immediately.',
      triage_alert_message: 'HIGH: Patient reported severe/excruciating pain intensity (>=8/10 or acute emergency presentation).',
      allocated_doctor_id: 'dr_nair',
      doctor_name: 'Dr. Priya Nair',
      room_number: 'Room ER-1',
      department_code: 'emergency'
    };
  }

  // Rule 7: Anaphylaxis / Airway Compromise
  if (
    (text.includes('allergy') || text.includes('एलर्जी') || text.includes('reaction') || text.includes('anaphylaxis')) &&
    (text.includes('swelling') || text.includes('throat') || text.includes('lip') || text.includes('tongue') || text.includes('सूजन') || text.includes('गले में'))
  ) {
    return {
      rule_id: 'RF_ANAPHYLAXIS',
      severity: 'CRITICAL',
      title: 'Severe Anaphylactic Reaction Warning',
      patient_instruction_hi: 'कृपया तुरंत आपातकालीन कक्ष (Room ER-1) पर जाएं — एयरवे और एनाफिलेक्सिस प्रोटोकॉल सक्रिय है।',
      patient_instruction_en: 'Please proceed immediately to Emergency Room ER-1 — anaphylaxis protocol activated.',
      triage_alert_message: 'CRITICAL: Potential anaphylactic airway compromise with facial/pharyngeal swelling.',
      allocated_doctor_id: 'dr_nair',
      doctor_name: 'Dr. Priya Nair',
      room_number: 'Room ER-1',
      department_code: 'emergency'
    };
  }

  // Rule 8: Toxicology / Poisoning / Snakebite / Overdose / Severe Trauma
  if (
    text.includes('poison') ||
    text.includes('snake bite') ||
    text.includes('overdose') ||
    text.includes('chemical') ||
    text.includes('pesticide') ||
    text.includes('accident') ||
    text.includes('head injury') ||
    text.includes('severe burn') ||
    text.includes('कीटनाशक') ||
    text.includes('जहर') ||
    text.includes('सांप ने काटा')
  ) {
    return {
      rule_id: 'RF_TOXICOLOGY_EMERGENCY',
      severity: 'CRITICAL',
      title: 'Acute Poisoning / Toxic Exposure / Envenomation / Trauma',
      patient_instruction_hi: 'कृपया तुरंत आपातकालीन कक्ष (Room ER-1) पर जाएं — डॉ. प्रिया नायर और एंटी-टॉक्सिन टीम सतर्क है।',
      patient_instruction_en: 'Please proceed immediately to Emergency Room ER-1 — emergency lead Dr. Priya Nair alerted.',
      triage_alert_message: 'CRITICAL: Acute toxic exposure, poisoning, envenomation, or severe trauma reported.',
      allocated_doctor_id: 'dr_nair',
      doctor_name: 'Dr. Priya Nair',
      room_number: 'Room ER-1',
      department_code: 'emergency'
    };
  }

  return null;
}
