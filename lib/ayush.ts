/**
 * Ministry of AYUSH — Specialized Ayurvedic Clinical Framework
 * Comprehensive Ayurvedic clinical intake supporting all three classical assessment modes:
 * 1. Dashavidha Pariksha (दशविध परीक्षा — 10-Fold Comprehensive Assessment)
 * 2. Ashtavidha Pariksha (अष्टविध परीक्षा — 8-Fold Diagnostic Examination)
 * 3. Trividha Pariksha (त्रिविध परीक्षा — 3-Fold Clinical Examination)
 *
 * Classical References:
 * - Charaka Samhita Vimana Sthana 8/94 (Dashavidha Pariksha)
 * - Yogaratnakara (Ashtavidha Pariksha: Nadi, Mutra, Mala, Jihva, Shabda, Sparsha, Druk, Akruti)
 * - Charaka Samhita Vimanashthana 4/3 & Ashtanga Hridaya (Trividha Pariksha: Darshana, Sparshana, Prashna)
 */

export type AyushAssessmentType = 'dashavidha' | 'ashtavidha' | 'trividha';

export interface DashavidhaPariksha {
  dushya: string;         // 1. Dhatus & Malas afflicted
  desha: string;          // 2. Habitat & Climate (Anupa, Jangala, Sadharana)
  bala: string;           // 3. Physical Strength & Immunity (Pravara, Madhyama, Avara)
  kala: string;           // 4. Seasonal & Diurnal Influence
  anala_agni: string;     // 5. Digestive Fire (Samagni, Vishamagni, Tikshnagni, Mandagni)
  prakriti: string;       // 6. Constitutional Baseline (Vata, Pitta, Kapha, Dwandvaja, Tridoshic)
  vayas: string;          // 7. Life Stage (Balya <16, Madhyama 16-60, Vriddha >60)
  sattva: string;         // 8. Mental Resilience (Pravara, Madhyama, Avara)
  satmya: string;         // 9. Dietary Habituation & Sensitivities
  ahara_shakti: string;   // 10. Ingestion & Digestion Power
  recommendations: string[];
}

export interface AshtavidhaPariksha {
  nadi: string;           // 1. Pulse examination (Gati: Sarpa/Vata, Manduka/Pitta, Hamsa/Kapha)
  mutra: string;          // 2. Urine characteristics (Color, turbidity, frequency)
  mala: string;           // 3. Stool / Bowel elimination (Shushka/Constipated, Picchila/Ama, Drava/Loose)
  jihva: string;          // 4. Tongue examination (Nirama/Clean, Sama/Coated white/yellow)
  shabda: string;         // 5. Voice & Speech (Gambhira/Deep, Spashta/Clear, Ksheena/Weak)
  sparsha: string;        // 6. Tactile / Skin feel (Sheeta/Cold-dry, Ushna/Warm, Snigdha/Oily-smooth)
  druk: string;           // 7. Eyes & Vision (Ruksha/Dry, Rakta/Reddish, Snigdha-Shweta/Clear-bright)
  akruti: string;         // 8. Physical stature & gait (Krisha/Slender, Madhyama/Medium, Sthula/Heavy)
  dominant_dosha: string;
  recommendations: string[];
}

export interface TrividhaPariksha {
  darshana: string;       // 1. Visual observation (General appearance, complexion, posture, edema)
  sparshana: string;      // 2. Tactile palpation (Skin temperature, pulse rhythm, abdominal tenderness)
  prashna: string;        // 3. Clinical interrogation (Chief complaint, sleep pattern, appetite, bowel habit)
  dominant_dosha: string;
  recommendations: string[];
}

export interface DoshaAssessment {
  vata_score: number;
  pitta_score: number;
  kapha_score: number;
  dominant_prakriti: 'Vata' | 'Pitta' | 'Kapha' | 'Vata-Pitta' | 'Pitta-Kapha' | 'Vata-Kapha' | 'Tridoshic';
  agni_type: 'Mandagni (Low/Slow)' | 'Tikshnagni (Intense/Sharp)' | 'Vishamagni (Irregular)' | 'Samagni (Balanced)';
  koshta_type: 'Mrudu (Soft)' | 'Madhyama (Medium)' | 'Krura (Hard/Constipated)';
  bala: 'Pravara (High)' | 'Madhyama (Medium)' | 'Avara (Low)';
  recommendations: string[];
}

export const AYUSH_PASSWORD = 'Ayurveda';

