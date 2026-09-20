/**
 * Authentic Multi-Lingual Clinical Question Dictionary across all 10 Primary Indian Languages
 * (Hindi, English, Bengali, Marathi, Telugu, Tamil, Gujarati, Kannada, Malayalam, Punjabi)
 * Provides deterministic 10–12 turn clinical question progression with mandatory
 * past medical history, allergies, and family history screening.
 */

export interface DomainContent {
  section: string;
  field_name: string;
  framework_stage: string;
  questions: Record<string, string>;
  options: Record<string, string[]>;
  summary_note: string;
}

export const CLINICAL_DOMAINS: Record<string, DomainContent> = {
  site_onset: {
    section: 'hpi',
    field_name: 'socrates_site_and_onset',
    framework_stage: 'socrates_site_onset',
    summary_note: 'SOCRATES: Site and onset documented',
    questions: {
      en: "Where is this problem located, and when did it start?",
      hi: "यह तकलीफ शरीर में कहाँ और कब शुरू हुई?",
      bn: "এই সমস্যাটি কোথায় এবং কখন শুরু হয়েছে?",
      mr: "हा त्रास नेमका कुठे आणि कधी सुरू झाला?",
      ta: "இந்த பிரச்சனை எங்கு, எப்போது தொடங்கியது?",
      te: "ఈ సమస్య ఎక్కడ మరియు ఎప్పుడు ప్రారంభమైంది?",
      gu: "આ તકલીફ ક્યાં અને ક્યારથી શરૂ થઈ?",
      kn: "ಈ ಸಮಸ್ಯೆ ಎಲ್ಲಿ ಮತ್ತು ಯಾವಾಗ ಶುರುವಾಯಿತು?",
      ml: "ഈ ബുദ്ധിമുട്ട് എവിടെയാണ്, എപ്പോഴാണ് തുടങ്ങിയത്?",
      pa: "ਇਹ ਤਕਲੀਫ਼ ਕਿੱਥੇ ਅਤੇ ਕਦੋਂ ਸ਼ੁਰੂ ਹੋਈ?"
    },
    options: {
      en: ['Started suddenly today', 'Past 2-3 days', 'More than a week ago', 'Chronic for months'],
      hi: ['आज अचानक शुरू हुआ / Started today', 'पिछले 2-3 दिनों से / Past 2-3 days', 'एक हफ्ते से अधिक समय से / Over a week', 'महीनों पुराना / Chronic'],
      bn: ['আজ হঠাৎ শুরু হয়েছে / Started today', 'গত ২-৩ দিন ধরে / Past 2-3 days', 'এক সপ্তাহের বেশি সময় ধরে / Over a week', 'কয়েক মাস ধরে / Chronic'],
      mr: ['आज अचानक सुरू झाला / Started today', 'गेल्या २-३ दिवसांपासून / Past 2-3 days', 'एका आठवड्यापेक्षा जास्त / Over a week', 'महिन्यांपासून जुना त्रास / Chronic'],
      ta: ['இன்று திடீரென தொடங்கியது / Started today', 'கடந்த 2-3 நாட்களாக / Past 2-3 days', 'ஒரு வாரத்திற்கும் மேலாக / Over a week', 'பல மாதங்களாக உள்ளது / Chronic'],
      te: ['ఈ రోజే అకస్మాత్తుగా ప్రారంభమైంది / Started today', 'గత 2-3 రోజులుగా / Past 2-3 days', 'వారం కంటే ఎక్కువ రోజులుగా / Over a week', 'కొన్ని నెలలుగా ఉంది / Chronic'],
      gu: ['આજે અચાનક શરૂ થયું / Started today', 'છેલ્લા ૨-૩ દિવસથી / Past 2-3 days', 'એક અઠવાડિયાથી વધુ સમયથી / Over a week', 'મહિનાઓ જૂનું દર્દ / Chronic'],
      kn: ['ಇಂದೇ ಹಠಾತ್ತನೆ ಶುರುವಾಯಿತು / Started today', 'ಕಳೆದ ೨-೩ ದಿನಗಳಿಂದ / Past 2-3 days', 'ಒಂದು ವಾರಕ್ಕಿಂತ ಹೆಚ್ಚು ಕಾಲದಿಂದ / Over a week', 'ಹಲವು ತಿಂಗಳುಗಳಿಂದ / Chronic'],
      ml: ['ഇന്ന് പെട്ടെന്ന് തുടങ്ങി / Started today', 'കഴിഞ്ഞ 2-3 ദിവസമായി / Past 2-3 days', 'ഒരു ആഴ്ചയിലധികമായി / Over a week', 'മാസങ്ങളായി തുടരുന്നു / Chronic'],
      pa: ['ਅੱਜ ਅਚਾਨਕ ਸ਼ੁਰੂ ਹੋਇਆ / Started today', 'ਪਿਛਲੇ 2-3 ਦਿਨਾਂ ਤੋਂ / Past 2-3 days', 'ਇੱਕ ਹਫ਼ਤੇ ਤੋਂ ਵੱਧ ਸਮੇਂ ਤੋਂ / Over a week', 'ਕਈ ਮਹੀਨਿਆਂ ਤੋਂ ਪੁਰਾਣਾ / Chronic']
    }
  },
  character_radiation: {
    section: 'hpi',
    field_name: 'socrates_character_and_radiation',
    framework_stage: 'socrates_character_radiation',
    summary_note: 'SOCRATES: Character and radiation documented',
    questions: {
      en: "How does this sensation feel, and does it spread anywhere?",
      hi: "यह दर्द कैसा महसूस होता है, और क्या कहीं फैलता है?",
      bn: "এই ব্যথার অনুভূতি কেমন, এবং এটি কি কোথাও ছড়ায়?",
      mr: "हा त्रास कसा जाणवतो, आणि तो इतरत्र पसरतो का?",
      ta: "இந்த வலி எப்படி உள்ளது, இது வேறு எங்கும் பரவுகிறதா?",
      te: "ఈ నొప్పి ఎలా అనిపిస్తుంది, ఇది మరెక్కడైనా వ్యాపిస్తుందా?",
      gu: "આ દર્દ કેવું લાગે છે, અને તે ક્યાંય ફેલાય છે?",
      kn: "ಈ ನೋವು ಹೇಗನಿಸುತ್ತದೆ, ಮತ್ತು ಬೇರೆಡೆ ಹರಡುತ್ತದೆಯೇ?",
      ml: "ഈ വേദന എങ്ങനെയുള്ളതാണ്, മറ്റെങ്ങോട്ടെങ്കിലും പടരുന്നുണ്ടോ?",
      pa: "ਇਸ ਦਰਦ ਦਾ ਅਹਿਸਾਸ ਕਿਵੇਂ ਹੈ, ਅਤੇ ਕੀ ਇਹ ਕਿਤੇ ਫੈਲਦਾ ਹੈ?"
    },
    options: {
      en: ['Sharp stabbing sensation', 'Heavy dull pressure', 'Burning sensation', 'Radiates to back, neck, or arm', 'Localized in one spot'],
      hi: ['चुभने वाला तीखा दर्द / Sharp', 'भारीपन व दबाव / Heavy pressure', 'जलन का अहसास / Burning', 'पीठ या हाथ में फैलता है / Radiating', 'एक ही जगह रहता है / Localized'],
      bn: ['তীব্র সূঁচ ফোটানোর মতো ব্যথা / Sharp', 'ভারী চাপ বা অস্বস্তি / Heavy pressure', 'জ্বালা ভাব / Burning', 'পিঠ বা হাতে ছড়িয়ে পড়ে / Radiating', 'একই জায়গায় সীমাবদ্ধ / Localized'],
      mr: ['टोचल्यासारखी तीव्र कळ / Sharp', 'छातीत वा पोटात जडपणा / Heavy pressure', 'जळजळ / Burning', 'पाठीत किंवा हातात पसरते / Radiating', 'एकाच जागी दुखते / Localized'],
      ta: ['குத்துவது போன்ற கடுமையான வலி / Sharp', 'அழுத்தமான பாரம் / Heavy pressure', 'எரிச்சல் உணர்வு / Burning', 'முதுகு அல்லது கைகளுக்குப் பரவுகிறது / Radiating', 'ஒரே இடத்தில் உள்ளது / Localized'],
      te: ['సూది గుచ్చినట్లు ఉండే తీవ్ర నొప్పి / Sharp', 'భారమైన ఒత్తిడి / Heavy pressure', 'మంటగా ఉండటం / Burning', 'వీపు లేదా చేతులకు వ్యాపిస్తుంది / Radiating', 'ఒకే చోట పరిమితమై ఉంది / Localized'],
      gu: ['તીક્ષ્ણ ચૂંક આવવી / Sharp', 'ભારે દબાણ / Heavy pressure', 'બળતરા થવી / Burning', 'પીઠ કે હાથમાં ફેલાય છે / Radiating', 'એક જ જગ્યાએ રહે છે / Localized'],
      kn: ['ಚುಚ್ಚುವಂತಹ ತೀವ್ರ ನೋವು / Sharp', 'ಭಾರವಾದ ಒತ್ತಡ / Heavy pressure', 'ಉರಿಯುವ ಅನುಭವ / Burning', 'ಬೆನ್ನು ಅಥವಾ ಕೈಗೆ ಹರಡುತ್ತದೆ / Radiating', 'ಒಂದೇ ಸ್ಥಳದಲ್ಲಿ ಸೀಮಿತವಾಗಿದೆ / Localized'],
      ml: ['കുത്തുന്ന വേദന / Sharp', 'കഠിനമായ ഭാരം / Heavy pressure', 'പുകച്ചിൽ അനുഭവപ്പെടുന്നു / Burning', 'പുറത്തേക്കോ കൈകളിലേക്കോ പടരുന്നു / Radiating', 'ഒരിടത്ത് മാത്രം നിലനിൽക്കുന്നു / Localized'],
      pa: ['ਸੂਈਆਂ ਚੁਭਣ ਵਰਗਾ ਦਰਦ / Sharp', 'ਭਾਰਾਪਣ ਅਤੇ ਦਬਾਅ / Heavy pressure', 'ਜਲਣ ਦਾ ਅਹਿਸਾਸ / Burning', 'ਪਿੱਠ ਜਾਂ ਬਾਹਾਂ ਵਿੱਚ ਫੈਲਦਾ ਹੈ / Radiating', "ਇੱਕੋ ਥਾਂ 'ਤੇ ਰਹਿੰਦਾ ਹੈ / Localized"]
    }
  },
  associations_timing: {
    section: 'hpi',
    field_name: 'socrates_associations_and_timing',
    framework_stage: 'socrates_associations_timing',
    summary_note: 'SOCRATES: Associated systemic symptoms evaluated',
    questions: {
      en: "Are you experiencing any other symptoms along with this?",
      hi: "क्या इसके साथ कोई अन्य तकलीफ भी महसूस हो रही है?",
      bn: "এর সাথে কি অন্য কোনো উপসর্গ অনুভব করছেন?",
      mr: "यासोबत इतर काही त्रास किंवा लक्षणे जाणवत आहेत का?",
      ta: "இதனுடன் வேறு ஏதேனும் அறிகுறிகள் உள்ளதா?",
      te: "దీనితో పాటు ఇతర లక్షణాలు ఏమైనా ఉన్నాయా?",
      gu: "શું આની સાથે અન્ય કોઈ લક્ષણો જણાય છે?",
      kn: "ಇದರೊಂದಿಗೆ ಬೇರೆ ಯಾವುದೇ ಲಕ್ಷಣಗಳು ಕಂಡುಬರುತ್ತಿವೆಯೇ?",
      ml: "ഇതോടൊപ്പം മറ്റ് എന്തെങ്കിലും ലക്ഷണങ്ങൾ ഉണ്ടോ?",
      pa: "ਕੀ ਇਸਦੇ ਨਾਲ ਕੋਈ ਹੋਰ ਤਕਲੀਫ਼ ਵੀ ਹੈ?"
    },
    options: {
      en: ['Nausea or vomiting', 'Dizziness or lightheadedness', 'Excessive sweating and chills', 'Extreme fatigue or weakness', 'None of these'],
      hi: ['जी मिचलाना या उल्टी / Nausea', 'चक्कर आना / Dizziness', 'अत्यधिक पसीना व कंपकंपी / Sweating', 'अत्यधिक कमजोरी व थकान / Fatigue', 'इनमें से कोई नहीं / None'],
      bn: ['বমি ভাব বা বমি / Nausea', 'মাথা ঘোরা / Dizziness', 'অতিরিক্ত ঘাম ও কাঁপুনি / Sweating', 'চরম দুর্বলতা বা ক্লান্তি / Fatigue', 'এদের কোনোটিই নয় / None'],
      mr: ['मळमळ किंवा उलटी / Nausea', 'चक्कर येणे / Dizziness', 'खूप घाम व हुडहुडी / Sweating', 'तीव्र अशक्तपणा व थकवा / Fatigue', 'यापैकी काहीही नाही / None'],
      ta: ['குமட்டல் அல்லது வாந்தி / Nausea', 'தலைச்சுற்றல் / Dizziness', 'அதிக வியர்வை மற்றும் நடுக்கம் / Sweating', 'அதிக சோர்வு அல்லது பலவீனம் / Fatigue', 'இதில் எதுவும் இல்லை / None'],
      te: ['వికారం లేదా వాంతులు / Nausea', 'తలతిరగడం / Dizziness', 'విపరీతమైన చెమట మరియు వణుకు / Sweating', 'తీవ్రమైన అలసట లేదా నీరసం / Fatigue', 'ఇవేవీ లేవు / None'],
      gu: ['ઉબકા કે ઉલટી / Nausea', 'ચક્કર આવવા / Dizziness', 'ખૂબ પરસેવો અને ધ્રુજારી / Sweating', 'અતિશય નબળાઈ કે થાક / Fatigue', 'આમાંથી કંઈ નથી / None'],
      kn: ['ವಾಕರಿಕೆ ಅಥವಾ ವಾಂತಿ / Nausea', 'ತಲೆತಿರುಗುವಿಕೆ / Dizziness', 'ಅತಿಯಾದ ಬೆವರು ಮತ್ತು ನಡುಕ / Sweating', 'ವಿಪರೀತ ಆಯಾಸ ಅಥವಾ ನಿಶ್ಯಕ್ತಿ / Fatigue', 'ಇವುಗಳಲ್ಲಿ ಯಾವುದೂ ಇಲ್ಲ / None'],
      ml: ['ഛർദ്ദി അല്ലെങ്കിൽ ഓക്കാനം / Nausea', 'തലകറക്കം / Dizziness', 'അമിത വിയർപ്പും വിറയലും / Sweating', 'കഠിനമായ ക്ഷീണം / Fatigue', 'ഇതൊന്നുമില്ല / None'],
      pa: ['ਜੀਅ ਕੱਚਾ ਹੋਣਾ ਜਾਂ ਉਲਟੀ / Nausea', 'ਚੱਕਰ ਆਉਣਾ / Dizziness', 'ਬਹੁਤ ਪਸੀਨਾ ਅਤੇ ਕੰਬਣੀ / Sweating', 'ਬਹੁਤ ਜ਼ਿਆਦਾ ਕਮਜ਼ੋਰੀ ਜਾਂ ਥਕਾਵਟ / Fatigue', 'ਇਹਨਾਂ ਵਿੱਚੋਂ ਕੋਈ ਨਹੀਂ / None']
    }
  },
  triggers_relief: {
    section: 'hpi',
    field_name: 'socrates_triggers_and_relief',
    framework_stage: 'socrates_severity_triggers',
    summary_note: 'SOCRATES: Aggravating and relieving factors documented',
    questions: {
      en: "What makes this symptom better or worse?",
      hi: "किस चीज से यह तकलीफ घटती या बढ़ती है?",
      bn: "কিসে এই সমস্যা কমে বা বাড়ে?",
      mr: "कशाने हा त्रास कमी किंवा जास्त होतो?",
      ta: "எதனால் இந்த வலி குறைகிறது அல்லது கூடுகிறது?",
      te: "దేనివల్ల ఈ సమస్య తగ్గుతుంది లేదా పెరుగుతుంది?",
      gu: "શેનાથી આ તકલીફ વધે કે ઘટે છે?",
      kn: "ಯಾವುದರಿಂದ ಈ ಸಮಸ್ಯೆ ಕಡಿಮೆಯಾಗುತ್ತದೆ ಅಥವಾ ಹೆಚ್ಚಾಗುತ್ತದೆ?",
      ml: "എന്ത് ചെയ്യുമ്പോഴാണ് ഇത് കൂടുകയോ കുറയുകയോ ചെയ്യുന്നത്?",
      pa: "ਕਿਸ ਚੀਜ਼ ਨਾਲ ਇਹ ਤਕਲੀਫ਼ ਘੱਟਦੀ ਜਾਂ ਵੱਧਦੀ ਹੈ?"
    },
    options: {
      en: ['Worsens with physical exertion', 'Relieved by rest and lying down', 'Worsens after eating food', 'Constant regardless of rest'],
      hi: ['चलने या मेहनत से बढ़ता है / Worsens with exertion', 'आराम करने से घटता है / Better with rest', 'खाना खाने के बाद बढ़ता है / Post-meal', 'लगातार बना रहता है / Constant'],
      bn: ['শারীরিক পরিশ্রমে বাড়ে / Worsens with exertion', 'বিশ্রাম নিলে কমে / Better with rest', 'খাওয়ার পর বৃদ্ধি পায় / Post-meal', 'সবসময় একই থাকে / Constant'],
      mr: ['शारीरिक श्रमाने वाढतो / Worsens with exertion', 'विश्रांती घेतल्यावर कमी होतो / Better with rest', 'जेवणानंतर वाढतो / Post-meal', 'सतत सारखाच राहतो / Constant'],
      ta: ['உடல் உழைப்பினால் அதிகரிக்கிறது / Worsens with exertion', 'ஓய்வெடுத்தால் குறைகிறது / Better with rest', 'சாப்பிட்ட பிறகு கூடுகிறது / Post-meal', 'எப்போதும் ஒரே மாதிரியாக உள்ளது / Constant'],
      te: ['శారీరక శ్రమతో పెరుగుతుంది / Worsens with exertion', 'విశ్రాంతి తీసుకుంటే తగ్గుతుంది / Better with rest', 'భోజనం తర్వాత పెరుగుతుంది / Post-meal', 'ఎల్లప్పుడూ ఒకేలా ఉంటుంది / Constant'],
      gu: ['શારીરિક મહેનતથી વધે છે / Worsens with exertion', 'આરામ કરવાથી ઘટે છે / Better with rest', 'જમ્યા પછી વધે છે / Post-meal', 'સતત એકસરખું રહે છે / Constant'],
      kn: ['ದೈಹಿಕ ಶ್ರಮದಿಂದ ಹೆಚ್ಚಾಗುತ್ತದೆ / Worsens with exertion', 'ವಿಶ್ರಾಂತಿ ಪಡೆದರೆ ಕಡಿಮೆಯಾಗುತ್ತದೆ / Better with rest', 'ಊಟದ ನಂತರ ಹೆಚ್ಚಾಗುತ್ತದೆ / Post-meal', 'ಯಾವಾಗಲೂ ಒಂದೇ ರೀತಿ ಇರುತ್ತದೆ / Constant'],
      ml: ['അധ്വാനിക്കുമ്പോൾ കൂടുന്നു / Worsens with exertion', 'വിശ്രമിക്കുമ്പോൾ ആശ്വാസം തോന്നുന്നു / Better with rest', 'ഭക്ഷണത്തിന് ശേഷം കൂടുന്നു / Post-meal', 'എപ്പോഴും ഒരേപോലെ തുടരുന്നു / Constant'],
      pa: ['ਮਿਹਨਤ ਜਾਂ ਤੁਰਨ ਨਾਲ ਵੱਧਦਾ ਹੈ / Worsens with exertion', 'ਆਰਾਮ ਕਰਨ ਨਾਲ ਘੱਟਦਾ ਹੈ / Better with rest', 'ਖਾਣਾ ਖਾਣ ਤੋਂ ਬਾਅਦ ਵੱਧਦਾ ਹੈ / Post-meal', 'ਲਗਾਤਾਰ ਇੱਕੋ ਜਿਹਾ ਰਹਿੰਦਾ ਹੈ / Constant']
    }
  },
  severity_functional: {
    section: 'hpi',
    field_name: 'socrates_severity_and_impact',
    framework_stage: 'socrates_severity_triggers',
    summary_note: 'SOCRATES: Severity score and functional impact documented',
    questions: {
      en: "On a scale of 1 to 10, how severe is this discomfort?",
      hi: "1 से 10 के पैमाने पर यह तकलीफ कितनी तेज है?",
      bn: "১ থেকে ১০ এর স্কেলে এই কষ্ট কতটা তীব্র?",
      mr: "१ ते १० च्या प्रमाणात हा त्रास किती तीव्र आहे?",
      ta: "1 முதல் 10 அளவில் இந்த வலி எவ்வளவு தீவிரமானது?",
      te: "1 నుండి 10 స్కేలుపై ఈ బాధ ఎంత తీవ్రంగా ఉంది?",
      gu: "૧ થી ૧૦ ના સ્કેલ પર આ તકલીફ કેટલી તીવ્ર છે?",
      kn: "೧ ರಿಂದ ೧೦ ರ ಅಳತೆಯಲ್ಲಿ ಈ ತೊಂದರೆ ಎಷ್ಟು ತೀವ್ರವಾಗಿದೆ?",
      ml: "1 മുതൽ 10 വരെയുള്ള സ്കെയിലിൽ ഇത് എത്രത്തോളം തീവ്രമാണ്?",
      pa: "1 ਤੋਂ 10 ਦੇ ਪੈਮਾਨੇ 'ਤੇ ਇਹ ਤਕਲੀਫ਼ ਕਿੰਨੀ ਜ਼ਿਆਦਾ ਹੈ?"
    },
    options: {
      en: ['Mild (Score 1-3) - manageable', 'Moderate (Score 4-6) - affects routine', 'Significant (Score 7-8) - disturbs sleep', 'Severe pain (Score 9-10)', 'Able to work normally'],
      hi: ['हल्का (1-3) सहन करने योग्य / Mild', 'मध्यम (4-6) काम में रुकावट / Moderate', 'तेज (7-8) नींद में खलल / Significant', 'अत्यधिक तीव्र (9-10) / Severe', 'सामान्य काम कर पा रहे हैं / Manageable'],
      bn: ['মৃদু (১-৩) সহ্য করার মতো / Mild', 'মাঝারি (৪-৬) কাজে ব্যাঘাত / Moderate', 'তীব্র (৭-৮) ঘুমের সমস্যা / Significant', 'অত্যন্ত তীব্র (৯-১০) / Severe', 'স্বাভাবিক কাজ করতে পারছি / Manageable'],
      mr: ['सौम्य (१-३) सहन होण्यासारखा / Mild', 'मध्यम (४-६) कामात अडथळा / Moderate', 'तीव्र (७-८) झोपमोड करणारा / Significant', 'अतिशय तीव्र (९-१०) / Severe', 'रोजचे काम करता येत आहे / Manageable'],
      ta: ['லேசானது (1-3) / Mild', 'மிதமானது (4-6) வேலைகளில் பாதிப்பு / Moderate', 'கடுமையானது (7-8) தூக்கம் கெடுகிறது / Significant', 'மிகக் கடுமையான வலி (9-10) / Severe', 'வழக்கம்போல் வேலை செய்ய முடிகிறது / Manageable'],
      te: ['తేలికపాటి (1-3) భరించదగినది / Mild', 'మధ్యస్థం (4-6) పనులకు ఆటంకం / Moderate', 'తీవ్రమైనది (7-8) నిద్ర పట్టడం లేదు / Significant', 'విపరీతమైన నొప్పి (9-10) / Severe', 'సాధారణంగా పని చేసుకోగలుగుతున్నాను / Manageable'],
      gu: ['સામાન્ય (૧-૩) સહન કરી શકાય / Mild', 'મધ્યમ (૪-૬) દિનચર્યામાં અડચણ / Moderate', 'તીવ્ર (૭-૮) ઊંઘમાં ખલેલ / Significant', 'અતિશય દર્દ (૯-૧૦) / Severe', 'સામાન્ય રીતે કામ કરી શકું છું / Manageable'],
      kn: ['ಸೌಮ್ಯ (೧-೩) ಸಹಿಸಿಕೊಳ್ಳಬಹುದು / Mild', 'ಮಧ್ಯಮ (೪-೬) ಕೆಲಸಕ್ಕೆ ತೊಂದರೆ / Moderate', 'ತೀವ್ರ (೭-೮) ನಿದ್ರೆಗೆ ಅಡ್ಡಿ / Significant', 'ಅತಿಯಾದ ತೀವ್ರ ನೋವು (೯-೧೦) / Severe', 'ಸಾಮಾನ್ಯ ಕೆಲಸ ಮಾಡಲು ಸಾಧ್ಯ / Manageable'],
      ml: ['നേരിയ തോതിൽ (1-3) / Mild', 'മിതമായത് (4-6) ദിനചര്യകളെ ബാധിക്കുന്നു / Moderate', 'കഠിനമായത് (7-8) ഉറക്കം തടസ്സപ്പെടുന്നു / Significant', 'വളരെ കഠിനമായ വേദന (9-10) / Severe', 'സാധാരണ പോലെ ജോലി ചെയ്യാം / Manageable'],
      pa: ['ਹਲਕਾ (1-3) ਸਹਿਣਯੋਗ / Mild', "ਦਰਮਿਆਨਾ (4-6) ਕੰਮ 'ਚ ਰੁਕਾਵਟ / Moderate", 'ਜ਼ਿਆਦਾ (7-8) ਨੀਂਦ ਖ਼ਰਾਬ / Significant', 'ਬਹੁਤ ਤੇਜ਼ ਦਰਦ (9-10) / Severe', 'ਆਮ ਵਾਂਗ ਕੰਮ ਕਰ ਰਹੇ ਹਾਂ / Manageable']
    }
  },
  past_history: {
    // MANDATORY CLINICAL PILLAR 1: PREVIOUS ILLNESSES / PAST MEDICAL HISTORY
    section: 'past_history',
    field_name: 'chronic_illnesses',
    framework_stage: 'past_medical_history',
    summary_note: 'Past medical history: Chronic illnesses and previous conditions documented',
    questions: {
      en: "Do you have any past medical illnesses or surgeries?",
      hi: "क्या आपको पहले से कोई बीमारी है या कोई ऑपरेशन हुआ है?",
      bn: "আপনার কি আগে থেকে কোনো রোগ আছে বা অপারেশন হয়েছে?",
      mr: "तुम्हाला पूर्वीचा काही आजार आहे का किंवा शस्त्रक्रिया झाली आहे?",
      ta: "உங்களுக்கு முந்தைய நோய் அல்லது அறுவை சிகிச்சை வரலாறு உள்ளதா?",
      te: "మీకు గతంలో ఏవైనా వ్యాధులు లేదా శస్త్రచికిత్సలు జరిగాయా?",
      gu: "શું તમને પહેલાંની કોઈ બીમારી છે કે સર્જરી થઈ છે?",
      kn: "ನಿಮಗೆ ಮೊದಲಿನ ಯಾವುದಾದರೂ ಕಾಯಿಲೆ ಇದೆಯೇ ಅಥವಾ ಶಸ್ತ್ರಚಿಕಿತ್ಸೆ ಆಗಿದೆಯೇ?",
      ml: "മുൻപ് എന്തെങ്കിലും രോഗങ്ങളോ ശസ്ത്രക്രിയയോ ഉണ്ടായിട്ടുണ്ടോ?",
      pa: "ਕੀ ਤੁਹਾਨੂੰ ਪਹਿਲਾਂ ਤੋਂ ਕੋਈ ਬਿਮਾਰੀ ਹੈ ਜਾਂ ਆਪ੍ਰੇਸ਼ਨ ਹੋਇਆ ਹੈ?"
    },
    options: {
      en: ['Diabetes (High Blood Sugar)', 'Hypertension (High BP)', 'Asthma or Respiratory condition', 'Thyroid condition', 'Heart disease or prior surgery', 'No chronic conditions'],
      hi: ['डायबिटीज (शुगर) / Diabetes', 'उच्च रक्तचाप (High BP) / Hypertension', 'दमा या सांस की बीमारी / Asthma', 'थायराइड की समस्या / Thyroid', 'हृदय रोग या पूर्व ऑपरेशन / Heart or surgery', 'कोई पुरानी बीमारी नहीं / No chronic conditions'],
      bn: ['ডায়াবেটিস (সুগার) / Diabetes', 'উচ্চ রক্তচাপ (High BP) / Hypertension', 'হাঁপানি বা শ্বাসকষ্ট / Asthma', 'থাইরয়েড সমস্যা / Thyroid', 'হৃদরোগ বা অস্ত্রোপচার / Heart or surgery', 'কোনো দীর্ঘস্থায়ী রোগ নেই / No chronic conditions'],
      mr: ['मधुमेह (शुगर) / Diabetes', 'उच्च रक्तदाब (High BP) / Hypertension', 'दमा वा श्वसनविकार / Asthma', 'थायरॉईडचा त्रास / Thyroid', 'हृदयविकार किंवा शस्त्रक्रिया / Heart or surgery', 'कोणताही जुना आजार नाही / No chronic conditions'],
      ta: ['சர்க்கரை நோய் / Diabetes', 'உயர் ரத்த அழுத்தம் / High BP', 'ஆஸ்துமா / Asthma', 'தைராய்டு / Thyroid', 'இதய நோய் அல்லது அறுவை சிகிச்சை / Heart or surgery', 'நீண்டகால நோய் எதுவும் இல்லை / No chronic conditions'],
      te: ['మధుమేహం (షుగర్) / Diabetes', 'అధిక రక్తపోటు (High BP) / Hypertension', 'ఆస్తమా / Asthma', 'థైరాయిడ్ సమస్య / Thyroid', 'గుండె జబ్బు లేదా ఆపరేషన్ / Heart or surgery', 'ఎలాంటి దీర్ఘకాలిక వ్యాధులు లేవు / No chronic conditions'],
      gu: ['ડાયાબિટીસ (શુગર) / Diabetes', 'હાઈ બ્લડ પ્રેશર (BP) / Hypertension', 'અસ્થમા કે શ્વાસની તકલીફ / Asthma', 'થાયરોઇડ / Thyroid', 'હૃદયરોગ કે સર્જરી / Heart or surgery', 'કોઈ જૂની બીમારી નથી / No chronic conditions'],
      kn: ['ಮಧುಮೇಹ (ಶುಗರ್) / Diabetes', 'ಅಧಿಕ ರಕ್ತದೊತ್ತಡ (BP) / Hypertension', 'ಉಬ್ಬಸ ಅಥವಾ ದಮ್ಮು / Asthma', 'ಥೈರಾಯ್ಡ್ / Thyroid', 'ಹೃದ್ರೋಗ ಅಥವಾ ಶಸ್ತ್ರಚಿಕಿತ್ಸೆ / Heart or surgery', 'ಯಾವುದೇ ದೀರ್ಘಕಾಲದ ಕಾಯಿಲೆಗಳಿಲ್ಲ / No chronic conditions'],
      ml: ['പ്രമേഹം / Diabetes', 'ഉയർന്ന രക്തസമ്മർദ്ദം / High BP', 'ആസ്ത്മ അല്ലെങ്കിൽ ശ്വാസംമുട്ടൽ / Asthma', 'തൈറോയ്ഡ് / Thyroid', 'ഹൃദ്രോഗം അല്ലെങ്കിൽ ശസ്ത്രക്രിയ / Heart or surgery', 'മറ്റ് രോഗങ്ങളൊന്നുമില്ല / No chronic conditions'],
      pa: ['ਸ਼ੂਗਰ (ਡਾਇਬਟੀਜ਼) / Diabetes', 'ਹਾਈ ਬੀਪੀ / High BP', 'ਦਮਾ ਜਾਂ ਸਾਹ ਦੀ ਤਕਲੀਫ਼ / Asthma', 'ਥਾਇਰਾਇਡ / Thyroid', 'ਦਿਲ ਦਾ ਰੋਗ ਜਾਂ ਆਪ੍ਰੇਸ਼ਨ / Heart or surgery', 'ਕੋਈ ਪੁਰਾਣੀ ਬਿਮਾਰੀ ਨਹੀਂ / No chronic conditions']
    }
  },
  medications: {
    section: 'medications',
    field_name: 'current_medications',
    framework_stage: 'medications',
    summary_note: 'Current active medications and treatments documented',
    questions: {
      en: "Are you currently taking any regular medications?",
      hi: "क्या आप अभी नियमित रूप से कोई दवाई ले रहे हैं?",
      bn: "আপনি কি বর্তমানে নিয়মিত কোনো ওষুধ খাচ্ছেন?",
      mr: "तुम्ही सध्या नियमितपणे कोणती औषधे घेत आहात का?",
      ta: "நீங்கள் தற்போது வழக்கமாக ஏதேனும் மருந்துகள் உட்கொள்கிறீர்களா?",
      te: "మీరు ప్రస్తుతం క్రమం తప్పకుండా మందులు వాడుతున్నారా?",
      gu: "શું તમે હાલમાં કોઈ નિયમિત દવાઓ લઈ રહ્યા છો?",
      kn: "ನೀವು ಪ್ರಸ್ತುತ ನಿಯಮಿತವಾಗಿ ಔಷಧಗಳನ್ನು ತೆಗೆದುಕೊಳ್ಳುತ್ತಿದ್ದೀರಾ?",
      ml: "നിങ്ങൾ ഇപ്പോൾ സ്ഥിരമായി മരുന്നുകൾ കഴിക്കുന്നുണ്ടോ?",
      pa: "ਕੀ ਤੁਸੀਂ ਇਸ ਵੇਲੇ ਨਿਯਮਿਤ ਤੌਰ 'ਤੇ ਕੋਈ ਦਵਾਈ ਲੈ ਰਹੇ ਹੋ?"
    },
    options: {
      en: ['Regular BP or Diabetes pills', 'Pain medication or analgesics', 'Ayurvedic or herbal remedies', 'Antacids or gastric pills', 'No medications currently'],
      hi: ['बीपी या शुगर की दवाएं / Regular BP or Diabetes pills', 'दर्द निवारक दवाएं / Pain medication', 'आयुर्वेदिक काढ़ा या चूर्ण / Ayurvedic remedies', 'गैस व पेट की दवाएं / Antacids', 'वर्तमान में कोई दवा नहीं / No medications currently'],
      bn: ['বিপি বা সুগারের ওষুধ / BP or Diabetes pills', 'ব্যথানাশক ওষুধ / Painkiller', 'আয়ুর্বেদিক বা ভেষজ ওষুধ / Herbal remedies', 'গ্যাসের ওষুধ / Antacids', 'বর্তমানে কোনো ওষুধ খাচ্ছি না / No medications currently'],
      mr: ['रक्तदाब वा मधुमेहाच्या गोळ्या / BP or Diabetes pills', 'पेनकिलर किंवा वेदनाशामक / Pain medication', 'आयुर्वेदिक किंवा घरगुती काढा / Herbal remedies', 'अॅसिडिटी किंवा पोटाच्या गोळ्या / Antacids', 'सध्या कोणतेही औषध नाही / No medications currently'],
      ta: ['ரத்த அழுத்தம் அல்லது சர்க்கரை மாத்திரைகள் / BP or Diabetes pills', 'வலி நிவாரணிகள் / Pain medication', 'ஆயுர்வேத அல்லது மூலிகை மருந்துகள் / Herbal remedies', 'அசிடிட்டி அல்லது வாய்வு மாத்திரைகள் / Antacids', 'தற்போது மருந்துகள் எதுவும் இல்லை / No medications currently'],
      te: ['బీపీ లేదా షుగర్ మందులు / BP or Diabetes pills', 'నొప్పి నివారణ మందులు / Pain medication', 'ఆయుర్వేద లేదా మూలికా మందులు / Herbal remedies', 'ఎసిడిటీ లేదా గ్యాస్ మందులు / Antacids', 'ప్రస్తుతం ఎలాంటి మందులు వాడటం లేదు / No medications currently'],
      gu: ['બીપી કે ડાયાબિટીસની દવાઓ / BP or Diabetes pills', 'પેઇનકિલર દવાઓ / Pain medication', 'આયુર્વેદિક કે દેશી ઉપચાર / Herbal remedies', 'એસિડિટી કે પેટની દવાઓ / Antacids', 'હાલમાં કોઈ દવા નથી લેતા / No medications currently'],
      kn: ['ಬಿಪಿ ಅಥವಾ ಮಧುಮೇಹ ಮಾತ್ರೆಗಳು / BP or Diabetes pills', 'ನೋವು ನಿವಾರಕ ಮಾತ್ರೆಗಳು / Pain medication', 'ಆಯುರ್ವೇದ ಅಥವಾ ಗಿಡಮೂಲಿಕೆ ಚಿಕಿತ್ಸೆ / Herbal remedies', 'ಅಸಿಡಿಟಿ ಅಥವಾ ಗ್ಯಾಸ್ಟ್ರಿಕ್ ಮಾತ್ರೆಗಳು / Antacids', 'ಪ್ರಸ್ತುತ ಯಾವುದೇ ಔಷಧ ತೆಗೆದುಕೊಳ್ಳುತ್ತಿಲ್ಲ / No medications currently'],
      ml: ['പ്രമേഹം അല്ലെങ്കിൽ ബിപി മരുന്നുകൾ / BP or Diabetes pills', 'വേദനാസംഹാരികൾ / Pain medication', 'ആയുർവേദ അല്ലെങ്കിൽ പരമ്പരാഗത ഔഷധങ്ങൾ / Herbal remedies', 'അസിഡിറ്റി മരുന്നുകൾ / Antacids', 'നിലവിൽ മരുന്നുകളൊന്നും കഴിക്കുന്നില്ല / No medications currently'],
      pa: ['ਬੀਪੀ ਜਾਂ ਸ਼ੂਗਰ ਦੀਆਂ ਗੋਲੀਆਂ / BP or Diabetes pills', 'ਦਰਦ ਨਿਵਾਰਕ ਦਵਾਈਆਂ / Pain medication', 'ਆਯੁਰਵੈਦਿਕ ਜਾਂ ਦੇਸੀ ਨੁਸਖ਼ੇ / Herbal remedies', 'ਗੈਸ ਜਾਂ ਤੇਜ਼ਾਬ ਦੀ ਦਵਾਈ / Antacids', 'ਇਸ ਵੇਲੇ ਕੋਈ ਦਵਾਈ ਨਹੀਂ ਲੈ ਰਹੇ / No medications currently']
    }
  },
  allergies: {
    // MANDATORY CLINICAL PILLAR 2: KNOWN ALLERGIES
    section: 'allergies',
    field_name: 'known_allergies',
    framework_stage: 'allergies',
    summary_note: 'Documented patient allergy screening',
    questions: {
      en: "Do you have any allergies to medicines or food?",
      hi: "क्या आपको किसी दवा या खाने की चीज से एलर्जी है?",
      bn: "আপনার কি কোনো ওষুধ বা খাবারে অ্যালার্জি আছে?",
      mr: "तुम्हाला कोणत्याही औषधाची किंवा अन्नाची ऍलर्जी आहे का?",
      ta: "உங்களுக்கு மருந்துகள் அல்லது உணவினால் ஏதேனும் அலர்ஜி உண்டா?",
      te: "మీకు మందులు లేదా ఆహారం వల్ల ఏవైనా అలர்జీలు ఉన్నాయা?",
      gu: "શું તમને કોઈ દવા કે ખોરાકની એલર્જી છે?",
      kn: "ನಿಮಗೆ ಯಾವುದೇ ಔಷಧಿ ಅಥವಾ ಆಹಾರದ ಅಲರ್ಜಿ ಇದೆಯೇ?",
      ml: "നിങ്ങൾക്ക് മരുന്നുകളോടോ ഭക്ഷണത്തോടോ അലർജിയുണ്ടോ?",
      pa: "ਕੀ ਤੁਹਾਨੂੰ ਕਿਸੇ ਦਵਾਈ ਜਾਂ ਭੋਜਨ ਤੋਂ ਐਲਰਜੀ ਹੈ?"
    },
    options: {
      en: ['Drug Allergy (Penicillin or Sulfa)', 'Painkiller Allergy (NSAIDs/Aspirin)', 'Food Allergy (Nuts, Milk, Gluten)', 'Dust, pollen, or seasonal allergy', 'No known allergies'],
      hi: ['दवा से एलर्जी (पेनिसिलिन/सल्फा) / Drug Allergy', 'दर्द की दवा से एलर्जी / Painkiller Allergy', 'खाद्य पदार्थों से एलर्जी / Food Allergy', 'धूल व मौसम से एलर्जी / Dust Allergy', 'कोई एलर्जी नहीं है / No known allergies'],
      bn: ['ওষুধের অ্যালার্জি (পেনিসিলিন) / Drug Allergy', 'ব্যথানাশক ওষুধে অ্যালার্জি / Painkiller Allergy', 'খাবারে অ্যালার্জি / Food Allergy', 'ধুলোবালি বা মৌসুমি অ্যালার্জি / Dust Allergy', 'কোনো অ্যালার্জি নেই / No known allergies'],
      mr: ['औषधांची ऍलर्जी (पेनिसिलिन) / Drug Allergy', 'पेनकिलर गोळ्यांची ऍलर्जी / Painkiller Allergy', 'अन्नाची ऍलर्जी / Food Allergy', 'धुळीची वा हंगामी ऍलर्जी / Dust Allergy', 'कोणतीही ऍलर्जी नाही / No known allergies'],
      ta: ['மருந்து அலர்ஜி (பெனிசிலின்) / Drug Allergy', 'வலி நிவாரணி அலர்ஜி / Painkiller Allergy', 'உணவு அலர்ஜி / Food Allergy', 'தூசி அல்லது பருவகால அலர்ஜி / Dust Allergy', 'எந்த அலர்ஜியும் இல்லை / No known allergies'],
      te: ['మందుల అలర్జీ (పెన్సిలిన్) / Drug Allergy', 'నొప్పి మాత్రల అలర్జీ / Painkiller Allergy', 'ఆహార అలర్జీ / Food Allergy', 'ధూళి లేదా వాతావరణ అలర్జీ / Dust Allergy', 'ఎలాంటి అలర్జీలు లేవు / No known allergies'],
      gu: ['દવાની એલર્જી (પેનિસિલીન) / Drug Allergy', 'પેઇનકિલરની એલર્જી / Painkiller Allergy', 'ખોરાકની એલર્જી / Food Allergy', 'ધૂળ કે મોસમી એલર્જી / Dust Allergy', 'કોઈ એલર્જી નથી / No known allergies'],
      kn: ['ಔಷಧಿ ಅಲರ್ಜಿ (ಪೆನ್ಸಿಲಿನ್) / Drug Allergy', 'ನೋವು ನಿವಾರಕ ಅಲರ್ಜಿ / Painkiller Allergy', 'ಆಹಾರ ಅಲರ್ಜಿ / Food Allergy', 'ಧೂಳು ಅಥವಾ ಕಾಲೋಚಿತ ಅಲರ್ಜಿ / Dust Allergy', 'ಯಾವುದೇ ಅಲರ್ಜಿ ಇಲ್ಲ / No known allergies'],
      ml: ['മരുന്ന് അലർജി (പെൻസിലിൻ) / Drug Allergy', 'വേദനാസംഹാരി അലർജി / Painkiller Allergy', 'ഭക്ഷണ അലർജി / Food Allergy', 'പൊടി അല്ലെങ്കിൽ കാലാനുസൃത അലർജി / Dust Allergy', 'അലർജികൾ ഒന്നുമില്ല / No known allergies'],
      pa: ['ਦਵਾਈ ਤੋਂ ਐਲਰਜੀ (ਪੈਨਸਿਲਿਨ) / Drug Allergy', 'ਦਰਦ ਦੀ ਦਵਾਈ ਤੋਂ ਐਲਰਜੀ / Painkiller Allergy', 'ਭੋਜਨ ਤੋਂ ਐਲਰਜੀ / Food Allergy', 'ਧੂੜ ਜਾਂ ਮੌਸਮੀ ਐਲਰਜੀ / Dust Allergy', 'ਕੋਈ ਐਲਰਜੀ ਨਹੀਂ ਹੈ / No known allergies']
    }
  },
  family_history: {
    // MANDATORY CLINICAL PILLAR 3: FAMILY MEDICAL HISTORY
    section: 'family_history',
    field_name: 'family_medical_history',
    framework_stage: 'family_history',
    summary_note: 'Hereditary family medical history documented',
    questions: {
      en: "Does anyone in your immediate family have chronic health conditions?",
      hi: "क्या आपके परिवार में किसी को कोई पुरानी बीमारी है?",
      bn: "আপনার পরিবারে কি কারও কোনো দীর্ঘস্থায়ী রোগ আছে?",
      mr: "तुमच्या कुटुंबात कोणाला काही जुना आजार आहे का?",
      ta: "உங்கள் குடும்பத்தில் யாருக்கேனும் நீண்டகால நோய் உள்ளதா?",
      te: "మీ కుటుంబంలో ఎవరికైనా దీర్ಘకాలిక వ్యాధులు ఉన్నాయా?",
      gu: "શું તમારા પરિવારમાં કોઈને કોઈ જૂની બીમારી છે?",
      kn: "ನಿಮ್ಮ ಕುಟುಂಬದಲ್ಲಿ ಯಾರಿಗಾದರೂ ದೀರ್ಘಕಾಲದ ಕಾಯಿಲೆಗಳಿವೆಯೇ?",
      ml: "നിങ്ങളുടെ കുടുംബത്തിൽ ആർക്കെങ്കിലും പാരമ്പര്യ രോഗങ്ങളുണ്ടോ?",
      pa: "ਕੀ ਤੁਹਾਡੇ ਪਰਿਵਾਰ ਵਿੱਚ ਕਿਸੇ ਨੂੰ ਕੋਈ ਪੁਰਾਣੀ ਬਿਮਾਰੀ ਹੈ?"
    },
    options: {
      en: ['Diabetes in parents', 'Heart disease in family', 'High BP in family', 'Asthma or respiratory disease in family', 'No hereditary diseases in family'],
      hi: ['माता-पिता में डायबिटीज / Diabetes in parents', 'परिवार में दिल की बीमारी / Heart disease in family', 'परिवार में उच्च रक्तचाप (BP) / High BP in family', 'परिवार में दमा या सांस रोग / Asthma in family', 'परिवार में कोई गंभीर बीमारी नहीं / No hereditary diseases'],
      bn: ['বাবা-মায়ের ডায়াবেটিস / Diabetes in parents', 'পরিবারে হৃদরোগ / Heart disease in family', 'পরিবারে উচ্চ রক্তচাপ / High BP in family', 'পরিবারে হাঁপানি / Asthma in family', 'পরিবারে কোনো বংশগত রোগ নেই / No hereditary diseases'],
      mr: ['पालकांमध्ये मधुमेह / Diabetes in parents', 'कुटुंबात हृदयविकार / Heart disease in family', 'कुटुंबात उच्च रक्तदाब / High BP in family', 'कुटुंबात दमा / Asthma in family', 'कुटुंबात कोणताही आनुवंशिक आजार नाही / No hereditary diseases'],
      ta: ['பெற்றோருக்கு சர்க்கரை நோய் / Diabetes in parents', 'குடும்பத்தில் இதய நோய் / Heart disease in family', 'குடும்பத்தில் உயர் ரத்த அழுத்தம் / High BP in family', 'குடும்பத்தில் ஆஸ்துமா / Asthma in family', 'குடும்பத்தில் பரம்பரை நோய்கள் இல்லை / No hereditary diseases'],
      te: ['తల్లిదండ్రులలో మధుమేహం / Diabetes in parents', 'కుటుంబంలో గుండె జబ్బులు / Heart disease in family', 'కుటుంబంలో అధిక రక్తపోటు / High BP in family', 'కుటుంబంలో ఆస్తమా / Asthma in family', 'కుటుంబంలో వంశపారంపర్య వ్యాధులు లేవు / No hereditary diseases'],
      gu: ['માતા-પિતામાં ડાયાબિટીસ / Diabetes in parents', 'પરિવારમાં હૃદયરોગ / Heart disease in family', 'પરિવારમાં હાઈ બીપી / High BP in family', 'પરિવારમાં અસ્થમા / Asthma in family', 'પરિવારમાં કોઈ વારસાગત રોગ નથી / No hereditary diseases'],
      kn: ['ಪೋಷಕರಲ್ಲಿ ಮಧುಮೇಹ / Diabetes in parents', 'ಕುಟುಂಬದಲ್ಲಿ ಹೃದ್ರೋಗ / Heart disease in family', 'ಕುಟುಂಬದಲ್ಲಿ ಅಧಿಕ ರಕ್ತದೊತ್ತಡ / High BP in family', 'ಕುಟುಂಬದಲ್ಲಿ ಉಬ್ಬಸ / Asthma in family', 'ಕುಟುಂಬದಲ್ಲಿ ಯಾವುದೇ ಅನುವಂಶಿಕ ಕಾಯಿಲೆಗಳಿಲ್ಲ / No hereditary diseases'],
      ml: ['മാതാപിതാക്കളിൽ പ്രമേഹം / Diabetes in parents', 'കുടുംബത്തിൽ ഹൃദ്രോഗം / Heart disease in family', 'കുടുംബത്തിൽ രക്തസമ്മർദ്ദം / High BP in family', 'കുടുംബത്തിൽ ആസ്ത്മ / Asthma in family', 'കുടുംബത്തിൽ പാരമ്പര്യ രോഗങ്ങളൊന്നുമില്ല / No hereditary diseases'],
      pa: ['ਮਾਪਿਆਂ ਵਿੱਚ ਸ਼ੂਗਰ / Diabetes in parents', 'ਪਰਿਵਾਰ ਵਿੱਚ ਦਿਲ ਦੀ ਬਿਮਾਰੀ / Heart disease in family', 'ਪਰਿਵਾਰ ਵਿੱਚ ਹਾਈ ਬੀਪੀ / High BP in family', 'ਪਰਿਵਾਰ ਵਿੱਚ ਦਮਾ / Asthma in family', 'ਪਰਿਵਾਰ ਵਿੱਚ ਕੋਈ ਖ਼ਾਨਦਾਨੀ ਬਿਮਾਰੀ ਨਹੀਂ / No hereditary diseases']
    }
  },
  lifestyle_exposures: {
    section: 'hpi',
    field_name: 'lifestyle_and_exposures',
    framework_stage: 'lifestyle_exposures',
    summary_note: 'Lifestyle and environmental risk factors evaluated',
    questions: {
      en: "Do you have habits like smoking, tobacco, or alcohol?",
      hi: "क्या आपको धूम्रपान, तंबाकू या शराब की कोई आदत है?",
      bn: "আপনার কি ধূমপান, তামাক বা মদ্যপানের কোনো অভ্যাস আছে?",
      mr: "तुम्हाला धूम्रपान, तंबाखू किंवा मद्यपानाची काही सवय आहे का?",
      ta: "உங்களுக்கு புகைபிடித்தல், புகையிலை அல்லது மது பழக்கம் உள்ளதா?",
      te: "మీకు ధూమపానం, పొగాకు లేదా మద్యపానం అలవాట్లు ఉన్నాయా?",
      gu: "શું તમને ધૂમ્રપાન, તમાકુ કે આલ્કોહોલની આદત છે?",
      kn: "ನಿಮಗೆ ಧೂಮಪಾನ, ತಂಬಾಕು ಅಥವಾ ಮದ್ಯಪಾನದ ಅಭ್ಯಾಸವಿದೆಯೇ?",
      ml: "നിങ്ങൾക്ക് പുകവലി, പുകയില, മദ്യം എന്നീ ശീലങ്ങളുണ്ടോ?",
      pa: "ਕੀ ਤੁਹਾਨੂੰ ਸਿਗਰਟ, ਤੰਬਾਕੂ ਜਾਂ ਸ਼ਰਾਬ ਦੀ ਕੋਈ ਆਦਤ ਹੈ?"
    },
    options: {
      en: ['Regular smoking or tobacco use', 'Occasional alcohol consumption', 'Heavy physical work / fatigue', 'Irregular meals or high stress', 'Healthy lifestyle with no habits'],
      hi: ['धूम्रपान या तंबाकू का सेवन / Tobacco or smoking', 'कभी-कभार शराब का सेवन / Alcohol consumption', 'अत्यधिक शारीरिक मेहनत व थकान / Heavy physical work', 'अनियमित भोजन या मानसिक तनाव / Irregular meals or stress', 'स्वस्थ दिनचर्या, कोई नशा नहीं / Healthy lifestyle'],
      bn: ['ধূমপান বা তামাক সেবন / Tobacco or smoking', 'মাঝে মাঝে মদ্যপান / Alcohol consumption', 'অতিরিক্ত কায়িক শ্রম ও ক্লান্তি / Heavy physical work', 'অনিয়মিত খাদ্যাভ্যাস বা মানসিক চাপ / Irregular meals or stress', 'স্বাস্থ্যকর জীবনধারা, কোনো নেশা নেই / Healthy lifestyle'],
      mr: ['धूम्रपान किंवा तंबाखूचे सेवन / Tobacco or smoking', 'कधीतरी मद्यपान / Alcohol consumption', 'अतिशय कष्टाचे काम व थकवा / Heavy physical work', 'अनियमित जेवण किंवा मानसिक ताण / Irregular meals or stress', 'निरोगी जीवनशैली, कोणतेही व्यसन नाही / Healthy lifestyle'],
      ta: ['புகைபிடித்தல் அல்லது புகையிலை பழக்கம் / Tobacco or smoking', 'எப்போதாவது மது அருந்துதல் / Alcohol consumption', 'கடுமையான உடல் உழைப்பு / Heavy physical work', 'முறையற்ற உணவு அல்லது மன அழுத்தம் / Irregular meals or stress', 'ஆரோக்கியமான வாழ்க்கை முறை / Healthy lifestyle'],
      te: ['పొగతాగడం లేదా పొగాకు వాడకం / Tobacco or smoking', 'అప్పుడప్పుడు మద్యం సేవించడం / Alcohol consumption', 'అధిక శారీరక శ్రమ మరియు అలసట / Heavy physical work', 'సమయానికి ఆహారం తీసుకోకపోవడం లేదా ఒత్తిడి / Irregular meals or stress', 'ఆరోగ్యకరమైన జీవనశైలి / Healthy lifestyle'],
      gu: ['ધૂમ્રપાન કે તમાકુનું સેવન / Tobacco or smoking', 'ક્યારેક આલ્કોહોલનું સેવન / Alcohol consumption', 'અતિશય શારીરિક શ્રમ અને થાક / Heavy physical work', 'અનિયમિત ભોજન કે માનસિક તણાવ / Irregular meals or stress', 'સ્વસ્થ જીવનશૈલી, કોઈ વ્યસન નથી / Healthy lifestyle'],
      kn: ['ಧೂಮಪಾನ ಅಥವಾ ತಂಬಾಕು ಸೇವನೆ / Tobacco or smoking', 'ಯಾವಾಗಲಾದರೊಮ್ಮೆ ಮದ್ಯಪಾನ / Alcohol consumption', 'ಕಠಿಣ ದೈಹಿಕ ಶ್ರಮ ಮತ್ತು ಆಯಾಸ / Heavy physical work', 'ಅನಿಯಮಿತ ಆಹಾರ ಅಥವಾ ಮಾನಸಿಕ ಒತ್ತಡ / Irregular meals or stress', 'ಆರೋಗ್ಯಕರ ಜೀವನಶೈಲಿ, ಯಾವುದೇ ದುರಭ್ಯಾಸವಿಲ್ಲ / Healthy lifestyle'],
      ml: ['പുകവലി അല്ലെങ്കിൽ പുകയില ഉപയോഗം / Tobacco or smoking', 'വല്ലപ്പോഴുമുള്ള മദ്യപാനം / Alcohol consumption', 'കഠിനമായ ശാരീരിക അധ്വാനം / Heavy physical work', 'ക്രമരഹിതമായ ഭക്ഷണരീതി അല്ലെങ്കിൽ മാനസിക സമ്മർദ്ദം / Irregular meals or stress', 'ആരോഗ്യകരമായ ജീവിതശൈലി / Healthy lifestyle'],
      pa: ['ਤੰਬਾਕੂ ਜਾਂ ਸਿਗਰਟਨੋਸ਼ੀ / Tobacco or smoking', 'ਕਦੇ-ਕਦਾਈਂ ਸ਼ਰਾਬ ਪੀਣਾ / Alcohol consumption', 'ਬਹੁਤ ਜ਼ਿਆਦਾ ਸਰੀਰਕ ਮਿਹਨਤ / Heavy physical work', 'ਅਨਿਯਮਿਤ ਭੋਜਨ ਜਾਂ ਮਾਨਸਿਕ ਤਣਾਅ / Irregular meals or stress', 'ਸਿਹਤਮੰਦ ਜੀਵਨ ਸ਼ੈਲੀ, ਕੋਈ ਨਸ਼ਾ ਨਹੀਂ / Healthy lifestyle']
    }
  },
  systemic_review: {
    section: 'hpi',
    field_name: 'systemic_review_and_clearance',
    framework_stage: 'systemic_review',
    summary_note: 'Review of systems and final clinical clearance recorded',
    questions: {
      en: "Is there anything else you would like to tell the doctor?",
      hi: "क्या डॉक्टर को बताने के लिए कोई अन्य तकलीफ है?",
      bn: "ডাক্তারবাবুকে জানানোর মতো অন্য কোনো সমস্যা কি রয়েছে?",
      mr: "डॉक्टरांना सांगण्यासारखी इतर काही तक्रार आहे का?",
      ta: "மருத்துவரிடம் தெரிவிக்க வேண்டிய வேறு ஏதேனும் பிரச்சனைகள் உள்ளதா?",
      te: "వైద్యుడికి చెప్పదగిన ఇతర సమస్యలు ఏమైనా ఉన్నాయా?",
      gu: "ડૉક્ટરને જણાવવા જેવી અન્ય કોઈ તકલીફ છે?",
      kn: "ವೈದ್ಯರಿಗೆ ತಿಳಿಸಬೇಕಾದ ಇತರೆ ಲಕ್ಷಣಗಳಿವೆಯೇ?",
      ml: "ഡോക്ടറോട് പറയേണ്ട മറ്റ് ബുദ്ധിമുട്ടുകൾ എന്തെങ്കിലും ഉണ്ടോ?",
      pa: "ਕੀ ਡਾਕਟਰ ਨੂੰ ਦੱਸਣ ਵਾਲੀ ਕੋਈ ਹੋਰ ਤਕਲੀਫ਼ ਹੈ?"
    },
    options: {
      en: ['Unexplained weight loss or appetite drop', 'Night sweats or recurrent chills', 'Extreme tiredness or low energy', 'Sleep difficulties due to symptom', 'No other symptoms to report'],
      hi: ['वजन कम होना या भूख में कमी / Weight or appetite loss', 'रात में पसीना या ठंड लगना / Night sweats or chills', 'अत्यधिक थकान व कमजोरी / Extreme tiredness', 'तकलीफ की वजह से नींद न आना / Sleep difficulties', 'कोई अन्य लक्षण नहीं है / No other symptoms'],
      bn: ['ওজন কমে যাওয়া বা ক্ষুধামন্দা / Weight or appetite loss', 'রাতে ঘাম বা কাঁপুনি / Night sweats or chills', 'চরম ক্লান্তি বা দুর্বলতা / Extreme tiredness', 'কষ্টের কারণে ঘুমের সমস্যা / Sleep difficulties', 'অন্য কোনো উপসর্গ নেই / No other symptoms'],
      mr: ['वजन कमी होणे किंवा भूक मंदावणे / Weight or appetite loss', 'रात्री घाम येणे वा हुडहुडी / Night sweats or chills', 'अतिशय थकवा व अशक्तपणा / Extreme tiredness', 'त्रासामुळे झोप न लागणे / Sleep difficulties', 'इतर कोणतीही तक्रार नाही / No other symptoms'],
      ta: ['எடை குறைவு அல்லது பசியின்மை / Weight or appetite loss', 'இரவு வியர்வை அல்லது நடுக்கம் / Night sweats or chills', 'அதிக சோர்வு / Extreme tiredness', 'வலி காரணமாக தூக்கமின்மை / Sleep difficulties', 'வேறு எந்த அறிகுறிகளும் இல்லை / No other symptoms'],
      te: ['బరువు తగ్గడం లేదా ఆకలి లేకపోవడం / Weight or appetite loss', 'రాత్రి చెమటలు లేదా చలి / Night sweats or chills', 'విపరీతమైన అలసట లేదా నీరసం / Extreme tiredness', 'నొప్పి వల్ల నిద్రలేమి / Sleep difficulties', 'ఇతర లక్షణాలేవీ లేవు / No other symptoms'],
      gu: ['વજન ઘટવું કે ભૂખ ઓછી થવી / Weight or appetite loss', 'રાત્રે પરસેવો કે ધ્રુજારી / Night sweats or chills', 'અતિશય થાક કે નબળાઈ / Extreme tiredness', 'તકલીફને કારણે ઊંઘ ન આવવી / Sleep difficulties', 'અન્ય કોઈ ફરિયાદ નથી / No other symptoms'],
      kn: ['ತೂಕ ಇಳಿಕೆ ಅಥವಾ ಹಸಿವಾಗದಿರುವುದು / Weight or appetite loss', 'ರಾತ್ರಿ ಬೆವರು ಅಥವಾ ನಡುಕ / Night sweats or chills', 'ವಿಪರೀತ ಆಯಾಸ / Extreme tiredness', 'ನೋವಿನಿಂದ ನಿದ್ರಾಹೀನತೆ / Sleep difficulties', 'ಬೇರೆ ಯಾವುದೇ ಲಕ್ಷಣಗಳಿಲ್ಲ / No other symptoms'],
      ml: ['ഭാരക്കുറവ് അല്ലെങ്കിൽ വിശപ്പില്ലായ്മ / Weight or appetite loss', 'രാത്രിയിലെ വിയർപ്പ് / Night sweats or chills', 'കഠിനമായ ക്ഷീണം / Extreme tiredness', 'ഉറക്കക്കുറവ് / Sleep difficulties', 'മറ്റ് ലക്ഷണങ്ങൾ ഒന്നുമില്ല / No other symptoms'],
      pa: ['ਭਾਰ ਘਟਣਾ ਜਾਂ ਭੁੱਖ ਨਾ ਲੱਗਣਾ / Weight or appetite loss', 'ਰਾਤ ਨੂੰ ਪਸੀਨਾ ਜਾਂ ਕੰਬਣੀ / Night sweats or chills', 'ਬਹੁਤ ਜ਼ਿਆਦਾ ਥਕਾਵਟ / Extreme tiredness', 'ਤਕਲੀਫ਼ ਕਰਕੇ ਨੀਂਦ ਨਾ ਆਉਣਾ / Sleep difficulties', 'ਕੋਈ ਹੋਰ ਲੱਛਣ ਨਹੀਂ ਹੈ / No other symptoms']
    }
  },
  completed: {
    section: 'completed',
    field_name: 'intake_completed',
    framework_stage: 'intake_completed',
    summary_note: 'Comprehensive 10-12 question clinical evaluation fully complete',
    questions: {
      en: "Your clinical intake is complete. Thank you.",
      hi: "आपकी स्वास्थ्य जानकारी दर्ज हो गई है। धन्यवाद।",
      bn: "আপনার স্বাস্থ্য তথ্য সম্পূর্ণভাবে সংরক্ষিত হয়েছে। ধন্যবাদ।",
      mr: "तुमची वैद्यकीय माहिती नोंदवली गेली आहे. धन्यवाद.",
      ta: "உங்கள் மருத்துவ விவரங்கள் பதிவு செய்யப்பட்டன. நன்றி.",
      te: "మీ ఆరోగ్య సమాచారం విజయవంతంగా నమోదైంది. ధన్యవాదాలు.",
      gu: "તમારી તબીબી વિગતો નોંધાઈ ગઈ છે. આભાર.",
      kn: "ನಿಮ್ಮ ವೈದ್ಯಕೀಯ ವಿವರಗಳನ್ನು ದಾಖಲಿಸಲಾಗಿದೆ. ಧನ್ಯವಾದಗಳು.",
      ml: "നിങ്ങളുടെ വിവരങ്ങൾ രേഖപ്പെടുത്തി. നന്ദി.",
      pa: "ਤੁਹਾਡੀ ਸਿਹਤ ਜਾਣਕਾਰੀ ਦਰਜ ਕਰ ਲਈ ਗਈ ਹੈ। ਧੰਨਵਾਦ।"
    },
    options: {
      en: ['Proceed to Document Scan', 'Review Medical Summary'],
      hi: ['दस्तावेज़ स्कैन के लिए आगे बढ़ें / Proceed', 'स्वास्थ्य विवरण देखें / Review'],
      bn: ['প্রেসক্রিপশন স্ক্যানের জন্য এগিয়ে যান / Proceed', 'স্বাস্থ্য বিবরণ পর্যালোচনা করুন / Review'],
      mr: ['कागदपत्रे स्कॅन करण्यासाठी पुढे जा / Proceed', 'वैद्यकीय माहिती तपासा / Review'],
      ta: ['ஆவணங்களை ஸ்கேன் செய்ய தொடரவும் / Proceed', 'மருத்துவ விவரங்களை மதிப்பாய்வு செய்யவும் / Review'],
      te: ['పత్రాలను స్కాన్ చేయడానికి కొనసాగించండి / Proceed', 'వైద్య వివరాలను సమీక్షించండి / Review'],
      gu: ['દસ્તાવેજ સ્કેન માટે આગળ વધો / Proceed', 'તબીબી વિગતો તપાસો / Review'],
      kn: ['ದಾಖಲೆಗಳನ್ನು ಸ್ಕ್ಯಾನ್ ಮಾಡಲು ಮುಂದುವರಿಯಿರಿ / Proceed', 'ವೈದ್ಯಕೀಯ ವಿವರಗಳನ್ನು ಪರಿಶೀಲಿಸಿ / Review'],
      ml: ['ഡോക്യുമെന്റുകൾ സ്കാൻ ചെയ്യാൻ തുടരുക / Proceed', 'വിവരങ്ങൾ പരിശോധിക്കുക / Review'],
      pa: ['ਦਸਤਾਵੇਜ਼ ਸਕੈਨ ਕਰਨ ਲਈ ਅੱਗੇ ਵਧੋ / Proceed', 'ਸਿਹਤ ਜਾਣਕਾਰੀ ਦੀ ਸਮੀਖਿਆ ਕਰੋ / Review']
    }
  }
};

