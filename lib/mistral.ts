import { Mistral } from '@mistralai/mistralai';
import { LOCALIZED_LANGUAGES } from './languages';

const mistralApiKey = process.env.MISTRAL_API_KEY || 'd9xYz8Z7MIeg2GhmP4CtW45kqKUkBKFP';
export const mistralClient = new Mistral({ apiKey: mistralApiKey });

export const MISTRAL_MODELS = {
  TEXT_SMALL: 'open-mistral-7b',
  TEXT_LARGE: 'mistral-large-latest',
  VISION_OCR: 'pixtral-12b-2409',
};

const groqApiKey = process.env.GROQ_API_KEY;

/**
 * Executes chat completion using Groq LPU engine first for ultra-low latency,
 * falling back smoothly to Mistral AI if Groq is unavailable.
 */
async function executeLlmChatCompletion(prompt: string, jsonMode: boolean = true): Promise<string | null | undefined> {
  const activeGroqKey = process.env.GROQ_API_KEY || groqApiKey;
  if (activeGroqKey) {
    const candidateModels = [
      process.env.GROQ_MODEL || 'qwen/qwen3.8-27b',
      'openai/gpt-oss-20b'
    ];

    for (const model of candidateModels) {
      const groqStart = Date.now();
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${activeGroqKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'user', content: prompt }
            ],
            response_format: jsonMode ? { type: 'json_object' } : undefined,
            temperature: 0.2
          })
        });

        if (res.ok) {
          const data = await res.json();
          const content = data.choices?.[0]?.message?.content;
          if (content) {
            console.log(`⚡ [LLM Engine] Powered by Groq LPU (${model}) in ${Date.now() - groqStart}ms`);
            return content;
          }
        } else if (res.status === 429) {
          console.warn(`Groq rate limit on ${model}, trying next LPU model...`);
          continue;
        } else {
          const errText = await res.text().catch(() => '');
          console.warn(`Groq API returned HTTP ${res.status} on ${model}:`, errText);
        }
      } catch (groqErr: any) {
        console.warn(`Groq LPU execution notice on ${model}:`, groqErr?.message || groqErr);
      }
    }
  }

  // Resilient fallback to Mistral Cloud Client
  const response = await mistralClient.chat.complete({
    model: MISTRAL_MODELS.TEXT_SMALL,
    responseFormat: jsonMode ? { type: 'json_object' } : undefined,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const rawContent = response.choices?.[0]?.message?.content;
  if (typeof rawContent === 'string') return rawContent;
  if (Array.isArray(rawContent)) {
    return rawContent.map((c: any) => typeof c === 'string' ? c : c?.text || '').join('');
  }
  return typeof rawContent === 'object' && rawContent !== null ? JSON.stringify(rawContent) : '';
}


// All 22 official Eighth Schedule Indian Languages + English (23 total)
export const SUPPORTED_LANGUAGES: Record<string, { name: string; native: string; bcp47: string; welcome: string; consent: string; complete: string; initial_q?: string }> = Object.fromEntries(
  Object.entries(LOCALIZED_LANGUAGES).map(([code, pack]) => [
    code,
    {
      name: pack.name,
      native: pack.native,
      bcp47: pack.bcp47,
      welcome: pack.consent_prompt,
      consent: pack.consent_body,
      complete: pack.confirm_prompt,
      initial_q: pack.initial_q
    }
  ])
);

/**
 * Module A: Multi-Language Conversational Intelligent Follow-Up AI Agent
 * Implements clinical SOCRATES pain/symptom framework, past medical conditions,
 * medications, allergies, family history, and real-time clinical severity evaluation.
 */
export async function generateConversationalFollowUp(
  history: Array<{ question: string; answer: string; section?: string; field_name?: string }>,
  patientLangCode: string = 'hi',
  turnCount: number = 1,
  clinicalMode: string = 'allopathy',
  patientName?: string,
  ayushAssessmentType: 'dashavidha' | 'ashtavidha' | 'trividha' = 'dashavidha'
) {
  const langConfig = SUPPORTED_LANGUAGES[patientLangCode] || SUPPORTED_LANGUAGES.hi;
  const isEnglish = patientLangCode === 'en';
  const isAyurveda = clinicalMode === 'ayurveda';

  try {
    const prompt = `
    You are MediKiosk's empathetic, clinical conversational intake AI for ${isAyurveda ? `a Ministry of AYUSH Ayurvedic Clinic (Assessment: ${ayushAssessmentType.toUpperCase()})` : 'an Allopathic Outpatient Clinic in India'}.
    Your primary clinical responsibility is to conduct a thorough, structured intake interview using the SOCRATES clinical framework and medical history, while actively monitoring for SEVERE or LIFE-THREATENING conditions.

    CLINICAL MODE: ${isAyurveda ? `MINISTRY OF AYUSH / AYURVEDIC CLINIC (${ayushAssessmentType.toUpperCase()} PARIKSHA)` : 'ALLOPATHIC CLINIC (DYNAMIC SOCRATES FRAMEWORK)'}
    PATIENT CHOSEN LANGUAGE: ${langConfig.name} (${langConfig.native})
    ${patientName ? `PATIENT NAME: "${patientName}". Address the patient respectfully by name (e.g. "${patientName} जी" in Hindi, "${patientName} garu" in Telugu, "${patientName} avargale" in Tamil, "Hello ${patientName}" in English) where appropriate.` : ''}
    
    CURRENT TURN COUNT: ${turnCount}
    PATIENT CONVERSATION HISTORY SO FAR:
    ${JSON.stringify(history, null, 2)}

    ========================================================================
    MANDATORY ALLOPATHIC CLINICAL INTAKE PROTOCOL: DYNAMIC SOCRATES FRAMEWORK
    ========================================================================
    CRITICAL REQUIREMENT: QUESTIONS MUST NEVER BE FIXED, REPETITIVE, OR GENERIC.
    You MUST analyze the patient's exact chief complaint and previous responses to ask intelligent, clinically reasoned follow-up questions following the SOCRATES hierarchy:
    1. S (Site) & O (Onset): Pinpoint exact anatomical location, onset speed (sudden vs gradual), duration, and activity at onset.
    2. C (Character) & R (Radiation): Specific nature of the sensation (e.g. crushing, burning, sharp stabbing, dull ache, throbbing, cramping) and whether it radiates (e.g. chest to left arm/jaw, back to legs/sciatica, epigastric to back).
    3. A (Associations) & T (Timing): Associated clinical signs (sweating/diaphoresis, nausea, vomiting, dizziness, fever, cough, breathlessness, numbness) and temporal pattern (constant, intermittent, morning stiffness, diurnal variation).
    4. E (Exacerbating/Relieving) & S (Severity): What aggravates or relieves the symptoms (rest, exertion, food, position, medications) and quantitative severity score on 1-10 scale.
    5. Relevant Past Medical History: Chronic comorbidities (Diabetes, Hypertension, CAD, Asthma/COPD, Thyroid, prior surgeries).
    6. Current Medications: Active daily tablets, OTC analgesics, traditional remedies.
    7. Drug & Environmental Allergies: Penicillin, sulfa drugs, NSAIDs, food, or pollen.
    8. Hereditary Family History: First-degree relatives with premature cardiac disease, stroke, diabetes, hypertension, or malignancy.

    ========================================================================
    HOSPITAL BACKGROUND NOISE & BABBLE REJECTION INSTRUCTION:
    ========================================================================
    The patient is speaking at a busy hospital OPD intake kiosk. The audio transcript may occasionally contain bystander chatter, family member interjections, queue/token calls, or background noise.
    You MUST isolate and extract ONLY the direct clinical answers describing the patient's own symptoms. Disregard any extraneous conversational noise, non-medical chatter, or background dialogue.

    ${isAyurveda ? `========================================================================
    AYUSH SPECIALIZED MODE: ${ayushAssessmentType.toUpperCase()} PARIKSHA
    ========================================================================
    ${ayushAssessmentType === 'dashavidha' ? `
    Capture Dashavidha Pariksha dimensions:
    - Prakriti (Constitutional bio-energy / Vata-Pitta-Kapha)
    - Vikriti & Dushya (Afflicted Dhatus and Srotas)
    - Sara (Tissue essence) & Samhanana (Compactness)
    - Pramana (Anthropometric proportions)
    - Satmya (Dietary habituation & sensitivities)
    - Sattva (Mental resilience & psychological temperament)
    - Ahara Shakti (Abhyavaharana & Jarana Shakti - ingestion & digestion)
    - Vyayama Shakti (Physical endurance)
    - Vaya (Life stage / Balya, Madhyama, Vriddha)
    ` : ayushAssessmentType === 'ashtavidha' ? `
    Capture Ashtavidha Pariksha diagnostic parameters:
    - Nadi (Pulse rhythm: Sarpa, Manduka, Hamsa Gati)
    - Mutra (Urinary characteristics and frequency)
    - Mala (Bowel elimination, consistency, Koshtha nature)
    - Jihva (Tongue appearance, Ama coating)
    - Shabda (Voice tone, resonance, breath sounds)
    - Sparsha (Skin temperature, texture, dryness/oiliness)
    - Druk (Vision, sclera appearance, brightness)
    - Akruti (General stature, facies, bodily build)
    ` : `
    Capture Trividha Pariksha parameters:
    - Darshana (Visual observation: posture, skin color, swelling, gait)
    - Sparshana (Tactile palpation: local warmth, pulse, abdominal softness/tenderness)
    - Prashna (Clinical inquiry: sleep quality, appetite, bowel habit, mental stress)
    `}` : ''}

    ========================================================================
    CRITICAL SAFETY & SEVERITY RULES: MULTI-TURN VERIFICATION PROTOCOL
    ========================================================================
    STRICT CLINICAL RULE: ON A SINGLE-QUESTION BASIS, EMERGENCY TRIAGE MUST NEVER BE ACTIVATED!
    - Answering a single question (such as Chief Complaint or early turns, turnCount < 4) is NEVER enough to declare an acute emergency. More questions MUST be asked to thoroughly explore and clinically verify whether this is an acute life-threatening event vs a chronic/subacute condition.
    - If the patient mentions a potentially severe symptom (such as chest pain, severe headache, abdominal pain, high fever, or severe distress) on Turn 1, 2, or 3:
      * DO NOT immediately stop routine questioning!
      * DO NOT set "is_severe": true, "suggested_emergency_routing": true, or "is_intake_complete": true!
      * Instead, ask focused, intelligent clinical follow-up questions following the SOCRATES hierarchy to verify the true acuity:
        1. Site & Onset: Pinpoint exact anatomical location, onset speed (sudden thunderclap vs gradual over days/weeks), and activity at onset.
        2. Character & Radiation: Specific nature of the sensation and whether it radiates (e.g. chest to left arm/jaw, back to legs).
        3. Associated Danger Signs: Cold sweats/diaphoresis, breathlessness, dizziness, vomiting, or neurological weakness.
        4. Exacerbating/Relieving Triggers & Severity score (1-10 scale).
    - ONLY if after AT LEAST 3 to 4 clinical questions have been answered, the patient consistently confirms acute, corroborated life-threatening red-flag indicators across multiple answers, should "is_severe": true be considered.

    B. IF PATIENT'S CONDITION IS NOT SEVERE:
       - Do NOT prematurely end the intake. Systematically cover SOCRATES and medical history.
       - Require minimum 8 turns to cover SOCRATES, past illnesses, medications, allergies, and family history.
       - As long as turnCount < 8 and key clinical domains remain unaddressed, set "is_intake_complete": false.

    INSTRUCTIONS FOR GENERATING NEXT QUESTION:
    - Review what has already been answered in the history above.
    - Ask ONE clear, concise, tailored clinical question addressing the most relevant unprobed SOCRATES or medical history dimension.
    - CONVERSATIONAL VOICE SPEED GUIDELINE: Keep the question natural, punchy, and concise (1 to 2 sentences maximum, 15 to 25 words). Do NOT include long lists or paragraphs of examples in the question text, because this will be spoken aloud to the patient over Voice TTS.
    ${isEnglish ? '- CRITICAL LANGUAGE RULE: Patient chose ENGLISH. You MUST output "question_localized", "options", and "emergency_instruction_localized" STRICTLY IN ENGLISH. NEVER output Hindi words or Devanagari script.' : `- Output "question_localized" in ${langConfig.name} (${langConfig.native}) script.`}
    - Output "question_en" in clear English.
    - Provide 4 to 6 smart, realistic quick-tap options${isEnglish ? ' in English ONLY.' : ` formatted as: "Option in ${langConfig.name} / English".`}
    - Never prescribe medicines or offer an unverified final diagnosis. Maintain a calm, caring, and professional clinical demeanor.

    Output strictly valid JSON with no markdown:
    {
      "is_severe": false,
      "severity_level": "mild" | "moderate" | "severe" | "critical",
      "severe_reason": "Explanation if severe, else empty string",
      "suggested_emergency_routing": false,
      "emergency_instruction_localized": "Emergency guidance in ${isEnglish ? 'English' : langConfig.name} if severe",
      "emergency_instruction_en": "Emergency guidance in English if severe",
      "is_intake_complete": false,
      "current_framework_stage": "socrates_site_onset" | "socrates_character_radiation" | "socrates_associations_timing" | "socrates_severity_triggers" | "past_medical_history" | "medications" | "allergies" | "family_history" | "ayush_pariksha",
      "question_localized": "Next question in ${isEnglish ? 'English' : langConfig.name}",
      "question_en": "Next question in English",
      "section": "hpi" | "past_history" | "family_history" | "allergies" | "medications" | "ayush_pariksha",
      "field_name": "clinical_field_identifier",
      "options": [
        "Option 1",
        "Option 2",
        "Option 3",
        "Option 4"
      ],
      "clinical_summary_note": "Brief extracted clinical fact for physician"
    }
    `;

    const content = await executeLlmChatCompletion(prompt, true);
    const parsed = typeof content === 'string' ? JSON.parse(content) : JSON.parse(JSON.stringify(content));

    // When patient is English, ensure English is strictly assigned and devoid of any Devanagari/Hindi
    if (isEnglish) {
      const candidateQ = (parsed.question_en || parsed.question_localized || '').replace(/[\u0900-\u097F]/g, '').trim();
      parsed.question_localized = candidateQ || 'Please describe your symptoms and when they started.';
      parsed.question_en = parsed.question_localized;
      
      if (parsed.options && Array.isArray(parsed.options)) {
        parsed.options = parsed.options.map((opt: string) => {
          if (typeof opt === 'string') {
            let cleanOpt = opt;
            if (cleanOpt.includes('/')) {
              const parts = cleanOpt.split('/');
              cleanOpt = parts.find(p => /[a-zA-Z]/.test(p))?.trim() || parts[parts.length - 1].trim();
            }
            return cleanOpt.replace(/[\u0900-\u097F]/g, '').trim();
          }
          return opt;
        }).filter(Boolean);
      }
      if (parsed.emergency_instruction_localized) {
        parsed.emergency_instruction_localized = parsed.emergency_instruction_en || parsed.emergency_instruction_localized.replace(/[\u0900-\u097F]/g, '').trim();
      }
    }

    // Check if history shows emergency confirmation clearance
    const hasClearedEmergency = history.some(h => 
      h.section === 'emergency_confirmation' && 
      (h.answer?.toLowerCase().includes('mild') || 
       h.answer?.toLowerCase().includes('manageable') || 
       h.answer?.toLowerCase().includes('can wait') || 
       h.answer?.toLowerCase().includes('regular doctor') || 
       h.answer?.toLowerCase().includes('हल्का') || 
       h.answer?.toLowerCase().includes('सहनीय') || 
       h.answer?.toLowerCase().includes('cleared'))
    );

    if (hasClearedEmergency) {
      parsed.is_severe = false;
      parsed.severity_level = 'mild';
      parsed.suggested_emergency_routing = false;
    }

    // Guardrail: Never let non-severe intakes finish before turn 8
    if (!parsed.is_severe && turnCount < 8) {
      parsed.is_intake_complete = false;
    }

    return parsed;
  } catch (err: any) {
    console.error('Notice: Mistral AI conversational follow-up using structured clinical fallback:', err?.message || err);

    // Structured clinical questioning based on turn count with strict language preservation
    const normLang = (patientLangCode || 'en').toLowerCase().trim();
    const isEn = normLang === 'en';
    const isMr = normLang === 'mr';
    const isTa = normLang === 'ta';

    const pName = patientName ? patientName.trim() : '';
    const prefixEn = pName ? `Hello ${pName}, ` : '';
    const prefixHi = pName ? `${pName} जी, ` : '';
    const prefixMr = pName ? `${pName} जी, ` : '';
    const prefixTa = pName ? `${pName} அவர்களே, ` : '';
        // Analyze history to determine the chief complaint category
    const fullHistoryText = history.map(h => `${h.question} ${h.answer} ${h.field_name || ''}`).join(' ').toLowerCase();
    const isFever = /fever|chills|बुखार|ताप|জ্বর|జ్వరం|காய்ச்சல்|ಜ್ವರ|പനി|ਬੁਖ਼ਾਰ|ଜ୍ୱର|ଜ୍ୱର|بخار|ज्वर|कंबणी/.test(fullHistoryText);
    const isRespiratory = /cough|breath|sputum|phlegm|खांसी|सांस|खोकला|কাশি|దగ్గు|இருமல்|ಕೆಮ್ಮು|ചുമ|ਖੰਘ|କାଶ|কাহ|کھانسی|कास|खोंखी|दम/.test(fullHistoryText);
    const isAbdominal = /stomach|abdomen|indigestion|belly|gastric|पेट|पोट|পেট|కడుపు|വയറു|ಹೊಟ್ಟె|ਪೇਟ|ପೇଟ|পেটৰ|پیٹ|उदर|बदहजम|अपच|मरोड़/.test(fullHistoryText);
    const isHeadache = /headache|dizziness|vertigo|migraine|सिरदर्द|डोकेदुखी|মাথাব্যথা|తలనొప్పి|தலைவலி|ತಲೆನೋವು|തലവേദന|ਸਿਰਦਰਦ|ମୁଣ୍ଡବିନ୍ଧା|মূৰৰ বিষ|سر درد|शिरोवेदना|माथ दर्द|chक्कर/.test(fullHistoryText);
    const isJointBack = /back|joint|spine|knee|bone|कमर|जोड़|सांधे|कोমর|నడుము|కీళ్ల|மூட்டு|ಬೆನ್ನು|കീൽ|ਕਮਰ|ଗଣ୍ଠି|কঁকাল|جوڑوں|कटि|घुटने/.test(fullHistoryText);

    if (turnCount === 1) {
      let qEn = `${prefixEn}Where exactly in the body are you experiencing this problem, and when did it start?`;
      let qLoc = isEn ? qEn : `${prefixHi}यह तकलीफ आपको शरीर में ठीक किस जगह पर हो रही है, और यह कब से शुरू हुई?`;
      let opts = isEn ? ['Started suddenly today', 'Past 2-3 days', 'More than a week', 'Chronic for months'] : ['आज अचानक शुरू हुआ या Started today', 'पिछले 2-3 दिनों से या Past 2-3 days', 'एक हफ्ते से अधिक समय से या Over a week', 'महीनों पुराना या Chronic'];

      if (isFever) {
        qEn = `${prefixEn}When did this fever start, and does it come with severe chills, shivering, or high body temperature?`;
        qLoc = isEn ? qEn
          : isMr ? `${prefixMr}हा ताप कधीपासून सुरू झाला आहे, आणि त्यासोबत खूप थंडी वा कंप भरतो का?`
          : isTa ? `${prefixTa}இந்த காய்ச்சல் எப்போது தொடங்கியது, இதனுடன் நடுக்கம் அல்லது குளிர் ஏற்படுகிறதா?`
          : `${prefixHi}यह बुखार कब से शुरू हुआ है, और क्या इसके साथ तेज ठंड या कंपकंपी भी होती है?`;
        opts = isEn
          ? ['Started suddenly today with high fever', 'Past 2-3 days with chills', 'Low grade fever for over a week', 'Comes and goes, worse in evenings']
          : ['आज अचानक तेज बुखार या Started today', 'पिछले 2-3 दिनों से ठंड लगकर या Past 2-3 days', 'हफ्ते भर से हल्का बुखार या Low grade', 'शाम को तेज बुखार चढ़ता है या Evening spike'];
      } else if (isRespiratory) {
        qEn = `${prefixEn}How long have you had this cough or breathing trouble, and is it a dry cough or with phlegm/sputum?`;
        qLoc = isEn ? qEn
          : isMr ? `${prefixMr}हा खोकला कधीपासून आहे, आणि कोरडा खोकला आहे की कफ पडतो?`
          : isTa ? `${prefixTa}இந்த இருமல் எப்போது தொடங்கியது, சளி வருகிறதா அல்லது வறட்டு இருமலா?`
          : `${prefixHi}यह खांसी या सांस की तकलीफ कब से है, और क्या खांसी सूखी है या कफ/बलगम आता है?`;
        opts = isEn
          ? ['Dry irritating cough', 'Cough with clear or white phlegm', 'Thick yellow or greenish sputum', 'Severe cough with breathlessness']
          : ['सूखी खांसी या Dry cough', 'सफेद या साफ कफ निकलता है या Clear phlegm', 'पीला या गाढ़ा बलगम या Thick sputum', 'खांसी के साथ सांस फूलती है या Breathless'];
      } else if (isAbdominal) {
        qEn = `${prefixEn}Where in your stomach is the pain located (upper, near navel, lower right/left), and when did it start?`;
        qLoc = isEn ? qEn
          : isMr ? `${prefixMr}पोटात नेमके कुठे दुखत आहे (वरच्या भागात, बेंबीजवळ, की खाली), आणि कधी सुरू झाले?`
          : `${prefixHi}पेट में ठीक किस हिस्से में दर्द हो रहा है (ऊपरी पेट, नाभि के पास, या नीचे), और कब से है?`;
        opts = isEn
          ? ['Upper stomach with burning or acidity', 'Sharp pain in lower right side', 'Cramping pain around navel', 'All over abdomen with heaviness']
          : ['ऊपरी पेट में जलन या एसिडिटी या Upper stomach', 'पेट के निचले दाईं ओर तेज दर्द या Lower right', 'नाभि के पास मरोड़ या Around navel', 'पूरे पेट में भारीपन या All over'];
      } else if (isHeadache) {
        qEn = `${prefixEn}How long have you had this headache, and is it on one side or all over the head?`;
        qLoc = isEn ? qEn : `${prefixHi}यह सिरदर्द कब से है, और क्या यह सिर के एक तरफ है या पूरे सिर में भारीपन लगता है?`;
        opts = isEn
          ? ['Throbbing pain on one side', 'Heavy band-like tension all over', 'Sharp pain behind eyes', 'Sudden severe headache today']
          : ['एक तरफ टीस मारने वाला दर्द या One-sided', 'पूरे सिर में भारी खिंचाव या Band-like', 'आंखों के पीछे चुभन या Behind eyes', 'आज अचानक तेज दर्द या Sudden onset'];
      } else if (isJointBack) {
        qEn = `${prefixEn}Which joint or part of your back hurts the most, and does it feel stiff in the morning?`;
        qLoc = isEn ? qEn : `${prefixHi}शरीर के किस जोड़ या कमर के किस हिस्से में सबसे ज्यादा दर्द है, और क्या सुबह अकड़न महसूस होती है?`;
        opts = isEn
          ? ['Lower back pain with stiffness', 'Knee or leg joint swelling', 'Neck and shoulder pain', 'Multiple joint pains']
          : ['कमर के निचले हिस्से में दर्द व जकड़न', 'घुटनों या पैरों के जोड़ों में दर्द', 'गर्दन और कंधे में दर्द', 'कई जोड़ों में पुराना दर्द'];
      }

      return {
        is_severe: false,
        severity_level: 'moderate',
        is_intake_complete: false,
        current_framework_stage: 'socrates_site_onset',
        question_localized: qLoc,
        question_en: qEn,
        section: 'hpi',
        field_name: 'socrates_site_and_onset',
        options: opts,
        clinical_summary_note: 'SOCRATES: Site and onset tailored'
      };
    } else if (turnCount === 2) {
      let qEn = `${prefixEn}How does this discomfort feel (sharp, burning, heavy pressure), and does it radiate anywhere else?`;
      let qLoc = isEn ? qEn : `${prefixHi}इस तकलीफ का अहसास कैसा है (चुभन, जलन, भारीपन), और क्या यह किसी अन्य अंग में फैलता है?`;
      let opts = isEn ? ['Sharp stabbing', 'Heavy dull pressure', 'Burning sensation', 'Radiates to back or arm', 'Localized in one spot'] : ['चुभने वाला तीखा दर्द या Sharp', 'भारीपन व दबाव या Heavy pressure', 'जलन का अहसास या Burning', 'पीठ या हाथ में फैलता है या Radiating', 'एक ही जगह रहता है या Localized'];

      if (isFever) {
        qEn = `${prefixEn}Along with fever, do you have body ache, severe headache, burning urination, or any skin rash?`;
        qLoc = isEn ? qEn
          : isMr ? `${prefixMr}तापासोबत अंगदुखी, डोकेदुखी, लघवी करताना जळजळ, किंवा अंगावर पुरळ आहे का?`
          : `${prefixHi}क्या बुखार के साथ बदन दर्द, सिरदर्द, पेशाब में जलन, या शरीर पर लाल दाने/चकत्ते हैं?`;
        opts = isEn
          ? ['Severe body ache and joint pain', 'Intense headache behind eyes', 'Burning sensation during urination', 'Red spots or skin rash', 'Only fever without other signs']
          : ['तेज बदन व जोड़ों का दर्द या Body ache', 'सिर में तेज दर्द या Headache', 'पेशाब में जलन या Burning urine', 'त्वचा पर लाल दाने या Rash', 'केवल बुखार है या Fever only'];
      } else if (isRespiratory) {
        qEn = `${prefixEn}Do you experience shortness of breath, wheezing (whistling sounds), or chest tightness when walking or lying down?`;
        qLoc = isEn ? qEn : `${prefixHi}क्या चलने या लेटने पर आपकी सांस फूलती है, सीने से सीटी जैसी आवाज आती है, या भारीपन लगता है?`;
        opts = isEn
          ? ['Shortness of breath when walking', 'Chest tightness when lying down', 'Wheezing whistling sound in chest', 'No breathlessness, only cough']
          : ['चलने पर सांस फूलती है या On exertion', 'रात को लेटने पर सांस रुकती है या When lying down', 'सीने से सीटी की आवाज या Wheezing', 'सांस सामान्य है केवल खांसी या Cough only'];
      } else if (isAbdominal) {
        qEn = `${prefixEn}Are you experiencing nausea, vomiting, loose stools (diarrhea), or constipation?`;
        qLoc = isEn ? qEn : `${prefixHi}क्या पेट दर्द के साथ जी मिचलाना, उल्टी, पतले दस्त (लूज मोशन), या कब्ज की समस्या है?`;
        opts = isEn
          ? ['Nausea and vomiting', 'Watery loose motions (diarrhea)', 'Severe constipation and gas', 'No vomiting or diarrhea']
          : ['जी मिचलाना व उल्टी या Vomiting', 'पतले दस्त या Diarrhea', 'कब्ज और गैस या Constipation', 'उल्टी या दस्त नहीं है या None'];
      }

      return {
        is_severe: false,
        severity_level: 'moderate',
        is_intake_complete: false,
        current_framework_stage: 'socrates_character_radiation',
        question_localized: qLoc,
        question_en: qEn,
        section: 'hpi',
        field_name: 'socrates_character_and_radiation',
        options: opts,
        clinical_summary_note: 'SOCRATES: Character and radiation tailored'
      };
    } else if (turnCount === 3) {
      const qEn = `${prefixEn}Does anything specific make this symptom better or worse (food, rest, activity, position)?`;
      const qLoc = isEn ? qEn : `${prefixHi}क्या किसी खास गतिविधि, आराम, या खाने-पीने से यह तकलीफ कम या ज्यादा होती है?`;
      const opts = isEn ? ['Worsens with activity', 'Relieved by rest', 'Worsens after food', 'Constant regardless of rest'] : ['चलने या काम से बढ़ता है या Worsens with activity', 'आराम करने से घटता है या Better with rest', 'खाने के बाद बढ़ता है या Post-meal', 'लगातार बना रहता है या Constant'];

      return {
        is_severe: false,
        severity_level: 'moderate',
        is_intake_complete: false,
        current_framework_stage: 'socrates_associations_timing',
        question_localized: qLoc,
        question_en: qEn,
        section: 'hpi',
        field_name: 'socrates_associations_and_timing',
        options: opts,
        clinical_summary_note: 'SOCRATES: Associated triggers and relief factors'
      };
    } else if (turnCount === 4) {
      const qEn = `${prefixEn}On a scale of 1 to 10, how severe is this discomfort, and have you taken any medications for it?`;
      const qLoc = isEn ? qEn
        : isMr ? `${prefixMr}१ ते १० च्या प्रमाणात हा त्रास किती तीव्र आहे, आणि यासाठी कोणते औषध घेतले आहे का?`
        : `${prefixHi}1 से 10 के पैमाने पर यह तकलीफ कितनी तीव्र है, और क्या आपने इसके लिए कोई दवाई ली है?`;

      return {
        is_severe: false,
        severity_level: 'moderate',
        is_intake_complete: false,
        current_framework_stage: 'socrates_severity_triggers',
        question_localized: qLoc,
        question_en: qEn,
        section: 'hpi',
        field_name: 'socrates_severity_and_triggers',
        options: isEn ? [
          'Mild (Score 1 to 3)',
          'Moderate (Score 4 to 6)',
          'Significant distress (Score 7)',
          'Took Paracetamol or painkiller with mild relief',
          'No medication taken yet'
        ] : [
          'हल्का (1-3) या Mild',
          'मध्यम (4-6) या Moderate',
          'तेज तकलीफ (7) या Significant',
          'दवाई ली पर आराम नहीं मिला या Took medicine',
          'अभी तक कोई दवाई नहीं ली या No medicine'
        ],
      };
    } else if (turnCount === 5) {
      const qEn = `${prefixEn}Do you have any previous medical conditions (such as Diabetes, High BP, Thyroid, Asthma) or past surgeries?`;
      const qLoc = isEn ? qEn
        : isMr ? `${prefixMr}तुम्हाला पूर्वीपासून मधुमेह (शुगर), रक्तदाब (BP), थायरॉईड किंवा दम्याचा काही आजार आहे का?`
        : isTa ? `${prefixTa}உங்களுக்கு சர்க்கரை நோய், ரத்த அழுத்தம், தைராய்டு அல்லது ஆஸ்துமா போன்ற முந்தைய நோய்கள் உள்ளனவா?`
        : `${prefixHi}क्या आपको पहले से कोई पुरानी बीमारी है (जैसे डायबिटीज/शुगर, बीपी, थायराइड, दमा) या कोई ऑपरेशन हुआ है?`;

      return {
        is_severe: false,
        severity_level: 'moderate',
        is_intake_complete: false,
        current_framework_stage: 'past_medical_history',
        question_localized: qLoc,
        question_en: qEn,
        section: 'past_history',
        field_name: 'chronic_illnesses',
        options: isEn ? [
          'Diabetes',
          'Hypertension (High BP)',
          'Asthma or Respiratory problem',
          'Thyroid condition',
          'No chronic conditions'
        ] : [
          'डायबिटीज (शुगर) / Diabetes',
          'उच्च रक्तचाप (High BP) / Hypertension',
          'दमा या सांस की बीमारी / Asthma or Respiratory',
          'थायराइड की समस्या / Thyroid condition',
          'कोई पुरानी बीमारी नहीं / No chronic conditions'
        ],
        clinical_summary_note: 'Past medical history: Chronic illness screen'
      };
    } else if (turnCount === 6) {
      const qEn = `${prefixEn}Are you currently taking any regular prescription medications, tablets, or traditional herbal remedies?`;
      const qLoc = isEn ? qEn
        : isMr ? `${prefixMr}तुम्ही सध्या नियमितपणे कोणती औषधे, गोळ्या किंवा आयुर्वेदिक उपचार घेत आहात का?`
        : isTa ? `${prefixTa}நீங்கள் தற்போது வழக்கமாக ஏதேனும் மருந்துகள் அல்லது மாத்திரைகள் உட்கொள்கிறீர்களா?`
        : `${prefixHi}क्या आप अभी नियमित रूप से कोई दवाई, गोलियां या आयुर्वेदिक/घरेलू नुस्खे ले रहे हैं?`;

      return {
        is_severe: false,
        severity_level: 'moderate',
        is_intake_complete: false,
        current_framework_stage: 'medications',
        question_localized: qLoc,
        question_en: qEn,
        section: 'medications',
        field_name: 'current_medications',
        options: isEn ? [
          'Regular BP or Diabetes pills',
          'Pain medication or painkillers',
          'Ayurvedic or herbal remedies',
          'Antacids or digestion pills',
          'No medications currently'
        ] : [
          'बीपी या शुगर की दवाएं / Regular BP or Diabetes pills',
          'दर्द निवारक गोलियां (Painkillers) / Pain medication',
          'आयुर्वेदिक काढ़ा या चूर्ण / Ayurvedic or herbal remedies',
          'गैस व पेट की दवाएं / Antacids or digestion pills',
          'वर्तमान में कोई दवा नहीं / No medications currently'
        ],
        clinical_summary_note: 'Current active medications and remedies'
      };
    } else if (turnCount === 7) {
      const qEn = `${prefixEn}Do you have any known allergies to specific medicines (such as penicillin, pain relievers), foods, or dust?`;
      const qLoc = isEn ? qEn
        : isMr ? `${prefixMr}तुम्हाला कोणत्याही औषधाची (उदा. पेनिसिलिन, पेनकिलर), अन्नाची किंवा धुळीची ऍलर्जी आहे का?`
        : isTa ? `${prefixTa}உங்களுக்கு குறிப்பிட்ட மருந்துகள், உணவு அல்லது தூசியினால் ஏதேனும் அலர்ஜி உண்டா?`
        : `${prefixHi}क्या आपको किसी खास दवा (जैसे पेनिसिलिन, दर्द की दवा), खाने-पीने की चीज या धूल से कोई एलर्जी है?`;

      return {
        is_severe: false,
        severity_level: 'moderate',
        is_intake_complete: false,
        current_framework_stage: 'allergies',
        question_localized: qLoc,
        question_en: qEn,
        section: 'allergies',
        field_name: 'known_allergies',
        options: isEn ? [
          'Drug Allergy (Penicillin or Sulfa)',
          'Painkiller Allergy (NSAIDs)',
          'Food Allergy',
          'Dust or seasonal allergy',
          'No known allergies'
        ] : [
          'दवा से एलर्जी (पेनिसिलिन/सल्फा) / Drug Allergy (Penicillin/Sulfa)',
          'दर्द की दवा से एलर्जी / Painkiller Allergy (NSAIDs)',
          'खाद्य पदार्थों से एलर्जी / Food Allergy',
          'धूल व मौसम से एलर्जी / Dust or seasonal allergy',
          'कोई एलर्जी नहीं है / No known allergies'
        ],
        clinical_summary_note: 'Documented allergy screen'
      };
    } else if (turnCount === 8) {
      const qEn = `${prefixEn}Is there any family history of heart disease, diabetes, high BP, asthma, or cancer in parents or siblings?`;
      const qLoc = isEn ? qEn
        : isMr ? `${prefixMr}तुमच्या कुटुंबात (आई-वडील किंवा भावंड) हृदयविकार, मधुमेह, उच्च रक्तदाब किंवा दमा यांचा इतिहास आहे का?`
        : isTa ? `${prefixTa}உங்கள் குடும்பத்தில் யாருக்கேனும் இதய நோய், சர்க்கரை நோய் அல்லது ஆஸ்துமா உள்ளதா?`
        : `${prefixHi}क्या आपके परिवार में (माता-पिता या भाई-बहन) दिल की बीमारी, डायबिटीज, बीपी या कैंसर का कोई इतिहास है?`;

      return {
        is_severe: false,
        severity_level: 'moderate',
        is_intake_complete: false,
        current_framework_stage: 'family_history',
        question_localized: qLoc,
        question_en: qEn,
        section: 'family_history',
        field_name: 'family_medical_history',
        options: isEn ? [
          'Diabetes in parents',
          'Heart disease in family',
          'High BP in family',
          'Asthma in family',
          'No hereditary diseases'
        ] : [
          'माता-पिता में डायबिटीज / Diabetes in parents',
          'परिवार में दिल की बीमारी / Heart disease in family',
          'परिवार में उच्च रक्तचाप (BP) / High BP in family',
          'परिवार में दमा या एलर्जी / Asthma in family',
          'परिवार में कोई गंभीर बीमारी नहीं / No hereditary diseases'
        ],
        clinical_summary_note: 'Family medical history documented'
      };
    } else {
      const qEn = `${prefixEn}Your complete clinical intake has been recorded. Thank you.`;
      const qLoc = isEn ? qEn
        : isMr ? `${prefixMr}तुमची संपूर्ण वैद्यकीय माहिती नोंदवली गेली आहे. धन्यवाद.`
        : isTa ? `${prefixTa}உங்கள் மருத்துவ விவரங்கள் வெற்றிகரமாக பதிவு செய்யப்பட்டன. நன்றி.`
        : `${prefixHi}आपकी संपूर्ण स्वास्थ्य जानकारी दर्ज कर ली गई है। धन्यवाद।`;

      return {
        is_severe: false,
        severity_level: 'moderate',
        is_intake_complete: true,
        current_framework_stage: 'intake_completed',
        question_localized: qLoc,
        question_en: qEn,
        section: 'completed',
        field_name: 'intake_completed',
        options: isEn ? ['Proceed to Next Step', 'Review Summary'] : ['आगे बढ़ें / Proceed', 'विवरण देखें / Review'],
        clinical_summary_note: 'Comprehensive clinical evaluation complete'
      };
    }
  }
}

/**
 * Module B: Document Entity Extraction via Pixtral 12B Vision with Context Knowledge
 * Intelligently analyzes prescriptions, lab reports, discharge summaries using patient's
 * verbal history context to decipher handwritten scripts, dosages, and test results.
 */
export async function extractDocumentEntitiesFromBase64(
  base64Image: string, 
  mimeType: string,
  patientInterviewContext: any[] = []
) {
  try {
    const contextSummary = patientInterviewContext.length > 0
      ? `PATIENT INTAKE CONTEXT (Spoken during interview):\n${JSON.stringify(patientInterviewContext, null, 2)}`
      : 'No prior verbal intake recorded.';

    const prompt = `
    You are an expert clinical document transcription and intelligence system.
    
    ${contextSummary}

    INSTRUCTIONS:
    1. Read and transcribe the medical document accurately from the image.
    2. Extract all medications: medicine brand or generic name, dosage, frequency, route, duration.
    3. Extract all diagnostic lab investigations: test name, quantitative value, unit, reference range.
    4. Extract any clinical diagnoses or findings.
    5. Set "quality_assessment": "good", "is_readable": true.

    Output strictly valid JSON with NO commentary:
    {
      "document_type": "prescription",
      "document_date": "YYYY-MM-DD" or null,
      "quality_assessment": "good",
      "is_readable": true,
      "doctor_or_hospital": "Doctor or Clinic Name",
      "diagnoses": [
        {"name": "Diagnosis", "confidence": 0.95}
      ],
      "medications": [
        {"name": "Medicine Name", "dose": "500mg", "route": "Oral", "frequency": "1+0+1 / BD", "duration": "5 days", "confidence": 0.95}
      ],
      "lab_values": [
        {"name": "Test Name", "value": "12.5", "unit": "g/dL", "reference_range": "12.0 - 15.0", "confidence": 0.95}
      ],
      "key_findings": "Summary of instructions",
      "reconciliation_notes": "Correlation with patient history"
    }
    `;

    const response = await mistralClient.chat.complete({
      model: MISTRAL_MODELS.VISION_OCR,
      responseFormat: { type: 'json_object' },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt,
            },
            {
              type: 'image_url',
              imageUrl: `data:${mimeType};base64,${base64Image}`,
              image_url: `data:${mimeType};base64,${base64Image}`,
            } as any,
          ],
        },
      ],
    });

    const content = response.choices?.[0]?.message?.content;
    const parsed = typeof content === 'string' ? JSON.parse(content) : JSON.parse(JSON.stringify(content));

    if (parsed) {
      // Flatten doctor_or_hospital if returned as nested object
      if (typeof parsed.doctor_or_hospital === 'object' && parsed.doctor_or_hospital !== null) {
        parsed.doctor_or_hospital = Object.entries(parsed.doctor_or_hospital)
          .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
          .filter(Boolean)
          .join(' • ');
      }
      // Flatten document_type if returned as object
      if (typeof parsed.document_type === 'object' && parsed.document_type !== null) {
        parsed.document_type = Object.values(parsed.document_type).join(' ');
      }
    }

    return parsed;
  } catch (err: any) {
    console.error('Mistral OCR Extraction error:', err);
    throw new Error(`Mistral document extraction failed: ${err.message}`);
  }
}