// ============================================================================
// 1. DASHAVIDHA PARIKSHA (दशविध परीक्षा — 10-Fold Assessment Questions)
// ============================================================================
export const AYUSH_DASHIVIDHA_QUESTIONS = [
  {
    id: 'ayush_dosha_body',
    section: 'ayush_prakriti',
    field_name: 'body_physique_prakriti',
    dashavidha_dimension: 'Prakriti',
    question_localized: {
      en: 'What best describes your body build and constitutional tendency (Prakriti)?',
      hi: 'आपके शरीर की स्वाभाविक बनावट और शारीरिक प्रकृति क्या है (प्रकृति)?',
      bn: 'আপনার শরীরের গঠন এবং শারীরিক প্রকৃতি কোনটি (প্রকৃতি)?',
      mr: 'तुमच्या शरीराची रचना आणि प्रकृती कोणती आहे (प्रकृती)?',
      te: 'మీ శరీర నిర్మాణం మరియు సహజ ప్రకృతి ఏమిటి (ప్రకృతి)?',
      ta: 'உங்கள் உடல் அமைப்பு மற்றும் பிரகிருதி தன்மை என்ன (பிரகிருதி)?',
      gu: 'તમારા શરીરનું બંધારણ અને પ્રકૃતિ શું છે (પ્રકૃતિ)?',
      kn: 'ನಿಮ್ಮ ದೇಹ ರಚನೆ ಮತ್ತು ಪ್ರಕೃತಿ ಯಾವುದು (ಪ್ರಕೃತಿ)?',
      ml: 'നിങ്ങളുടെ ശരീരഘടനയും പ്രകൃതിയും ഏതാണ് (പ്രകൃതി)?',
      pa: 'ਤੁਹਾਡੇ ਸਰੀਰ ਦੀ ਬਣਤਰ ਅਤੇ ਪ੍ਰਕਿਰਤੀ ਕੀ ਹੈ (ਪ੍ਰਕਿਰਤੀ)?'
    },
    question_en: 'What best describes your body build and constitutional tendency (Prakriti)?',
    options_by_lang: {
      en: [
        'Lean / Slender, dry skin, quick movements (Vata)',
        'Medium build, athletic, easily perspires, warm body (Pitta)',
        'Broad / Heavy build, smooth skin, calm temperament (Kapha)',
        'Dual / Mixed characteristics (Vata-Pitta / Pitta-Kapha)'
      ],
      hi: [
        'दुबला-पतला, सूखी त्वचा, चंचल स्वभाव (वात / Vata)',
        'मध्यम शरीर, आसानी से पसीना, गर्मी लगना (पित्त / Pitta)',
        'मजबूत-भारी शरीर, चिकनी त्वचा, शांत स्वभाव (कफ / Kapha)',
        'द्विदोषज / मिश्रित लक्षण (वात-पित्त / पित्त-कफ)'
      ]
    }
  },
  {
    id: 'ayush_agni_digestion',
    section: 'ayush_agni',
    field_name: 'digestive_fire_agni',
    dashavidha_dimension: 'Anala / Agni',
    question_localized: {
      en: 'How is your digestive fire and appetite (Agni & Ahara Shakti)?',
      hi: 'आपकी पाचन शक्ति और भूख कैसी रहती है (अग्नि व आहार शक्ति)?',
      bn: 'আপনার হজম শক্তি এবং ক্ষুধা কেমন (অগ্নি ও আহার শক্তি)?',
      mr: 'तुमची पचनशक्ती आणि भूक कशी आहे (अग्नि व आहार शक्ती)?',
      te: 'మీ జీర్ణశక్తి మరియు ఆకలి ఎలా ఉంటుంది (అగ్ని & ఆహార శక్తి)?',
      ta: 'உங்கள் செரிமான சக்தி மற்றும் பசி எவ்வாறு உள்ளது (அக்னி & ஆகார சக்தி)?',
      gu: 'તમારી પાચનશક્તિ અને ભૂખ કેવી રહે છે (અગ્નિ અને આહાર શક્તિ)?',
      kn: 'ನಿಮ್ಮ ಜೀರ್ಣಕ್ರಿಯೆ ಮತ್ತು ಹಸಿವು ಹೇಗಿದೆ (ಅಗ್ನಿ & ಆಹಾರ ಶಕ್ತಿ)?',
      ml: 'നിങ്ങളുടെ ദഹനവും വിശപ്പും എങ്ങനെയാണ് (അഗ്നി & ആഹാര ശക്തി)?',
      pa: 'ਤੁਹਾਡੀ ਪਾਚਨ ਸ਼ਕਤੀ ਅਤੇ ਭੁੱਖ ਕਿਵੇਂ ਰਹਿੰਦੀ ਹੈ (ਅਗਨੀ ਤੇ ਆਹਾਰ ਸ਼ਕਤੀ)?'
    },
    question_en: 'How is your digestive fire and appetite (Agni & Ahara Shakti)?',
    options_by_lang: {
      en: [
        'Irregular appetite / Bloating & gas after meals (Vishamagni)',
        'Intense hunger / Acidity & burning if meals delayed (Tikshnagni)',
        'Slow digestion / Sluggish feeling, heaviness after food (Mandagni)',
        'Balanced appetite & easy digestion (Samagni)'
      ],
      hi: [
        'अनियमित भूख, गैस या पेट फूलना (विषमाग्नि / Vishamagni)',
        'तीव्र भूख, भोजन में देरी पर एसिडिटी/जलन (तीक्ष्णाग्नि / Tikshnagni)',
        'धीमी पाचन शक्ति, भोजन के बाद भारीपन (मंदाग्नि / Mandagni)',
        'संतुलित भूख और समय पर पाचन (समाग्नि / Samagni)'
      ]
    }
  },
  {
    id: 'ayush_desha_habitat',
    section: 'ayush_desha',
    field_name: 'habitat_climate_desha',
    dashavidha_dimension: 'Desha',
    question_localized: {
      en: 'What is the climate and habitat of the region you live in (Desha)?',
      hi: 'आप जिस क्षेत्र या शहर में रहते हैं, वहां का वातावरण कैसा है (देश)?',
      bn: 'আপনি যে অঞ্চলে থাকেন তার পরিবেশ ও আবহাওয়া কেমন (দেশ)?',
      mr: 'तुम्ही ज्या भागात राहता तेथील हवामान कसे आहे (देश)?',
      te: 'మీరు నివసించే ప్రాంత వాతావరణం ఎలా ఉంటుంది (దేశ)?',
      ta: 'நீங்கள் வாழும் பகுதியின் தட்பவெப்பநிலை எப்படி உள்ளது (தேசம்)?',
      gu: 'તમે જ્યાં રહો છો તે વિસ્તારનું વાતાવરણ કેવું છે (દેશ)?',
      kn: 'ನೀವು ವಾಸಿಸುವ ಸ್ಥಳದ ಹವಾಮಾನ ಹೇಗಿದೆ (ದೇಶ)?',
      ml: 'നിങ്ങൾ താമസിക്കുന്ന സ്ഥലത്തെ കാലാവസ്ഥ എങ്ങനെയാണ് (தேசம்)?',
      pa: 'ਤੁਸੀਂ ਜਿਸ ਇਲਾਕੇ ਵਿੱਚ ਰਹਿੰਦੇ ਹੋ ਉੱਥੋਂ ਦਾ ਮੌਸਮ ਕਿਹੋ ਜਿਹਾ ਹੈ (ਦੇਸ਼)?'
    },
    question_en: 'What is the climate and habitat of the region you live in (Desha)?',
    options_by_lang: {
      en: [
        'Humid / Coastal / Marshy area (Anupa Desha)',
        'Dry / Arid / Hot plains (Jangala Desha)',
        'Moderate / Mixed temperate terrain (Sadharana Desha)',
        'Cold hilly / Mountainous terrain'
      ],
      hi: [
        'तटीय या नमी वाला क्षेत्र (अनूप देश / Anupa)',
        'गर्म व सूखा मैदानी क्षेत्र (जांगल देश / Jangala)',
        'मध्यम व सामान्य जलवायु वाला क्षेत्र (साधारण देश / Sadharana)',
        'पहाड़ी या ठंडा क्षेत्र'
      ]
    }
  },
  {
    id: 'ayush_bala_sattva',
    section: 'ayush_bala',
    field_name: 'strength_mental_resilience',
    dashavidha_dimension: 'Bala & Sattva',
    question_localized: {
      en: 'How is your physical endurance and mental stress tolerance (Bala & Sattva)?',
      hi: 'आपकी शारीरिक सहनशक्ति और मानसिक तनाव सहने की क्षमता कैसी है (बल व सत्त्व)?',
      bn: 'আপনার শারীরিক শক্তি এবং মানসিক চাপ সহ্য করার ক্ষমতা কেমন (বল ও সত্ত্ব)?',
      mr: 'तुमची शारीरिक सहनशीलता आणि मानसिक ताण सहन करण्याची क्षमता कशी आहे (बल व सत्त्व)?',
      te: 'మీ శారీరక బలం మరియు మానసిక ఒత్తిడిని తట్టుకునే శక్తి ఎలా ఉంది (బల & సత్త్వ)?',
      ta: 'உங்கள் உடல் பலம் மற்றும் மன அமைதி எவ்வாறு உள்ளது (பலம் & சத்துவம்)?',
      gu: 'તમારી શારીરિક સહનશક્તિ અને માનસિક તણાવ સહન કરવાની ક્ષમતા કેવી છે (બળ અને સત્ત્વ)?',
      kn: 'ನಿಮ್ಮ ದೈಹಿಕ ಶಕ್ತಿ ಮತ್ತು ಮಾನಸಿಕ ಒತ್ತಡ ತಡೆದುಕೊಳ್ಳುವ ಸಾಮರ್ಥ್ಯ ಹೇಗಿದೆ (ಬಲ & ಸತ್ತ್ವ)?',
      ml: 'നിങ്ങളുടെ ശാരീരിക കരുത്തും മാനസിക ക്ഷമതയും എങ്ങനെയാണ് (ബലം & സത്വം)?',
      pa: 'ਤੁਹਾਡੀ ਸਰੀਰਕ ਸਹਿਣਸ਼ਕਤੀ ਅਤੇ ਮਾਨਸਿਕ ਤਣਾਅ ਸਹਿਣ ਦੀ ਤਾਕਤ ਕਿਵੇਂ ਹੈ (ਬਲ ਤੇ ਸੱਤਵ)?'
    },
    question_en: 'How is your physical endurance and mental stress tolerance (Bala & Sattva)?',
    options_by_lang: {
      en: [
        'High stamina, calm mind, handles stress easily (Pravara Bala/Sattva)',
        'Moderate stamina, manageable stress (Madhyama Bala/Sattva)',
        'Easily fatigued, prone to worry, low tolerance (Avara Bala/Sattva)',
        'Constantly fatigued or under high strain'
      ],
      hi: [
        'उत्तम सहनशक्ति, शांत मन, तनाव सहने में सक्षम (प्रवर बल व सत्त्व)',
        'मध्यम सहनशक्ति, सामान्य तनाव (मध्यम बल व सत्त्व)',
        'जल्दी थकान, चिंता/घबराहट, कम सहनशीलता (अवर बल व सत्त्व)',
        'निरंतर कमजोरी या अत्यधिक तनाव'
      ]
    }
  },
  {
    id: 'ayush_satmya_diet',
    section: 'ayush_satmya',
    field_name: 'habituated_diet_sensitivities',
    dashavidha_dimension: 'Satmya & Ahara',
    question_localized: {
      en: 'What foods or tastes agree with you, and any known sensitivities (Satmya)?',
      hi: 'आपको कौन सा भोजन अनुकूल पड़ता है, और क्या कोई खाद्य असुविधा होती है (सात्म्य)?',
      bn: 'কোন খাবার আপনার জন্য আরামদায়ক এবং কোনো খাবারে সমস্যা হয় কি (সাত্ম্য)?',
      mr: 'तुम्हाला कोणते अन्न अनुकूल ठरते, आणि काही अन्नाने त्रास होतो का (सात्म्य)?',
      te: 'మీకు ఏ ఆహారం సరిపడుతుంది మరియు ఏ ఆహారంతో ఇబ్బంది కలుగుతుంది (సాత్మ్య)?',
      ta: 'எந்த உணவு உங்களுக்கு உகந்தது, ஏதேனும் உணவில் ஒவ்வாமை உள்ளதா (சாத்மியா)?',
      gu: 'તમને કયો ખોરાક માફક આવે છે અને કયા ખોરાકથી તકલીફ થાય છે (સાત્મ્ય)?',
      kn: 'ನಿಮಗೆ ಯಾವ ಆಹಾರ ಸರಿಹೊಂದುತ್ತದೆ ಮತ್ತು ಯಾವುದರಿಂದ ತೊಂದರೆಯಾಗುತ್ತದೆ (ಸಾತ್ಮ್ಯ)?',
      ml: 'ഏത് ഭക്ഷണമാണ് നിങ്ങൾക്ക് ഇണങ്ങുന്നത് (സാത്മ്യ)?',
      pa: 'ਤੁਹਾਨੂੰ ਕਿਹੜਾ ਭੋਜਨ ਮਾਫਕ ਆਉਂਦਾ ਹੈ (ਸਾਤਮਿਆ)?'
    },
    question_en: 'What foods or tastes agree with you, and any known sensitivities (Satmya)?',
    options_by_lang: {
      en: [
        'Home cooked warm meals agree well (Oka Satmya)',
        'Sensitive to spicy, sour, or oily foods (Pitta trigger)',
        'Sensitive to cold, heavy, or dairy foods (Kapha trigger)',
        'Sensitive to raw, dry, or gas-producing foods (Vata trigger)'
      ],
      hi: [
        'घर का बना ताजा व गर्म भोजन अनुकूल रहता है (ओक सात्म्य)',
        'मसालेदार, खट्टे या तले भोजन से पित्त/जलन होती है',
        'ठंडे, भारी या डेयरी पदार्थों से कफ/भारीपन होता है',
        'कच्चे, सूखे या बादी वाले भोजन से गैस/दर्द होता है'
      ]
    }
  }
];