export const PATIENT_PREFIX_MAP: Record<string, (name: string) => string> = {
  en: (n) => `Hello ${n}, `,
  hi: (n) => `${n} जी, `,
  mr: (n) => `${n} जी, `,
  bn: (n) => `${n} বাবু, `,
  ta: (n) => `${n} அவர்களே, `,
  te: (n) => `${n} గారు, `,
  gu: (n) => `${n} ભાઈ/બહેન, `,
  kn: (n) => `${n} ಅವರೇ, `,
  ml: (n) => `${n}, `,
  pa: (n) => `${n} ਜੀ, `,
  or: (n) => `${n} ଆଜ୍ଞା, `,
  as: (n) => `${n} ডাঙৰীয়া, `,
  ur: (n) => `${n} صاحب, `,
  sa: (n) => `${n} महोदय, `,
  mai: (n) => `${n} जी, `,
  sat: (n) => `${n} ᱜᱚᱢᱠᱮ, `,
  ks: (n) => `${n} صٲب, `,
  ne: (n) => `${n} ज्यू, `,
  kok: (n) => `${n} बाब/बाय, `,
  sd: (n) => `${n} صاحب, `,
  doi: (n) => `${n} जी, `,
  brx: (n) => `${n} आदा/आबौ, `,
  mni: (n) => `${n} ইবুংগো/ইবেম্মা, `
};