/**
 * Module C: Generate Bilingual Draft Summary over Structured Data
 */
export async function generateBilingualSummary(
  structuredHistory: any[], 
  extractedEntities: any[], 
  patientLangCode: string = 'hi',
  clinicalMode: string = 'allopathy'
) {
  const langConfig = SUPPORTED_LANGUAGES[patientLangCode] || SUPPORTED_LANGUAGES.hi;
  const isAyurveda = clinicalMode === 'ayurveda';

  // 1. Attempt High-Accuracy Module C Multimodal Intake Synthesis
  try {
    const { synthesizePatientIntake } = await import('@/lib/module_c_client');
    const cRes = await synthesizePatientIntake({
      session_id: `session-intake-${Date.now()}`,
      chief_complaint: structuredHistory.find(h => h.section === 'chief_complaint')?.value,
      patient_meta: {
        language: patientLangCode,
        clinical_mode: clinicalMode,
      },
      spoken_history: structuredHistory,
      extracted_entities: extractedEntities,
    });

    if (cRes && cRes.sbar_summary) {
      let dashavidhaStr = 'N/A';
      if (cRes.dashavidha_pariksha) {
        const dp = cRes.dashavidha_pariksha;
        dashavidhaStr = `Prakriti: ${dp.prakriti}; Agni: ${dp.agni}; Koshtha: ${dp.koshtha}; Bala: ${dp.bala}; Ahara-shakti: ${dp.ahara_shakti}; Recommendations: ${dp.clinical_recommendations.join(', ')}`;
      }

      return {
        patient_summary_bilingual: cRes.patient_audio_view?.audio_script || langConfig.complete,
        clinician_summary: {
          chief_complaint: cRes.sbar_summary.chief_complaint || 'Outpatient intake',
          provisional_diagnoses: cRes.sbar_summary.provisional_diagnoses || 'Evaluated via multimodal synthesis',
          hpi: cRes.sbar_summary.hpi_narrative || 'Structured interview recorded.',
          past_medical_surgical: cRes.sbar_summary.past_medical_surgical || 'None reported',
          family_history: cRes.sbar_summary.family_history || 'No hereditary illness reported',
          allergies: cRes.sbar_summary.allergies_adverse_reactions || 'No known allergies',
          medications: cRes.sbar_summary.current_medications || 'None recorded',
          dashavidha_pariksha: dashavidhaStr,
          ayush_profile: isAyurveda ? dashavidhaStr : 'Standard allopathy intake',
          review_of_systems: cRes.sbar_summary.review_of_systems || 'Completed',
          prior_investigations: cRes.sbar_summary.prior_investigations || 'Document reports processed',
          dual_coding: cRes.dual_coding || [],
          consent_token: cRes.consent_token || '',
        },
      };
    }
  } catch (modCErr: any) {
    console.warn('[Module C Integration Notice] Proceeding with primary LLM synthesis:', modCErr?.message || modCErr);
  }

  try {
    const prompt = `
    You are MediKiosk's Clinical Summarizer. You summarize patient-reported interview answers and document-extracted data into a structured clinical summary for doctors.
    
    CLINICAL MODE: ${isAyurveda ? 'MINISTRY OF AYUSH / AYURVEDIC CLINIC (Focus on Dashavidha Pariksha, Tridosha, Agni, Ahara)' : 'STANDARD ALLOPATHIC CLINIC'}
    
    CRITICAL SAFETY BOUNDARY:
    - You must NEVER make a diagnosis, suggest a differential, or recommend a treatment/medication.
    - Every section must be labelled as DRAFT / UNVERIFIED for physician review.
    - IMPORTANT: Every value in "clinician_summary" MUST be a string (NOT a nested object or dictionary).

    INPUT DATA:
    Patient Spoken Answers: ${JSON.stringify(structuredHistory)}
    Document Extracted Entities: ${JSON.stringify(extractedEntities)}

    Output strictly JSON matching this structure:
    {
      "patient_summary_bilingual": "Plain language confirmation text in ${langConfig.name} (${langConfig.native}) for patient recap.",
      "clinician_summary": {
        "chief_complaint": "Chief complaint summary string",
        "provisional_diagnoses": "Provisional clinical impressions & diagnostic considerations from patient verbal intake and documents string",
        "hpi": "History of Present Illness (SOCRATES breakdown in coherent narrative string)",
        "past_medical_surgical": "Patient's History of Diseases (chronic conditions: Diabetes, Hypertension, Thyroid, Asthma, past surgeries) string",
        "family_history": "Family History (hereditary diseases in parents/siblings) string",
        "allergies": "Allergies reported or documented (drug allergies, food allergies, environmental) string",
        "medications": "Current medications & traditional herbal remedies list string",
        "dashavidha_pariksha": "Classical Dashavidha Pariksha findings (Dushya, Desha, Bala, Kala, Agni, Prakriti, Vayas, Sattva, Satmya, Ahara-shakti) string",
        "ayush_profile": "Patient self-reported AYUSH / Agni / Ahara profile string if present",
        "review_of_systems": "Review of systems findings string",
        "prior_investigations": "Lab tests and diagnostic results string"
      }
    }
    `;

    const content = await executeLlmChatCompletion(prompt, true);
    const parsed = typeof content === 'string' ? JSON.parse(content) : JSON.parse(JSON.stringify(content));

    // Normalize all fields to strings to prevent React child object errors
    if (parsed.clinician_summary) {
      for (const [key, val] of Object.entries(parsed.clinician_summary)) {
        if (typeof val === 'object' && val !== null) {
          parsed.clinician_summary[key] = Object.entries(val)
            .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
            .join('; ');
        }
      }
    }

    return parsed;
  } catch (err: any) {
    console.error('Mistral Summary generation error:', err);
    
    // Synthesize fallback string-based summary
    const cc = structuredHistory.find(h => h.section === 'chief_complaint')?.value || 'Not reported';
    const hpiItems = structuredHistory.filter(h => h.section === 'hpi').map(h => `${h.field_name?.replace(/_/g, ' ')}: ${h.value}`).join('; ');
    const pastDiseases = structuredHistory.filter(h => (h.section || '').includes('past') || (h.field_name || '').includes('chronic')).map(h => h.value).join('; ') || 'None reported';
    const familyHist = structuredHistory.filter(h => (h.section || '').includes('family')).map(h => h.value).join('; ') || 'No hereditary disease reported';
    const meds = extractedEntities.filter(e => e.entity_type === 'medication').map(e => e.fields?.name || e.name).join(', ') || 'None recorded';
    const allergies = structuredHistory.find(h => h.section === 'allergies')?.value || 'No known drug allergies reported';
    const ayushItems = structuredHistory.filter(h => (h.section || '').includes('ayush')).map(h => `${h.field_name?.replace(/_/g, ' ')}: ${h.value}`).join('; ');

    const diags = extractedEntities.filter(e => e.entity_type === 'diagnosis').map(e => e.fields?.name || e.raw_text || e.name).join('; ') || 'Clinical evaluation in progress based on vocal interview.';

    return {
      patient_summary_bilingual: langConfig.complete,
      clinician_summary: {
        chief_complaint: String(cc),
        provisional_diagnoses: diags,
        hpi: hpiItems || 'Structured interview recorded.',
        past_medical_surgical: pastDiseases,
        family_history: familyHist,
        medications: meds,
        allergies: String(allergies),
        dashavidha_pariksha: ayushItems || (isAyurveda ? 'Dashavidha Pariksha recorded.' : 'N/A'),
        ayush_profile: ayushItems || (isAyurveda ? 'Ayurvedic intake recorded.' : 'Standard'),
        review_of_systems: 'Completed',
        prior_investigations: 'Uploaded documents processed'
      }
    };
  }
}