// ============================================================================
// 2. ASHTAVIDHA PARIKSHA (अष्टविध परीक्षा — 8-Fold Diagnostic Questions)
// ============================================================================
export const AYUSH_ASHTAVIDHA_QUESTIONS = [
  {
    id: 'ayush_ashta_nadi',
    section: 'ashtavidha_nadi',
    field_name: 'pulse_rhythm_nadi',
    dimension: 'Nadi (Pulse / Bio-Rhythm)',
    question_localized: {
      en: 'What is the nature of your pulse or heart rhythm feel (Nadi)?',
      hi: 'आपकी नाड़ी की गति और धड़कन का अनुभव कैसा रहता है (नाड़ी)?',
      bn: 'আপনার নাড়ির গতি ও স্পন্দন কেমন অনুভব হয় (নাড়ী)?',
      mr: 'तुमच्या नाडीची गती आणि ठोके कसे जाणवतात (नाडी)?',
      te: 'మీ నాడి వేగం మరియు గుండె స్పందన ఎలా ఉంది (నాడి)?',
      ta: 'உங்கள் நாடித் துடிப்பு எவ்வாறு உணரப்படுகிறது (நாடி)?',
      gu: 'તમારી નાડીની ગતિ કેવી અનુભવાય છે (નાડી)?',
      kn: 'ನಿಮ್ಮ ನಾಡಿ ಬಡಿತ ಹೇಗಿದೆ (ನಾಡಿ)?',
      ml: 'നിങ്ങളുടെ നാഡിമിടിപ്പ് എങ്ങനെയാണ് (നാഡി)?',
      pa: 'ਤੁਹਾਡੀ ਨਾੜੀ ਦੀ ਚਾਲ ਕਿਵੇਂ ਮਹਿਸੂਸ ਹੁੰਦੀ ਹੈ (ਨਾੜੀ)?'
    },
    question_en: 'What is the nature of your pulse or heart rhythm feel (Nadi)?',
    options_by_lang: {
      en: [
        'Quick, thin, irregular like a snake movement (Vata / Sarpa Gati)',
        'Jumping, bounding, warm like a frog hop (Pitta / Manduka Gati)',
        'Slow, steady, soft like a swan glide (Kapha / Hamsa Gati)',
        'Normal and regular pulse'
      ],
      hi: [
        'चंचल, पतली व अनियमित गति (वातज नाड़ी / सर्प गति)',
        'उछलती हुई, गर्म व तीव्र गति (पित्तज नाड़ी / मण्डूक गति)',
        'धीमी, स्थिर व भारी गति (कफज नाड़ी / हंस गति)',
        'सामान्य और नियमित गति'
      ]
    }
  },
  {
    id: 'ayush_ashta_mala_mutra',
    section: 'ashtavidha_mala_mutra',
    field_name: 'elimination_mala_mutra',
    dimension: 'Mala & Mutra (Bowel & Urine)',
    question_localized: {
      en: 'How are your bowel movements and urination pattern (Mala & Mutra)?',
      hi: 'आपके पेट साफ होने (मल) और पेशाब (मूत्र) की स्थिति कैसी रहती है?',
      bn: 'আপনার পেট পরিষ্কার (মল) ও প্রস্রাবের (মূত্র) অবস্থা কেমন?',
      mr: 'तुमचे पोट साफ होणे (मल) आणि लघवीची (मूत्र) स्थिती कशी आहे?',
      te: 'మీ మల విసర్జన మరియు మూత్ర విసర్జన విధానం ఎలా ఉంది?',
      ta: 'உங்கள் மலம் கழித்தல் மற்றும் சிறுநீர் கழிக்கும் நிலை எவ்வாறு உள்ளது?',
      gu: 'તમારું પેટ સાફ થવું અને પેશાબની સ્થિતિ કેવી છે?',
      kn: 'ನಿಮ್ಮ ಮಲಬದ್ಧತೆ ಮತ್ತು ಮೂತ್ರ ವಿಸರ್ಜನೆ ಹೇಗಿದೆ?',
      ml: 'നിങ്ങളുടെ മലമൂത്ര വിസർജ്ജനം എങ്ങനെയാണ്?',
      pa: 'ਤੁਹਾਡਾ ਪੇਟ ਸਾਫ਼ ਹੋਣ ਅਤੇ ਪਿਸ਼ਾਬ ਦੀ ਸਥਿਤੀ ਕਿਵੇਂ ਰਹਿੰਦੀ ਹੈ?'
    },
    question_en: 'How are your bowel movements and urination pattern (Mala & Mutra)?',
    options_by_lang: {
      en: [
        'Hard, dry, irregular stool or constipation (Krura Koshta / Vata)',
        'Frequent loose stool, burning or yellowish urine (Mrudu Koshta / Pitta)',
        'Heavy, mucous-coated stool, pale clear urine (Madhyama Koshta / Kapha)',
        'Smooth and regular daily elimination'
      ],
      hi: [
        'कड़ा, सूखा मल या कब्ज की समस्या (क्रूर कोष्ठ / वात)',
        'दस्त की प्रवृत्ति, पेट में मरोड़ या पेशाब में जलन (मृदु कोष्ठ / पित्त)',
        'चिपचिपा या भारी मल, झागदार मूत्र (मध्यम कोष्ठ / कफ)',
        'सुगम और नियमित दैनिक निष्कासन'
      ]
    }
  },
  {
    id: 'ayush_ashta_jihva_shabda',
    section: 'ashtavidha_jihva_shabda',
    field_name: 'tongue_voice_jihva_shabda',
    dimension: 'Jihva & Shabda (Tongue & Voice)',
    question_localized: {
      en: 'How does your tongue look, and what is your voice tone (Jihva & Shabda)?',
      hi: 'आपकी जीभ की स्थिति (जिह्वा) और आवाज का स्वरूप (शब्द) कैसा रहता है?',
      bn: 'আপনার জিভের অবস্থা এবং কণ্ঠস্বর কেমন থাকে?',
      mr: 'तुमची जीभ आणि आवाजाचा स्तर कसा आहे?',
      te: 'మీ నాలుక మరియు గొంతు స్వభావం ఎలా ఉంది?',
      ta: 'உங்கள் நாக்கு மற்றும் குரல் எவ்வாறு உள்ளது?',
      gu: 'તમારી જીભની સ્થિતિ અને અવાજ કેવો રહે છે?',
      kn: 'ನಿಮ್ಮ ನಾಲಿಗೆ ಮತ್ತು ಧ್ವನಿ ಹೇಗಿದೆ?',
      ml: 'നിങ്ങളുടെ നാക്കും ശബ്ദവും എങ്ങനെയാണ്?',
      pa: 'ਤੁਹਾਡੀ ਜੀਭ ਅਤੇ ਆਵਾਜ਼ ਕਿਵੇਂ ਰਹਿੰਦੀ ਹੈ?'
    },
    question_en: 'How does your tongue look, and what is your voice tone (Jihva & Shabda)?',
    options_by_lang: {
      en: [
        'Dry, cracked, rough tongue with hoarse voice (Vata)',
        'Reddish tongue, yellow coating, sharp speech (Pitta)',
        'Thick white coating (Ama), pale tongue, deep voice (Kapha)',
        'Clean, pink tongue with clear speech (Nirama)'
      ],
      hi: [
        'सूखी, फटी या खुरदरी जीभ, भारी/रुखी आवाज (वात)',
        'लाल जीभ, पीली परत, तीखा या स्पष्ट स्वर (पित्त)',
        'सफेद मोटी परत (आम), भारी व मंद आवाज (कफ)',
        'गुलाबी, साफ जीभ और स्पष्ट आवाज (निराम)'
      ]
    }
  },
  {
    id: 'ayush_ashta_sparsha_druk',
    section: 'ashtavidha_sparsha_druk',
    field_name: 'skin_eyes_sparsha_druk',
    dimension: 'Sparsha, Druk & Akruti (Touch, Eyes & Build)',
    question_localized: {
      en: 'How is your skin texture, eyes, and body appearance (Sparsha, Druk & Akruti)?',
      hi: 'आपकी त्वचा का स्पर्श (स्पर्श), आंखें (दृक्) और शरीर का आकार (आकृति) कैसा है?',
      bn: 'আপনার ত্বক, চোখ এবং শরীরের গঠন কেমন?',
      mr: 'तुमची त्वचा, डोळे आणि शरीराचा आकार कसा आहे?',
      te: 'మీ చర్మం, కళ్లు మరియు శరీర ఆకారం ఎలా ఉంది?',
      ta: 'உங்கள் தோல், கண்கள் மற்றும் உடல் தோற்றம் எவ்வாறு உள்ளது?',
      gu: 'તમારી ત્વચા, આંખો અને શરીરનું બંધારણ કેવું છે?',
      kn: 'ನಿಮ್ಮ ಚರ್ಮ, ಕಣ್ಣುಗಳು ಮತ್ತು ದೇಹದ ರಚನೆ ಹೇಗಿದೆ?',
      ml: 'നിങ്ങളുടെ ചർമ്മം, കണ്ണുകൾ, ശരീരപ്രകൃതി എങ്ങനെയാണ്?',
      pa: 'ਤੁਹਾਡੀ ਚਮੜੀ, ਅੱਖਾਂ ਅਤੇ ਸਰੀਰ ਦਾ ਆਕਾਰ ਕਿਵੇਂ ਹੈ?'
    },
    question_en: 'How is your skin texture, eyes, and body appearance (Sparsha, Druk & Akruti)?',
    options_by_lang: {
      en: [
        'Dry, cool skin, dull/dry eyes, slender frame (Vata)',
        'Warm, flushed skin, sensitive reddish eyes, athletic frame (Pitta)',
        'Soft, cool, oily skin, bright calm eyes, broad heavy frame (Kapha)',
        'Normal balanced skin and clear vision'
      ],
      hi: [
        'सूखी, ठंडी त्वचा, रुखी आंखें, दुबला शरीर (वात)',
        'गर्म त्वचा, लालिमा वाली संवेदनशील आंखें, मध्यम शरीर (पित्त)',
        'चिकनी, ठंडी त्वचा, चमकदार शांत आंखें, गठीला भारी शरीर (कफ)',
        'सामान्य संतुलित त्वचा और दृष्टि'
      ]
    }
  }
];