/**
 * Validates whether a text string contains characters matching the expected Indian language script.
 * Supports all 23 official languages and accommodates common medical acronyms (e.g. BP, ECG, Sugar).
 */
export function validateLanguageScript(text: string, langCode: string): boolean {
  if (!text || typeof text !== 'string') return false;
  const lang = (langCode || 'en').toLowerCase().trim();

  // Strip common medical acronyms and numbers to prevent false mismatch detections
  const clean = text.replace(/\b(BP|ECG|Sugar|Diabetes|NSAIDs|Paracetamol|Tablet|Syrup|Injection|IV|Op|ER|ICU)\b/gi, '');

  switch (lang) {
    case 'en':
      // English: should not contain Indic or Perso-Arabic scripts
      return !/[\u0600-\u0D7F]/.test(clean);
    case 'bn':
    case 'as':
      // Bengali & Assamese: (\u0980-\u09FF)
      return /[\u0980-\u09FF]/.test(clean);
    case 'mr':
    case 'hi':
    case 'sa':
    case 'mai':
    case 'ne':
    case 'kok':
    case 'doi':
    case 'brx':
      // Devanagari script (\u0900-\u097F)
      return /[\u0900-\u097F]/.test(clean);
    case 'ta':
      // Tamil: (\u0B80-\u0BFF)
      return /[\u0B80-\u0BFF]/.test(clean);
    case 'te':
      // Telugu: (\u0C00-\u0C7F)
      return /[\u0C00-\u0C7F]/.test(clean);
    case 'gu':
      // Gujarati: (\u0A80-\u0AFF)
      return /[\u0A80-\u0AFF]/.test(clean);
    case 'kn':
      // Kannada: (\u0C80-\u0CFF)
      return /[\u0C80-\u0CFF]/.test(clean);
    case 'ml':
      // Malayalam: (\u0D00-\u0D7F)
      return /[\u0D00-\u0D7F]/.test(clean);
    case 'pa':
      // Gurmukhi / Punjabi: (\u0A00-\u0A7F)
      return /[\u0A00-\u0A7F]/.test(clean);
    case 'or':
      // Odia: (\u0B00-\u0B7F)
      return /[\u0B00-\u0B7F]/.test(clean);
    case 'ur':
    case 'ks':
    case 'sd':
      // Perso-Arabic / Urdu / Kashmiri / Sindhi: (\u0600-\u06FF)
      return /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(clean);
    case 'sat':
      // Santali: Ol Chiki (\u1C50-\u1C7F) or Devanagari/Latin
      return /[\u1C50-\u1C7F\u0900-\u097F\p{L}]/u.test(clean);
    case 'mni':
      // Manipuri: Meetei Mayek (\uABC0-\uABFF) or Bengali script
      return /[\uABC0-\uABFF\uAAE0-\uAAFF\u0980-\u09FF]/.test(clean);
    default:
      return true;
  }
}