// ============================================================================
// 3. TRIVIDHA PARIKSHA (त्रिविध परीक्षा — 3-Fold Clinical Assessment Questions)
// ============================================================================
export const AYUSH_TRIVIDHA_QUESTIONS = [
  {
    id: 'ayush_tri_darshana',
    section: 'trividha_darshana',
    field_name: 'inspection_darshana',
    dimension: 'Darshana (Visual Inspection)',
    question_localized: {
      en: 'What visible physical signs or changes do you notice in your body (Darshana)?',
      hi: 'आपके शरीर में देखने योग्य क्या मुख्य शारीरिक लक्षण या बदलाव दिखाई देते हैं (दर्शन)?',
      bn: 'আপনার শরীরে দৃশ্যমান কী শারীরিক পরিবর্তন দেখা যাচ্ছে (দর্শন)?',
      mr: 'तुमच्या शरीरावर दिसणारे कोणते मुख्य बदल किंवा लक्षणे आहेत (दर्शन)?',
      te: 'మీ శరీరంలో కనిపించే ముఖ్యమైన మార్పులు లేదా లక్షణాలు ఏమిటి (దర్శన)?',
      ta: 'உங்கள் உடலில் காணப்படும் முக்கிய அறிகுறிகள் என்ன (தர்சனம்)?',
      gu: 'તમારા શરીરમાં દેખાતા મુખ્ય લક્ષણો કે ફેરફારો શું છે (દર્શન)?',
      kn: 'ನಿಮ್ಮ ದೇಹದಲ್ಲಿ ಕಂಡುಬರುವ ಮುಖ್ಯ ಬದಲಾವಣೆಗಳೇನು (ದರ್ಶನ)?',
      ml: 'നിങ്ങളുടെ ശരീരത്തിൽ കാണുന്ന പ്രധാന ലക്ഷണങ്ങൾ എന്തൊക്കെയാണ് (ദർശനം)?',
      pa: 'ਤੁਹਾਡੇ ਸਰੀਰ ਵਿੱਚ ਦਿਖਾਈ ਦੇਣ ਵਾਲੇ ਮੁੱਖ ਲੱਛਣ ਕੀ ਹਨ (ਦਰਸ਼ਨ)?'
    },
    question_en: 'What visible physical signs or changes do you notice in your body (Darshana)?',
    options_by_lang: {
      en: [
        'Pallor, dryness, prominent veins or weight loss (Vata)',
        'Redness, skin rashes, excessive flushing or jaundice signs (Pitta)',
        'Swelling, puffiness under eyes, heaviness or pallor (Kapha)',
        'No visible deformity or discoloration'
      ],
      hi: [
        'सूखापन, उभरी नसें, कालापन या वजन घटना (वातज लक्षण)',
        'लालिमा, त्वचा पर दाने/चकत्ते, पीलापन (पित्तज लक्षण)',
        'शरीर या पैरों में सूजन, आंखों के नीचे भारीपन (कफज लक्षण)',
        'कोई विशेष दृश्य विकृति नहीं'
      ]
    }
  },
  {
    id: 'ayush_tri_sparshana',
    section: 'trividha_sparshana',
    field_name: 'palpation_sparshana',
    dimension: 'Sparshana (Tactile Assessment)',
    question_localized: {
      en: 'How does your body feel to touch regarding temperature and tenderness (Sparshana)?',
      hi: 'स्पर्श करने पर शरीर का तापमान, दर्द या भारीपन कैसा महसूस होता है (स्पर्शन)?',
      bn: 'স্পর্শ করলে শরীরের তাপমাত্রা, ব্যথা বা কোমলতা কেমন অনুভূত হয় (স্পর্শন)?',
      mr: 'स्पर्शाने शरीराचे तापमान, दुखणे किंवा कडकपणा कसा जाणवतो (स्पर्शन)?',
      te: 'స్పర్శించినప్పుడు శరీర ఉష్ణోగ్రత, నొప్పి లేదా వాపు ఎలా ఉంది (స్పర్శన)?',
      ta: 'தொடும்போது உடல் வெப்பநிலை மற்றும் வலி எவ்வாறு உணரப்படுகிறது (ஸ்பர்சனம்)?',
      gu: 'સ્પર્શ કરવાથી શરીરનું તાપમાન, દુખાવો કે કઠિનતા કેવી લાગે છે (સ્પર્શન)?',
      kn: 'ಸ್ಪರ್ಶಿಸಿದಾಗ ದೇಹದ ಉಷ್ಣತೆ ಮತ್ತು ನೋವು ಹೇಗಿದೆ (ಸ್ಪರ್ಶನ)?',
      ml: 'തൊട്ടുനോക്കുമ്പോൾ ശരീര താപനിലയും വേദനയും എങ്ങനെയാണ് (സ്പർശനം)?',
      pa: 'ਛੂਹਣ ਤੇ ਸਰੀਰ ਦਾ ਤਾਪਮਾਨ ਅਤੇ ਦਰਦ ਕਿਵੇਂ ਮਹਿਸੂਸ ਹੁੰਦਾ ਹੈ (ਸਪਰਸ਼ਨ)?'
    },
    question_en: 'How does your body feel to touch regarding temperature and tenderness (Sparshana)?',
    options_by_lang: {
      en: [
        'Cold extremities, dry roughness, stiffness or tender joints (Vata)',
        'Burning sensation, hot skin, localized heat or tenderness (Pitta)',
        'Cool, moist, doughy swelling or numbness (Kapha)',
        'Normal warm temperature and soft touch'
      ],
      hi: [
        'हाथ-पैर ठंडे, रूखेपन के साथ जोड़ों में दर्द/जकड़न (वातज स्पर्शन)',
        'शरीर में जलन, त्वचा गर्म, छूने पर जलन या तेज दर्द (पित्तज स्पर्शन)',
        'ठंडी, नम त्वचा, छूने पर सूजन या सुन्नपन (कफज स्पर्शन)',
        'सामान्य तापमान और सुखद स्पर्श'
      ]
    }
  },
  {
    id: 'ayush_tri_prashna',
    section: 'trividha_prashna',
    field_name: 'clinical_inquiry_prashna',
    dimension: 'Prashna (Interrogation & Inquiry)',
    question_localized: {
      en: 'What are your primary symptoms regarding sleep, pain, and appetite (Prashna)?',
      hi: 'नींद, दर्द, भूख और दिनचर्या को लेकर आपकी मुख्य समस्या क्या है (प्रश्न)?',
      bn: 'ঘুম, ব্যথা এবং ক্ষুধা নিয়ে আপনার মূল সমস্যা কী (প্রশ্ন)?',
      mr: 'झोप, वेदना आणि भूक याबद्दल तुमची मुख्य समस्या काय आहे (प्रश्न)?',
      te: 'నిద్ర, నొప్పి మరియు ఆకలికి సంబంధించి మీ ప్రధాన సమస్య ఏమిటి (ప్రశ్న)?',
      ta: 'தூக்கம், வலி மற்றும் பசி தொடர்பான உங்கள் முக்கிய பிரச்சனை என்ன (பிரஸ்னம்)?',
      gu: 'ઊંઘ, દુખાવો અને ભૂખ અંગે તમારી મુખ્ય ફરિયાદ શું છે (પ્રશ્ન)?',
      kn: 'ನಿದ್ರೆ, ನೋವು ಮತ್ತು ಹಸಿವಿಗೆ ಸಂಬಂಧಿಸಿದಂತೆ ನಿಮ್ಮ ಮುಖ್ಯ ಸಮಸ್ಯೆ ಏನು (ಪ್ರಶ್ನೆ)?',
      ml: 'ഉറക്കം, വിശപ്പ്, വേദന എന്നിവയെക്കുറിച്ചുള്ള പ്രധാന പരാതി എന്താണ് (പ്രശ്നം)?',
      pa: 'ਨੀਂਦ, ਦਰਦ ਅਤੇ ਭੁੱਖ ਬਾਰੇ ਤੁਹਾਡੀ ਮੁੱਖ ਸ਼ਿਕਾਇਤ ਕੀ ਹੈ (ਪ੍ਰਸ਼ਨ)?'
    },
    question_en: 'What are your primary symptoms regarding sleep, pain, and appetite (Prashna)?',
    options_by_lang: {
      en: [
        'Disturbed sleep, shifting body aches, anxiety, irregular appetite (Vata)',
        'Excessive thirst, intense burning, acid reflux, irritability (Pitta)',
        'Excessive sleepiness, sluggish appetite, heaviness, lethargy (Kapha)',
        'Mild manageable lifestyle concerns'
      ],
      hi: [
        'टूटी-फूटी नींद, शरीर में बदलता दर्द, बेचैनी, भूख में उतार-चढ़ाव (वात)',
        'अधिक प्यास, सीने/पेट में जलन, चिड़चिड़ापन, खट्टी डकारें (पित्त)',
        'अत्यधिक नींद/आलस्य, भोजन में अरुचि, शरीर में भारीपन (कफ)',
        'हल्की-फुल्की सामान्य जीवनशैली समस्या'
      ]
    }
  }
];

// ============================================================================
// COMPUTATIONAL ENGINES FOR AYUSH ASSESSMENTS
// ============================================================================

export function computeDashavidhaPariksha(history: any[] = [], sessionInfo: any = {}): DashavidhaPariksha {
  let vata = 0;
  let pitta = 0;
  let kapha = 0;

  const dushya = 'Rasa Dhatu (Lymph/Plasma), Rakta Dhatu (Blood circulation)';
  let desha = 'Sadharana Desha (Moderate temperate habitat)';
  const bala = 'Madhyama Bala (Moderate physical stamina & immunity)';
  const kala = 'Sharad / Varsha Ritu (Seasonal & diurnal stage)';
  let anala_agni = 'Samagni (Balanced digestion & metabolism)';
  let prakriti = 'Vata-Pitta Prakriti';
  let vayas = 'Madhyama Vayas (Adult 16-60 yrs)';
  const sattva = 'Madhyama Sattva (Moderate psychological resilience)';
  const satmya = 'Oka-satmya (Habituated to seasonal Indian diet)';
  const ahara_shakti = 'Madhyama Abhyavaharana Shakti & Jarana Shakti';
  const recommendations: string[] = [];

  const ageNum = parseInt(String(sessionInfo?.age || '35'), 10);
  if (!isNaN(ageNum)) {
    if (ageNum < 16) {
      vayas = 'Balya Vayas (Childhood / Kapha predominant phase of growth)';
    } else if (ageNum > 60) {
      vayas = 'Vriddha Vayas (Geriatric / Vata predominant phase, requires Rasayana)';
    } else {
      vayas = 'Madhyama Vayas (Adult 16-60 yrs / Pitta phase of life)';
    }
  }

  for (const item of history) {
    const val = (item.value || '').toLowerCase();

    if (val.includes('lean') || val.includes('वात') || val.includes('dry') || val.includes('gas') || val.includes('joint')) {
      vata += 2;
    }
    if (val.includes('athletic') || val.includes('पित्त') || val.includes('acid') || val.includes('burn') || val.includes('warm')) {
      pitta += 2;
    }
    if (val.includes('heavy') || val.includes('कफ') || val.includes('smooth') || val.includes('slow') || val.includes('sluggish')) {
      kapha += 2;
    }

    if (val.includes('anupa') || val.includes('अनूप') || val.includes('humid') || val.includes('coastal')) {
      desha = 'Anupa Desha (Humid / Coastal terrain — Kapha-Vata potential)';
    } else if (val.includes('jangala') || val.includes('जांगल') || val.includes('arid') || val.includes('dry')) {
      desha = 'Jangala Desha (Arid / Dry terrain — Vata-Pitta potential)';
    }

    if (val.includes('vishamagni') || val.includes('विषमाग्नि')) {
      anala_agni = 'Vishamagni (Irregular digestive fire — Vata)';
      recommendations.push('Deepana-Pachana: Warm ginger water and Hingwashtak Churna to regulate Vishamagni.');
    } else if (val.includes('tikshnagni') || val.includes('तीक्ष्णाग्नि')) {
      anala_agni = 'Tikshnagni (Intense / Acidic digestive fire — Pitta)';
      recommendations.push('Pitta Shamana: Amla, coriander infusion, avoid excessively sour/pungent food.');
    } else if (val.includes('mandagni') || val.includes('मंदाग्नि')) {
      anala_agni = 'Mandagni (Sluggish digestive fire — Kapha)';
      recommendations.push('Agni Deepana: Trikatu Churna with honey, light freshly cooked meals.');
    }
  }

  if (vata > pitta && vata > kapha) prakriti = 'Vataja Prakriti (Vata Dominant)';
  else if (pitta > vata && pitta > kapha) prakriti = 'Pittaja Prakriti (Pitta Dominant)';
  else if (kapha > vata && kapha > pitta) prakriti = 'Kaphaja Prakriti (Kapha Dominant)';
  else if (vata >= 2 && pitta >= 2) prakriti = 'Vata-Pitta Dwandvaja Prakriti';
  else if (pitta >= 2 && kapha >= 2) prakriti = 'Pitta-Kapha Dwandvaja Prakriti';
  else prakriti = 'Sama-Tridoshaja Prakriti';

  if (recommendations.length === 0) {
    recommendations.push('Follow Ayurvedic Dinacharya (daily routine), Ritucharya (seasonal regimen), and Pathya-Apathya dietary guidance.');
  }

  return {
    dushya,
    desha,
    bala,
    kala,
    anala_agni,
    prakriti,
    vayas,
    sattva,
    satmya,
    ahara_shakti,
    recommendations
  };
}