/**
 * Deterministic Structured Clinical Questioning Generator covering 12 distinct turns without repetition.
 * Fully localized for all 10 scheduled Indian languages with 100% language fidelity.
 */
export function getStructuredClinicalQuestion(
  turnCount: number,
  patientLangCode: string = 'en',
  patientName?: string,
  chiefComplaintText: string = '',
  domainOverride?: 'past_history' | 'allergies' | 'family_history' | 'medications' | 'lifestyle_exposures' | 'systemic_review'
) {
  const normLang = (patientLangCode || 'en').toLowerCase().trim();
  const langKey = CLINICAL_DOMAINS.site_onset.questions[normLang] ? normLang : 'hi';
  const isEn = normLang === 'en';

  const pName = patientName ? patientName.trim() : '';
  const prefixFn = PATIENT_PREFIX_MAP[normLang] || PATIENT_PREFIX_MAP.en;
  const prefix = pName ? prefixFn(pName) : '';

  // Order of progression guaranteeing 10 to 12 questions with mandatory clinical pillars
  const targetDomain = domainOverride || (
    turnCount <= 1 ? 'site_onset' :
    turnCount === 2 ? 'character_radiation' :
    turnCount === 3 ? 'associations_timing' :
    turnCount === 4 ? 'triggers_relief' :
    turnCount === 5 ? 'severity_functional' :
    turnCount === 6 ? 'past_history' : // Mandatory Clinical Pillar 1: Previous Illnesses
    turnCount === 7 ? 'medications' :
    turnCount === 8 ? 'allergies' : // Mandatory Clinical Pillar 2: Known Allergies
    turnCount === 9 ? 'family_history' : // Mandatory Clinical Pillar 3: Family Medical History
    turnCount === 10 ? 'lifestyle_exposures' :
    turnCount === 11 ? 'systemic_review' : 'completed'
  );

  // Determine localized text and ensure language fidelity for all supported languages
  const domainData = CLINICAL_DOMAINS[targetDomain] || CLINICAL_DOMAINS.site_onset;
  const rawQEn = domainData.questions.en;
  const rawQLoc = isEn ? rawQEn : (domainData.questions[langKey] || domainData.questions.en);

  // Dynamically contextualize English question with complaint if present
  let dynamicQEn = rawQEn;
  if (chiefComplaintText && chiefComplaintText.length > 3 && targetDomain !== 'site_onset' && targetDomain !== 'completed') {
    if (targetDomain === 'past_history') {
      dynamicQEn = `Do you have any previous medical conditions or prior surgeries?`;
    } else if (targetDomain === 'medications') {
      dynamicQEn = `Are you taking any regular medications or daily remedies?`;
    } else if (targetDomain === 'allergies') {
      dynamicQEn = `Do you have any known allergies to medicines or food?`;
    } else if (targetDomain === 'family_history') {
      dynamicQEn = `Does anyone in your immediate family have chronic health conditions?`;
    }
  }

  const qEn = pName ? `Hello ${pName}, ${dynamicQEn.charAt(0).toLowerCase() + dynamicQEn.slice(1)}` : dynamicQEn;
  const qLoc = isEn ? qEn : `${prefix}${rawQLoc}`;

  let options = domainData.options[langKey] || domainData.options.en;
  if (isEn) {
    options = domainData.options.en;
  }

  const isIntakeComplete = targetDomain === 'completed' || turnCount >= 12;

  return {
    is_severe: false,
    severity_level: 'moderate',
    is_intake_complete: isIntakeComplete,
    current_framework_stage: domainData.framework_stage,
    question_localized: qLoc,
    question_en: qEn,
    section: domainData.section,
    field_name: domainData.field_name,
    options,
    clinical_summary_note: domainData.summary_note
  };
}