export function computeAshtavidhaPariksha(history: any[] = []): AshtavidhaPariksha {
  let vata = 0, pitta = 0, kapha = 0;
  let nadi = 'Vata-Pitta Nadi (Manduka-Sarpa Gati)';
  const mutra = 'Pitta-Vata Mutra (Concentrated, mild burning)';
  let mala = 'Madhyama Koshta (Formed, regular)';
  let jihva = 'Nirama Jihva (Clean, pink)';
  const shabda = 'Spashta Shabda (Clear, distinct)';
  const sparsha = 'Samashitoshna Sparsha (Balanced temperature)';
  const druk = 'Prakrita Druk (Clear vision & bright sclera)';
  const akruti = 'Madhyama Akruti (Medium balanced build)';
  const recommendations: string[] = [];

  for (const item of history) {
    const val = (item.value || '').toLowerCase();
    if (val.includes('sarpa') || val.includes('वात') || val.includes('dry') || val.includes('krura') || val.includes('crack')) {
      vata += 2;
    }
    if (val.includes('manduka') || val.includes('पित्त') || val.includes('burn') || val.includes('red') || val.includes('flush')) {
      pitta += 2;
    }
    if (val.includes('hamsa') || val.includes('कफ') || val.includes('coat') || val.includes('ama') || val.includes('swelling')) {
      kapha += 2;
    }

    if (val.includes('nadi') || item.field_name?.includes('nadi')) {
      if (val.includes('sarpa') || val.includes('वात')) nadi = 'Vataja Nadi (Sarpa Gati — Quick, light, irregular)';
      else if (val.includes('manduka') || val.includes('पित्त')) nadi = 'Pittaja Nadi (Manduka Gati — Bounding, warm, elevated)';
      else if (val.includes('hamsa') || val.includes('कफ')) nadi = 'Kaphaja Nadi (Hamsa Gati — Slow, heavy, deep)';
    }

    if (val.includes('krura') || val.includes('कब्ज')) {
      mala = 'Krura Koshta (Vataja Mala — Dry, hard, constipation)';
      recommendations.push('Koshta Shuddhi: Triphala or Gandharva Haritaki at bedtime with lukewarm water.');
    } else if (val.includes('mrudu') || val.includes('loose') || val.includes('मरोड़')) {
      mala = 'Mrudu Koshta (Pittaja Mala — Frequent, soft)';
      recommendations.push('Pitta Shamana: Kutaja preparations and buttermilk infused with cumin.');
    }

    if (val.includes('ama') || val.includes('सफेद मोटी परत') || val.includes('white coating')) {
      jihva = 'Sama Jihva (Ama-coated tongue — metabolic endotoxins present)';
      recommendations.push('Ama Pachana: Fasting/Laghu Ahara, ginger decoction to digest cellular Ama.');
    }
  }

  let dominant = 'Vata-Pitta';
  if (vata > pitta && vata > kapha) dominant = 'Vata';
  else if (pitta > vata && pitta > kapha) dominant = 'Pitta';
  else if (kapha > vata && kapha > pitta) dominant = 'Kapha';
  else if (pitta === kapha) dominant = 'Pitta-Kapha';

  if (recommendations.length === 0) {
    recommendations.push('Balanced diet, Nadi-cleansing Pranayama, and seasonal detoxification.');
  }

  return {
    nadi,
    mutra,
    mala,
    jihva,
    shabda,
    sparsha,
    druk,
    akruti,
    dominant_dosha: dominant,
    recommendations
  };
}

export function computeTrividhaPariksha(history: any[] = []): TrividhaPariksha {
  let vata = 0, pitta = 0, kapha = 0;
  let darshana = 'Normal visible symmetry and complexion';
  let sparshana = 'Samashitoshna (Balanced skin warmth and soft touch)';
  let prashna = 'Routine clinical inquiry without acute aggravation';
  const recommendations: string[] = [];

  for (const item of history) {
    const val = (item.value || '').toLowerCase();
    if (val.includes('वात') || val.includes('dry') || val.includes('cold') || val.includes('vein') || val.includes('stiff')) vata += 2;
    if (val.includes('पित्त') || val.includes('red') || val.includes('burn') || val.includes('rash') || val.includes('hot')) pitta += 2;
    if (val.includes('कफ') || val.includes('swell') || val.includes('puff') || val.includes('moist') || val.includes('letharg')) kapha += 2;

    if (item.field_name?.includes('darshana')) {
      if (val.includes('dry') || val.includes('वात')) darshana = 'Vataja Darshana: Emaciation, dryness, prominent veins';
      else if (val.includes('red') || val.includes('पित्त')) darshana = 'Pittaja Darshana: Erythema, facial flushing, skin irritation';
      else if (val.includes('swell') || val.includes('कफ')) darshana = 'Kaphaja Darshana: Edema, puffiness, sluggish gait';
    }

    if (item.field_name?.includes('sparshana')) {
      if (val.includes('cold') || val.includes('वात')) sparshana = 'Vataja Sparshana: Cold extremities, rough texture, joint crepitus';
      else if (val.includes('burn') || val.includes('hot') || val.includes('पित्त')) sparshana = 'Pittaja Sparshana: Elevated surface warmth, localized burning';
      else if (val.includes('moist') || val.includes('कफ')) sparshana = 'Kaphaja Sparshana: Cool, moist, doughy tissue feel';
    }

    if (item.field_name?.includes('prashna')) {
      if (val.includes('sleep') || val.includes('वात')) prashna = 'Vataja Prashna: Insomnia, shifting pain, fluctuating appetite';
      else if (val.includes('acid') || val.includes('पित्त')) prashna = 'Pittaja Prashna: Intense heartburn, acidic regurgitation, irritability';
      else if (val.includes('letharg') || val.includes('कफ')) prashna = 'Kaphaja Prashna: Somnolence, heaviness, dull digestive fire';
    }
  }

  let dominant = 'Vata-Pitta';
  if (vata > pitta && vata > kapha) dominant = 'Vata';
  else if (pitta > vata && pitta > kapha) dominant = 'Pitta';
  else if (kapha > vata && kapha > pitta) dominant = 'Kapha';

  recommendations.push('Tailored Ayurvedic therapy, Panchakarma evaluation, and Pathya-Apathya regulation.');

  return {
    darshana,
    sparshana,
    prashna,
    dominant_dosha: dominant,
    recommendations
  };
}

export function computeDoshaScore(history: any[]): DoshaAssessment {
  const dashavidha = computeDashavidhaPariksha(history);
  
  let vata = 1;
  let pitta = 1;
  let kapha = 1;

  for (const item of history) {
    const val = (item.value || '').toLowerCase();
    if (val.includes('vata') || val.includes('वात') || val.includes('lean') || val.includes('gas') || val.includes('bloat')) vata += 2;
    if (val.includes('pitta') || val.includes('पित्त') || val.includes('acid') || val.includes('sharp') || val.includes('sweat')) pitta += 2;
    if (val.includes('kapha') || val.includes('कफ') || val.includes('heavy') || val.includes('solid') || val.includes('slow')) kapha += 2;
  }

  let dominant: DoshaAssessment['dominant_prakriti'] = 'Vata-Pitta';
  if (vata > pitta && vata > kapha) dominant = 'Vata';
  else if (pitta > vata && pitta > kapha) dominant = 'Pitta';
  else if (kapha > vata && kapha > pitta) dominant = 'Kapha';
  else if (vata === pitta) dominant = 'Vata-Pitta';
  else if (pitta === kapha) dominant = 'Pitta-Kapha';
  else dominant = 'Tridoshic';

  let agniType: DoshaAssessment['agni_type'] = 'Samagni (Balanced)';
  if (dashavidha.anala_agni.includes('Visham')) agniType = 'Vishamagni (Irregular)';
  else if (dashavidha.anala_agni.includes('Tikshn')) agniType = 'Tikshnagni (Intense/Sharp)';
  else if (dashavidha.anala_agni.includes('Mand')) agniType = 'Mandagni (Low/Slow)';

  return {
    vata_score: vata,
    pitta_score: pitta,
    kapha_score: kapha,
    dominant_prakriti: dominant,
    agni_type: agniType,
    koshta_type: 'Madhyama (Medium)',
    bala: dashavidha.bala.includes('Pravara') ? 'Pravara (High)' : dashavidha.bala.includes('Avara') ? 'Avara (Low)' : 'Madhyama (Medium)',
    recommendations: dashavidha.recommendations
  };
}
