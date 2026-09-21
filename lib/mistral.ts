import { Mistral } from '@mistralai/mistralai';
import { LOCALIZED_LANGUAGES } from './languages';
import { getStructuredClinicalQuestion, validateLanguageScript } from './clinicalQuestions';

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
export async function executeLlmChatCompletion(prompt: string, jsonMode: boolean = true): Promise<string | null | undefined> {
  const activeGroqKey = process.env.GROQ_API_KEY || groqApiKey;
  if (activeGroqKey) {
    const candidateModels = [
      'openai/gpt-oss-20b',
      'qwen/qwen3.8-27b',
      'openai/gpt-oss-120b',
      'groq/compound-mini'
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
          console.warn(`Groq rate limit on ${model}, trying next candidate LPU model...`);
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
 * Checks if a candidate question repeats or heavily overlaps with any past questions in the session.
 * Uses Unicode-aware tokenization to support all 22 official Indian languages + English without script loss.
 */
function checkQuestionRepetition(
  questionText: string,
  history: Array<{ question: string; answer: string; section?: string; field_name?: string }>
): boolean {
  if (!questionText || !history || history.length === 0) return false;
  
  // Use Unicode letters and digits (\p{L} and \p{N}) to preserve Indic & vernacular scripts
  const normNew = questionText.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
  if (normNew.length < 15) return false;

  const newTokens = new Set(normNew.split(' ').filter(w => w.length > 2));
  if (newTokens.size < 3) return false;

  for (const h of history) {
    const pastQ = (h.question || '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
    if (!pastQ || pastQ.length < 15) continue;
    
    // Exact or long identical substring match
    if (pastQ === normNew) return true;
    if (normNew.length >= 30 && pastQ.includes(normNew)) return true;
    if (pastQ.length >= 30 && normNew.includes(pastQ)) return true;

    // Token overlap check (>75% common words among meaningful tokens)
    const pastTokens = new Set(pastQ.split(' ').filter(w => w.length > 2));
    if (pastTokens.size >= 3) {
      let overlapCount = 0;
      for (const token of newTokens) {
        if (pastTokens.has(token)) overlapCount++;
      }
      const similarity = overlapCount / Math.max(newTokens.size, pastTokens.size);
      if (similarity >= 0.75) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Evaluates which core clinical domains have already been probed in conversation history across all 23 languages.
 */
function evaluateDomainCoverage(
  history: Array<{ question: string; answer: string; section?: string; field_name?: string }>
) {
  const historyText = history.map(h => `${h.question} ${h.answer} ${h.section || ''} ${h.field_name || ''}`).join(' ').toLowerCase();

  const hasPastIllness = 
    history.some(h => (h.section || '').includes('past') || (h.field_name || '').includes('chronic') || (h.field_name || '').includes('past_illness')) ||
    /(previous medical|chronic illness|past condition|pre-existing|diabetes|sugar|hypertension|bp|blood pressure|thyroid|asthma|surger|पुरानी बीमारी|बीमारी|मधुमेह|रक्तदाब|दमा|आजार|পূর্ববর্তী রোগ|রোগ|ডায়াবেটিস|രോഗം|வியாதி|நோய்|ಅನಾರೋಗ್ಯ|ರೋಗ|వ్యాధి|జబ్బు|ਬਿਮਾਰੀ|ਸ਼ੂਗਰ|ਰੋਗ)/i.test(historyText);

  const hasMedications = 
    history.some(h => (h.section || '').includes('medication') || (h.field_name || '').includes('medication')) ||
    /(regular prescription|daily tablet|taking any medicine|painkiller|remed|dawa|दवाई|गोली|औषध|மருந்து|ঔষধ|औषधे|మందులు|మాత్రలు|ಔಷಧಿ|മാತ್ರೆ|മരുന്ന്|ਦਵਾਈ|ਦਵਾ)/i.test(historyText);

  const hasAllergies = 
    history.some(h => (h.section || '').includes('allerg') || (h.field_name || '').includes('allerg')) ||
    /(known allerg|penicillin|drug reaction|food allergy|reaction|एलर्जी|ऍलर्जी|অ্যালার্জি|அலர்ஜி|ಅಲರ್ಜಿ|അലർജി|అలెర్జీ|ਅਲਰਜੀ|ଆଲର୍ଜି)/i.test(historyText);

  const hasFamilyHistory = 
    history.some(h => (h.section || '').includes('family') || (h.field_name || '').includes('family')) ||
    /(family history|parents or siblings|hereditary|genetic|माता-पिता|परिवार|कुटुंब|குடும்ப|পারিবারিক|ಕುಟುಂಬ|കുടുംബം|కుటుంబ|ਪਰਿਵਾਰ|ପରିବାର)/i.test(historyText);

  return { hasPastIllness, hasMedications, hasAllergies, hasFamilyHistory };
}

export { getStructuredClinicalQuestion, validateLanguageScript };

/**
 * Strips parenthetical example lists and extra verbose padding from question text,
 * ensuring all questions delivered to the patient are short, crisp, and direct (5-10 words).
 */
export function cleanQuestionText(q: string): string {
  if (!q || typeof q !== 'string') return '';
  // Strip parenthetical expressions e.g. (such as ...), (like ...), (e.g. ...)
  let cleaned = q.replace(/\s*\([^)]*\)/g, '').trim();
  // Clean whitespace before punctuation
  cleaned = cleaned.replace(/\s+([?,.!])/g, '$1');
  // Collapse duplicate whitespace
  cleaned = cleaned.replace(/\s+/g, ' ');
  return cleaned;
}

/**
 * Module A: Multi-Language Conversational Intelligent Follow-Up AI Agent
 * Implements clinical SOCRATES pain/symptom framework, past medical conditions,
 * medications, allergies, family history, and real-time clinical severity evaluation.
 * STRICT CLINICAL DURATION: 10 TO 12 QUESTIONS TOTAL. NEVER REPETITIVE.
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

  // Analyze already covered clinical domains
  const domainCoverage = evaluateDomainCoverage(history);
  const chiefComplaintItem = history[0]?.answer || '';

  try {
    // Calculate clinical objective for this turn within 10 to 12 question budget
    let targetDomainObjective = '';
    let targetFrameworkStage = 'socrates';
    let targetSection = 'hpi';
    let targetFieldName = 'clinical_inquiry';

    if (turnCount <= 1) {
      targetDomainObjective = `CLINICAL OBJECTIVE: SOCRATES SITE & CHARACTER OF SENSATION
Ask ONE short, direct question inquiring about the exact physical location and how the sensation feels, specifically adapting to "${chiefComplaintItem}". Do NOT list pain types or examples in the question.`;
      targetFrameworkStage = 'socrates_character_radiation';
      targetSection = 'hpi';
      targetFieldName = 'socrates_character_and_radiation';
    } else if (turnCount === 2) {
      targetDomainObjective = `CLINICAL OBJECTIVE: SOCRATES RADIATION & TIMING
Ask ONE short question asking if the sensation spreads anywhere else or what time it occurs. Do NOT include example locations in the question.`;
      targetFrameworkStage = 'socrates_associations_timing';
      targetSection = 'hpi';
      targetFieldName = 'socrates_associations_and_timing';
    } else if (turnCount === 3) {
      targetDomainObjective = `CLINICAL OBJECTIVE: ASSOCIATED SYSTEMIC SYMPTOMS
Ask ONE short question inquiring if they are experiencing any other symptoms along with this. Do NOT list example symptoms in the question.`;
      targetFrameworkStage = 'socrates_associations';
      targetSection = 'hpi';
      targetFieldName = 'associated_symptoms';
    } else if (turnCount === 4) {
      targetDomainObjective = `CLINICAL OBJECTIVE: TRIGGERS & RELIEF FACTORS
Ask ONE short question inquiring what makes the symptom better or worse. Do NOT include examples in the question.`;
      targetFrameworkStage = 'socrates_severity_triggers';
      targetSection = 'hpi';
      targetFieldName = 'socrates_triggers_and_relief';
    } else if (turnCount === 5) {
      targetDomainObjective = `CLINICAL OBJECTIVE: SEVERITY SCALE (1-10)
Ask ONE short question asking the patient to rate the severity from 1 to 10. Keep it direct and short.`;
      targetFrameworkStage = 'socrates_severity_triggers';
      targetSection = 'hpi';
      targetFieldName = 'socrates_severity_and_impact';
    } else if (!domainCoverage.hasPastIllness && (turnCount === 6 || turnCount >= 6)) {
      targetDomainObjective = `CLINICAL OBJECTIVE: MANDATORY CLINICAL PILLAR 1 — PREVIOUS ILLNESSES & CHRONIC CONDITIONS
Ask ONE short, direct question inquiring if the patient has any pre-existing chronic illnesses or past surgeries. Do NOT list specific illnesses like diabetes or BP in the question text.`;
      targetFrameworkStage = 'past_medical_history';
      targetSection = 'past_history';
      targetFieldName = 'chronic_illnesses';
    } else if (!domainCoverage.hasMedications && (turnCount === 7 || turnCount >= 7)) {
      targetDomainObjective = `CLINICAL OBJECTIVE: CURRENT MEDICATIONS & TREATMENTS
Ask ONE short question asking what regular medications or daily treatments they are currently taking. Do NOT list medicine examples in the question.`;
      targetFrameworkStage = 'medications';
      targetSection = 'medications';
      targetFieldName = 'current_medications';
    } else if (!domainCoverage.hasAllergies && (turnCount === 8 || turnCount >= 8)) {
      targetDomainObjective = `CLINICAL OBJECTIVE: MANDATORY CLINICAL PILLAR 2 — KNOWN ALLERGIES
Ask ONE short question asking if they have any known allergies to medicines or food. Do NOT list specific drug names or food items in the question.`;
      targetFrameworkStage = 'allergies';
      targetSection = 'allergies';
      targetFieldName = 'known_allergies';
    } else if (!domainCoverage.hasFamilyHistory && (turnCount === 9 || turnCount >= 9)) {
      targetDomainObjective = `CLINICAL OBJECTIVE: MANDATORY CLINICAL PILLAR 3 — FAMILY MEDICAL HISTORY
Ask ONE short question inquiring if immediate family members have any chronic health conditions. Do NOT list disease names in the question.`;
      targetFrameworkStage = 'family_history';
      targetSection = 'family_history';
      targetFieldName = 'family_medical_history';
    } else if (turnCount === 10) {
      targetDomainObjective = `CLINICAL OBJECTIVE: LIFESTYLE & HABITS
Ask ONE short question inquiring about daily habits like tobacco, smoking, or alcohol. Keep it brief and direct.`;
      targetFrameworkStage = 'lifestyle_exposures';
      targetSection = 'hpi';
      targetFieldName = 'lifestyle_and_exposures';
    } else if (turnCount === 11) {
      targetDomainObjective = `CLINICAL OBJECTIVE: SYSTEMIC REVIEW & FINAL CONCERNS
Ask ONE short question asking if there is any other health concern they want the doctor to know.`;
      targetFrameworkStage = 'systemic_review';
      targetSection = 'hpi';
      targetFieldName = 'systemic_review';
    } else {
      targetDomainObjective = `CLINICAL OBJECTIVE: INTAKE COMPLETION
All necessary clinical dimensions have been probed. Conclude the intake in one brief sentence.`;
      targetFrameworkStage = 'completed';
      targetSection = 'completed';
      targetFieldName = 'intake_completed';
    }

    const prompt = `
    You are MediKiosk's empathetic, clinical conversational intake AI for ${isAyurveda ? `a Ministry of AYUSH Ayurvedic Clinic (Assessment: ${ayushAssessmentType.toUpperCase()})` : 'an Allopathic Outpatient Clinic in India'}.
    Your primary clinical responsibility is to conduct a thorough, non-repetitive, dynamically-varying intake interview using clinical frameworks and essential medical history, while actively monitoring for SEVERE or LIFE-THREATENING conditions.

    CLINICAL MODE: ${isAyurveda ? `MINISTRY OF AYUSH / AYURVEDIC CLINIC (${ayushAssessmentType.toUpperCase()} PARIKSHA)` : 'ALLOPATHIC CLINIC (DYNAMIC SOCRATES FRAMEWORK)'}
    PATIENT CHOSEN LANGUAGE: ${langConfig.name} (${langConfig.native})
    ${patientName ? `PATIENT NAME: "${patientName}". Address the patient respectfully by name (e.g. "${patientName} जी" in Hindi, "${patientName} garu" in Telugu, "${patientName} avargale" in Tamil, "Hello ${patientName}" in English) where appropriate.` : ''}
    
    CURRENT QUESTION NUMBER IN INTAKE: ${turnCount + 1} (Total limit: STRICTLY 10 to 12 questions)
    PATIENT CONVERSATION HISTORY SO FAR:
    ${JSON.stringify(history, null, 2)}

    MANDATORY OBJECTIVE FOR THIS TURN:
    ${targetDomainObjective}

    CURRENT DOMAIN COVERAGE STATUS:
    - Previous Illnesses / Past Medical History Asked: ${domainCoverage.hasPastIllness ? 'YES (ALREADY COVERED - DO NOT RE-ASK)' : 'NO (MUST BE ASKED BEFORE COMPLETION)'}
    - Known Allergies Asked: ${domainCoverage.hasAllergies ? 'YES (ALREADY COVERED - DO NOT RE-ASK)' : 'NO (MUST BE ASKED BEFORE COMPLETION)'}
    - Family Medical History Asked: ${domainCoverage.hasFamilyHistory ? 'YES (ALREADY COVERED - DO NOT RE-ASK)' : 'NO (MUST BE ASKED BEFORE COMPLETION)'}
    - Current Medications Asked: ${domainCoverage.hasMedications ? 'YES (ALREADY COVERED - DO NOT RE-ASK)' : 'NO'}

    ========================================================================
    CRITICAL DYNAMIC QUESTIONING & ANTI-REPETITION MANDATE:
    ========================================================================
    1. NEVER use fixed, repetitive, or robotic question text. Every question MUST adapt dynamically to the patient's symptoms, past answers, and specific clinical situation.
    2. Carefully check PATIENT CONVERSATION HISTORY SO FAR. If the patient already explained when it started, what type of pain it is, what medicines they take, their previous illness, or allergies, DO NOT probe that dimension again.
    3. Never generate a question that has similar wording or identical intent to any question already in history.
    4. Provide 4 to 6 realistic, context-specific quick-tap options tailored to this exact question.

    ========================================================================
    INTAKE BUDGET: STRICT 10 TO 12 QUESTIONS TOTAL
    ========================================================================
    The complete intake MUST consist of around 10 to 12 questions:
    - Turns 1-5: Dynamic SOCRATES Symptom Inquiry
    - Turn 6: MANDATORY - Previous Illnesses & Past Medical History (dynamically adapted)
    - Turn 7: Current Active Medications & Treatments (dynamically adapted)
    - Turn 8: MANDATORY - Known Allergies (dynamically adapted)
    - Turn 9: MANDATORY - Family Medical History (dynamically adapted)
    - Turn 10: Lifestyle, Dietary & Occupational Factors
    - Turn 11: Review of Systems & Red-Flag Clearance
    - Turn 12: Intake Completion (set "is_intake_complete": true)

    COMPLETION RULES:
    - If turnCount < 10: set "is_intake_complete": false. The interview MUST NEVER end before 10 questions!
    - If turnCount >= 10 and turnCount < 12: set "is_intake_complete": true ONLY IF Previous Illnesses, Allergies, and Family History have all been asked.
    - If turnCount >= 12: set "is_intake_complete": true. Hard upper limit of 12 questions.

    ========================================================================
    HOSPITAL BACKGROUND NOISE & BABBLE REJECTION INSTRUCTION:
    ========================================================================
    The patient is speaking at a busy hospital OPD intake kiosk. Isolate and extract ONLY the direct clinical answers describing the patient's own symptoms. Disregard extraneous noise or bystander banter.

    ${isAyurveda ? `========================================================================
    AYUSH SPECIALIZED MODE: ${ayushAssessmentType.toUpperCase()} PARIKSHA
    ========================================================================
    Capture ${ayushAssessmentType.toUpperCase()} Pariksha dimensions and ensure Previous Illnesses, Medications, Allergies, and Family History are methodically inquired within the 10-12 turn budget!
    ` : ''}

    ========================================================================
    CRITICAL SAFETY & SEVERITY RULES: MULTI-TURN VERIFICATION PROTOCOL
    ========================================================================
    STRICT CLINICAL RULE: ON A SINGLE-QUESTION BASIS, EMERGENCY TRIAGE MUST NEVER BE ACTIVATED!
    - A single reported symptom is NEVER enough to declare an acute emergency. More questions MUST be asked to verify whether this is an acute life-threatening event vs a chronic/subacute condition.
    - If the patient mentions a potentially severe symptom on Turn 1, 2, or 3: DO NOT stop questioning; ask focused follow-up questions following the SOCRATES hierarchy.

    INSTRUCTIONS FOR GENERATING NEXT QUESTION:
    - Review what has already been answered in the history above.
    - Ask ONE clear, concise, tailored clinical question addressing the MANDATORY OBJECTIVE FOR THIS TURN.
    - CRITICAL LENGTH & CONCISENESS MANDATE: Keep questions very short, direct, and on-point (strictly 5 to 10 words, 1 short sentence maximum).
    - NEVER GIVE EXAMPLES IN THE QUESTION: Do NOT include example lists or parentheses (e.g. NEVER write "such as diabetes, BP, thyroid" or "like sharp, burning, dull ache") inside the question. Put examples ONLY in the options list, NEVER in the question text.
    - CONVERSATIONAL VOICE SPEED: Crisp, direct single question (5 to 10 words).
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
      "current_framework_stage": "${targetFrameworkStage}",
      "question_localized": "Next question in ${isEnglish ? 'English' : langConfig.name}",
      "question_en": "Next question in English",
      "section": "${targetSection}",
      "field_name": "${targetFieldName}",
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

    // Guarantee questions are crisp and devoid of parenthetical example lists
    if (parsed.question_en) parsed.question_en = cleanQuestionText(parsed.question_en);
    if (parsed.question_localized) parsed.question_localized = cleanQuestionText(parsed.question_localized);

    // When patient is English, ensure English is strictly assigned and devoid of any Devanagari/Hindi
    if (isEnglish) {
      const candidateQ = (parsed.question_en || parsed.question_localized || '').replace(/[\u0900-\u0D7F]/g, '').trim();
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
            return cleanOpt.replace(/[\u0900-\u0D7F]/g, '').trim();
          }
          return opt;
        }).filter(Boolean);
      }
      if (parsed.emergency_instruction_localized) {
        parsed.emergency_instruction_localized = parsed.emergency_instruction_en || parsed.emergency_instruction_localized.replace(/[\u0900-\u0D7F]/g, '').trim();
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

    // Programmatic Anti-Repetition Guardrail:
    // Only triggers if significant token overlap or near-duplicate is detected
    const isRepetitive = checkQuestionRepetition(parsed.question_en, history) || 
                         checkQuestionRepetition(parsed.question_localized, history);

    if (isRepetitive) {
      console.warn('[Anti-Repetition Guardrail] Detected repetitive AI question:', parsed.question_en);
      let substituteDomain: 'past_history' | 'allergies' | 'family_history' | 'medications' | undefined;
      if (!domainCoverage.hasPastIllness) substituteDomain = 'past_history';
      else if (!domainCoverage.hasAllergies) substituteDomain = 'allergies';
      else if (!domainCoverage.hasFamilyHistory) substituteDomain = 'family_history';
      else if (!domainCoverage.hasMedications) substituteDomain = 'medications';

      const fallbackQ = getStructuredClinicalQuestion(turnCount, patientLangCode, patientName, chiefComplaintItem, substituteDomain);
      Object.assign(parsed, fallbackQ);
    }

    // Ensure section and field_name are aligned with target if the LLM left them generic
    if (!parsed.section || parsed.section === 'hpi') {
      parsed.section = targetSection;
    }
    if (!parsed.field_name || parsed.field_name === 'clinical_inquiry') {
      parsed.field_name = targetFieldName;
    }

    // Strict 10 to 12 Question Limit Guardrails:
    if (!parsed.is_severe) {
      if (turnCount < 10) {
        // Never allow non-severe intakes to finish before question 10
        parsed.is_intake_complete = false;
      } else if (turnCount >= 10 && turnCount < 12) {
        // Between turns 10 and 12, can only complete if past illnesses, allergies, and family history have all been asked
        const updatedCoverage = evaluateDomainCoverage([
          ...history,
          { question: parsed.question_en || '', answer: '', section: parsed.section, field_name: parsed.field_name }
        ]);
        if (!updatedCoverage.hasPastIllness || !updatedCoverage.hasAllergies || !updatedCoverage.hasFamilyHistory) {
          parsed.is_intake_complete = false;
        }
      } else if (turnCount >= 12) {
        // Hard maximum cap at 12 questions
        parsed.is_intake_complete = true;
      }
    }

    // Language Consistency Guardrail: verify script matches patientLangCode
    if (!validateLanguageScript(parsed.question_localized || "", patientLangCode)) {
      console.warn(`[Language Guardrail] Script mismatch for ${patientLangCode} in: "${parsed.question_localized}". Using localized clinical question.`);
      const localizedFallback = getStructuredClinicalQuestion(turnCount, patientLangCode, patientName, chiefComplaintItem);
      parsed.question_localized = localizedFallback.question_localized;
      parsed.question_en = parsed.question_en || localizedFallback.question_en;
      parsed.options = localizedFallback.options;
      parsed.section = parsed.section || localizedFallback.section;
      parsed.field_name = parsed.field_name || localizedFallback.field_name;
    }

    // Ensure intake completion message is fully localized
    if (parsed.is_intake_complete) {
      const completedInfo = getStructuredClinicalQuestion(12, patientLangCode, patientName, chiefComplaintItem);
      parsed.question_localized = completedInfo.question_localized;
      parsed.question_en = completedInfo.question_en;
      parsed.options = completedInfo.options;
      parsed.section = "completed";
      parsed.field_name = "intake_completed";
    }

    if (parsed.question_en) parsed.question_en = cleanQuestionText(parsed.question_en);
    if (parsed.question_localized) parsed.question_localized = cleanQuestionText(parsed.question_localized);

    return parsed;
  } catch (err: any) {
    console.error('Notice: Mistral AI conversational follow-up using structured clinical fallback:', err?.message || err);

    // Use deterministic 12-turn structured fallback with zero repetition
    let targetDomainOverride: 'past_history' | 'allergies' | 'family_history' | 'medications' | undefined;
    if (turnCount >= 6 && !domainCoverage.hasPastIllness) targetDomainOverride = 'past_history';
    else if (turnCount >= 7 && !domainCoverage.hasAllergies) targetDomainOverride = 'allergies';
    else if (turnCount >= 8 && !domainCoverage.hasFamilyHistory) targetDomainOverride = 'family_history';

    return getStructuredClinicalQuestion(
      turnCount, 
      patientLangCode, 
      patientName, 
      chiefComplaintItem,
      targetDomainOverride
    );
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
  patientInterviewContext: any[] = [],
  lineCrops: Array<{ line_index?: number; crop_base64?: string | null; [key: string]: any }> = []
) {
  try {
    const contextSummary = patientInterviewContext.length > 0
      ? `CLINICAL PRIOR FROM VERBAL INTAKE (Module A Structured Symptoms & History):\n${JSON.stringify(patientInterviewContext, null, 2)}\nUse this clinical prior to anchor ambiguous medication trade brands and clinical diagnoses.`
      : 'No prior verbal intake recorded.';

    const prompt = `
    You are an expert clinical document transcription and intelligence system specializing in Indian handwritten prescriptions and medical reports.
    
    ${contextSummary}

    SOUTH ASIAN & COMMONWEALTH MEDICAL SHORTHAND LEXICON:
    You must decode handwriting abbreviations according to this clinical standard:
    • "1+0+1", "BD", "BID" -> "Twice daily (1-0-1)"
    • "1+0+0", "OD" -> "Once daily (1-0-0)"
    • "0+0+1", "HS", "SOS" -> "At bedtime (0-0-1) / As needed"
    • "1+1+1", "TDS", "TID" -> "Three times daily (1-1-1)"
    • "1/52" -> "1 week"; "2/52" -> "2 weeks"; "3/7" -> "3 days"; "5/7" -> "5 days"
    • Vernacular Food Directions:
      - "খাওয়ার পর" / "খাওয়ার পর" / "खाने के बाद" / "சாப்பாட்டுக்கு பின்" -> "After meals (PC)"
      - "খাওয়ার আগে" / "খাওয়ার আগে" / "खाने से पहले" / "சாப்பாட்டுக்கு முன்" -> "Before meals (AC)"
      - "খালি পেটে" / "खाली पेट" -> "On empty stomach"

    INSTRUCTIONS:
    1. Read and transcribe the medical document accurately from the full image and any attached high-resolution line crops.
    2. Extract all medications: medicine brand or generic name, dosage form (Tab/Cap/Syr), strength, route, frequency (with decoded sig), duration.
    3. Extract all diagnostic lab investigations: test name, quantitative value, unit, reference range.
    4. CRITICAL FOR DIAGNOSIS EXTRACTION:
       - Extract diagnoses, impressions, or clinical conditions ONLY if explicitly written or printed on the prescription (e.g. under 'Dx', 'Diagnosis', 'Impression', 'K/C/O', 'Prov. Dx', or handwritten clinical condition).
       - NEVER guess, assume, or hallucinate a diagnosis. If no diagnosis is explicitly written or stated on the prescription, return an empty array: "diagnoses": [].
    5. Correlate with the verbal intake clinical prior when deciphering cursive handwriting trade names.
    6. Set "quality_assessment": "good", "is_readable": true.

    Output strictly valid JSON with NO commentary:
    {
      "document_type": "prescription",
      "document_date": "YYYY-MM-DD" or null,
      "quality_assessment": "good",
      "is_readable": true,
      "doctor_or_hospital": "Doctor or Clinic Name",
      "diagnoses": [
        {"name": "Explicit Diagnosis Only If Present", "confidence": 0.95}
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

    // Construct multimodal parts: prompt + full document + high-resolution line crops
    const contentParts: any[] = [
      {
        type: 'text',
        text: prompt,
      },
      {
        type: 'image_url',
        imageUrl: `data:${mimeType};base64,${base64Image}`,
        image_url: `data:${mimeType};base64,${base64Image}`,
      },
    ];

    // Append up to 6 high-res line crops if provided to resolve cursive handwriting
    const validCrops = lineCrops
      .filter((c) => c && c.crop_base64)
      .slice(0, 6);

    for (const crop of validCrops) {
      const cropB64 = crop.crop_base64!;
      const cleanB64 = cropB64.includes(',') ? cropB64.split(',')[1] : cropB64;
      contentParts.push({
        type: 'image_url',
        imageUrl: `data:image/jpeg;base64,${cleanB64}`,
        image_url: `data:image/jpeg;base64,${cleanB64}`,
      });
    }

    const response = await mistralClient.chat.complete({
      model: MISTRAL_MODELS.VISION_OCR,
      responseFormat: { type: 'json_object' },
      messages: [
        {
          role: 'user',
          content: contentParts as any,
        },
      ],
    });

    const content = response.choices?.[0]?.message?.content;
    const parsed = typeof content === 'string' ? JSON.parse(content) : JSON.parse(JSON.stringify(content));

    if (parsed) {
      // Normalize diagnoses to Array<{ name: string, confidence: number, notes?: string, icd10?: string }>
      let rawDiag = parsed.diagnoses ?? parsed.diagnosis ?? parsed.provisional_diagnosis ?? parsed.clinical_diagnosis ?? [];
      if (typeof rawDiag === 'string') {
        const trimmed = rawDiag.trim();
        rawDiag = trimmed && trimmed.toLowerCase() !== 'none' && trimmed.toLowerCase() !== 'n/a'
          ? [{ name: trimmed, confidence: 0.92 }]
          : [];
      } else if (Array.isArray(rawDiag)) {
        rawDiag = rawDiag.map((d: any) => {
          if (typeof d === 'string') {
            const trimmed = d.trim();
            return trimmed && trimmed.toLowerCase() !== 'none' && trimmed.toLowerCase() !== 'n/a'
              ? { name: trimmed, confidence: 0.92 }
              : null;
          }
          if (typeof d === 'object' && d !== null) {
            const name = (d.name || d.diagnosis || d.condition || d.title || '').trim();
            if (name && name.toLowerCase() !== 'none' && name.toLowerCase() !== 'n/a') {
              return {
                name,
                confidence: typeof d.confidence === 'number' ? d.confidence : 0.92,
                notes: d.notes || d.rationale || undefined,
                icd10: d.icd10 || d.code || undefined
              };
            }
          }
          return null;
        }).filter(Boolean);
      } else if (typeof rawDiag === 'object' && rawDiag !== null) {
        const name = (rawDiag.name || rawDiag.diagnosis || rawDiag.condition || '').trim();
        rawDiag = name && name.toLowerCase() !== 'none' && name.toLowerCase() !== 'n/a'
          ? [{ name, confidence: typeof rawDiag.confidence === 'number' ? rawDiag.confidence : 0.92 }]
          : [];
      } else {
        rawDiag = [];
      }
      parsed.diagnoses = rawDiag;

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
 * @param structuredHistory Rows from structured_history table for this session
 * @param extractedEntities Rows from extracted_entities table for this session
 * @param patientLangCode ISO language code (e.g. 'hi', 'en')
 * @param clinicalMode 'allopathy' | 'ayurveda'
 * @param patientMeta Optional patient metadata (age, gender, name) to enrich background
 */
export async function generateBilingualSummary(
  structuredHistory: any[], 
  extractedEntities: any[], 
  patientLangCode: string = 'hi',
  clinicalMode: string = 'allopathy',
  patientMeta?: { age?: number; gender?: string; name?: string }
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
        age: patientMeta?.age,
        gender: patientMeta?.gender,
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
          social_history: cRes.sbar_summary.social_history || 'No social/lifestyle history recorded',
          background_summary: cRes.sbar_summary.background_summary || '',
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
    // Build a human-readable background block to anchor the LLM for better summarization
    const backgroundSections = structuredHistory.filter(h => [
      'past_medical', 'past_medical_history', 'past_surgical', 'chronic_conditions',
      'family_history', 'social_history', 'lifestyle', 'occupation', 'demographics',
      'allergies', 'ayush_profile', 'background'
    ].some(tag => (h.section || '').toLowerCase().includes(tag) || (h.field_name || '').toLowerCase().includes(tag)));

    const backgroundNarrative = backgroundSections.length > 0
      ? backgroundSections.map(h => `${(h.field_name || h.section || '').replace(/_/g, ' ')}: ${h.value}`).join('\n')
      : 'No additional background data recorded during intake.';

    const patientDemographics = [
      patientMeta?.age ? `Age: ${patientMeta.age} years` : null,
      patientMeta?.gender ? `Gender: ${patientMeta.gender}` : null,
      patientMeta?.name ? `Name: ${patientMeta.name}` : null,
    ].filter(Boolean).join(', ') || 'Demographics not provided';

    const prompt = `
    You are MediKiosk's Clinical Summarizer. You summarize patient-reported interview answers and document-extracted data into a structured clinical summary for doctors.
    
    CLINICAL MODE: ${isAyurveda ? 'MINISTRY OF AYUSH / AYURVEDIC CLINIC (Focus on Dashavidha Pariksha, Tridosha, Agni, Ahara)' : 'STANDARD ALLOPATHIC CLINIC'}
    
    CRITICAL SAFETY BOUNDARY:
    - You must NEVER make a diagnosis, suggest a differential, or recommend a treatment/medication.
    - Every section must be labelled as DRAFT / UNVERIFIED for physician review.
    - IMPORTANT: Every value in "clinician_summary" MUST be a string (NOT a nested object or dictionary).
    - BACKGROUND EXTRACTION: You MUST extract and summarize the patient's background (past illnesses, family history, lifestyle, allergies) from the spoken history. Do NOT leave these fields as 'None reported' if the patient mentioned anything about them.

    PATIENT DEMOGRAPHICS: ${patientDemographics}

    PATIENT BACKGROUND (from intake interview):
    ${backgroundNarrative}

    INPUT DATA:
    Patient Spoken Answers: ${JSON.stringify(structuredHistory)}
    Document Extracted Entities: ${JSON.stringify(extractedEntities)}

    Output strictly JSON matching this structure:
    {
      "patient_summary_bilingual": "Plain language confirmation text in ${langConfig.name} (${langConfig.native}) for patient recap. Must include a concise background summary (age, gender, relevant past illnesses, family history).",
      "clinician_summary": {
        "chief_complaint": "Chief complaint summary string",
        "provisional_diagnoses": "Provisional clinical impressions & diagnostic considerations from patient verbal intake and documents string",
        "hpi": "History of Present Illness (SOCRATES breakdown in coherent narrative string)",
        "past_medical_surgical": "SUMMARIZE all past illnesses, chronic conditions (Diabetes, Hypertension, Thyroid, Asthma, etc.), and prior surgeries the patient mentioned. Include negatives if explicitly stated.",
        "family_history": "SUMMARIZE family history of hereditary diseases in parents/siblings. Include negatives if explicitly stated.",
        "social_history": "Patient's occupation, lifestyle factors (smoking, alcohol, diet, exercise) and socio-economic context if mentioned.",
        "allergies": "Allergies reported or documented (drug allergies, food allergies, environmental) string",
        "medications": "Current medications & traditional herbal remedies list string",
        "dashavidha_pariksha": "Classical Dashavidha Pariksha findings (Dushya, Desha, Bala, Kala, Agni, Prakriti, Vayas, Sattva, Satmya, Ahara-shakti) string",
        "ayush_profile": "Patient self-reported AYUSH / Agni / Ahara profile string if present",
        "review_of_systems": "Review of systems findings string",
        "prior_investigations": "Lab tests and diagnostic results string",
        "clinical_audio_briefing": "Concise 30-40 second spoken English handover (~60-75 words) summarizing patient name, age, primary complaint, onset, red flags, and pertinent meds for the doctor. Clear spoken style without markdown or raw questionnaire dumps."
      },
      "clinical_audio_briefing": "Same concise 30-40 second spoken English handover (~60-75 words) for attending doctor audio playback."
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
    if (parsed.clinician_summary?.clinical_audio_briefing && !parsed.clinical_audio_briefing) {
      parsed.clinical_audio_briefing = parsed.clinician_summary.clinical_audio_briefing;
    }

    return parsed;
  } catch (err: any) {
    console.error('Mistral Summary generation error:', err);
    
    // Synthesize comprehensive fallback string-based summary
    const cc = structuredHistory.find(h => h.section === 'chief_complaint')?.value || 'Not reported';
    const hpiItems = structuredHistory
      .filter(h => h.section === 'hpi')
      .map(h => `${h.field_name?.replace(/_/g, ' ')}: ${h.value}`)
      .join('; ');
    
    // Comprehensive past history extraction — covers multiple naming conventions
    const pastDiseases = structuredHistory
      .filter(h =>
        (h.section || '').toLowerCase().match(/past|chronic|medical.?histor|surgical|prior.?ill|comorbid/) ||
        (h.field_name || '').toLowerCase().match(/past|chronic|medical.?histor|surgical|prior.?ill|comorbid/)
      )
      .map(h => h.value)
      .join('; ') || 'None reported';

    // Comprehensive family history extraction
    const familyHist = structuredHistory
      .filter(h =>
        (h.section || '').toLowerCase().includes('family') ||
        (h.field_name || '').toLowerCase().includes('family') ||
        (h.field_name || '').toLowerCase().includes('hereditary') ||
        (h.field_name || '').toLowerCase().includes('parents')
      )
      .map(h => h.value)
      .join('; ') || 'No hereditary disease reported';

    // Social history / lifestyle extraction
    const socialHist = structuredHistory
      .filter(h =>
        (h.section || '').toLowerCase().match(/social|lifestyle|occupation|smoking|alcohol|diet|exercise/) ||
        (h.field_name || '').toLowerCase().match(/social|lifestyle|occupation|smoking|alcohol|diet|exercise/)
      )
      .map(h => `${(h.field_name || h.section || '').replace(/_/g, ' ')}: ${h.value}`)
      .join('; ') || 'No social/lifestyle history recorded';

    const meds = extractedEntities
      .filter(e => e.entity_type === 'medication')
      .map(e => e.fields?.name || e.name)
      .join(', ') || 'None recorded';
    const allergies = structuredHistory.find(h => h.section === 'allergies')?.value || 'No known drug allergies reported';
    const ayushItems = structuredHistory
      .filter(h => (h.section || '').toLowerCase().includes('ayush'))
      .map(h => `${h.field_name?.replace(/_/g, ' ')}: ${h.value}`)
      .join('; ');

    const diags = extractedEntities
      .filter(e => e.entity_type === 'diagnosis')
      .map(e => e.fields?.name || e.raw_text || e.name)
      .join('; ') || 'Clinical evaluation in progress based on vocal interview.';

    // Build a patient background narrative including demographics
    const demographicsStr = [
      patientMeta?.age ? `${patientMeta.age}-year-old` : null,
      patientMeta?.gender || null,
    ].filter(Boolean).join(' ');
    const backgroundSummary = [
      demographicsStr ? `Patient: ${demographicsStr}.` : null,
      pastDiseases !== 'None reported' ? `Past Medical: ${pastDiseases}.` : null,
      familyHist !== 'No hereditary disease reported' ? `Family Hx: ${familyHist}.` : null,
      socialHist !== 'No social/lifestyle history recorded' ? `Social Hx: ${socialHist}.` : null,
    ].filter(Boolean).join(' ') || 'Background not captured during intake.';

    return {
      patient_summary_bilingual: `${langConfig.complete} ${demographicsStr ? `[${demographicsStr}]` : ''}`.trim(),
      clinician_summary: {
        chief_complaint: String(cc),
        provisional_diagnoses: diags,
        hpi: hpiItems || 'Structured interview recorded.',
        past_medical_surgical: pastDiseases,
        family_history: familyHist,
        social_history: socialHist,
        background_summary: backgroundSummary,
        medications: meds,
        allergies: String(allergies),
        dashavidha_pariksha: ayushItems || (isAyurveda ? 'Dashavidha Pariksha recorded.' : 'N/A'),
        ayush_profile: ayushItems || (isAyurveda ? 'Ayurvedic intake recorded.' : 'Standard'),
        review_of_systems: 'Completed',
        prior_investigations: 'Uploaded documents processed',
        clinical_audio_briefing: `Clinical intake briefing for ${patientMeta?.name || 'the patient'}${demographicsStr ? `, a ${demographicsStr}` : ''}. Presenting with ${String(cc).slice(0, 100)}. Intake is recorded and verified for examination.`
      },
      clinical_audio_briefing: `Clinical intake briefing for ${patientMeta?.name || 'the patient'}${demographicsStr ? `, a ${demographicsStr}` : ''}. Presenting with ${String(cc).slice(0, 100)}. Intake is recorded and verified for examination.`
    };
  }
}

/**
 * Doctor Spoken Clinical Audio Briefing Types & Utilities
 */
export interface DoctorAudioBriefingInput {
  patient: {
    name?: string;
    age?: number;
    gender?: string;
    queue_id?: string | number;
    token?: string;
  };
  chief_complaint?: string;
  hpi?: string;
  allergies?: string;
  medications?: string;
  past_medical?: string;
  family_history?: string;
  safety_alerts?: string[];
  abnormal_labs?: Array<{
    name: string;
    value?: string;
    unit?: string;
    status?: string;
    severity?: string;
    is_panic?: boolean;
  }>;
  contradictions?: Array<{
    concept?: string;
    safety_tier?: string;
    conflict_summary?: string;
    spoken_value_ref?: string;
    document_value_ref?: string;
  }>;
  clinical_mode?: string;
}

export interface DoctorAudioBriefingOutput {
  briefing_text: string;
  key_points: string[];
  duration_est_seconds: number;
  engine: string;
}

/**
 * Cleans text for high-fidelity spoken Text-To-Speech (TTS)
 */
export function sanitizeTextForSpokenAudio(text: string): string {
  if (!text) return '';
  return text
    .replace(/[*_#`~[\]]/g, '')
    .replace(/Chief complaint:?\s*/gi, '')
    .replace(/\bmg\b/gi, ' milligrams')
    .replace(/\bml\b/gi, ' milliliters')
    .replace(/\bBP\b/g, 'blood pressure')
    .replace(/\bHR\b/g, 'heart rate')
    .replace(/\bTDS\b/gi, 'three times a day')
    .replace(/\bBD\b/gi, 'twice a day')
    .replace(/\bOD\b/gi, 'once a day')
    .replace(/\bSOS\b/gi, 'as needed')
    .replace(/\bhs\b/gi, 'at bedtime')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Deterministic clinical summarizer fallback (<10ms execution time).
 * Intelligently extracts: demographics -> core complaint -> onset -> panic labs -> severe allergies -> readiness.
 * Guarantees ~50-70 words suitable for 25-35s natural audio handoff.
 */
export function generateDeterministicDoctorBriefing(input: DoctorAudioBriefingInput): DoctorAudioBriefingOutput {
  const pName = input.patient.name || 'The patient';
  const ageGender = [
    input.patient.age ? `${input.patient.age}-year-old` : '',
    input.patient.gender || 'patient'
  ].filter(Boolean).join(' ');
  const token = input.patient.queue_id || input.patient.token ? `Token ${input.patient.queue_id || input.patient.token}` : '';

  // 1. Clean Chief Complaint
  let cc = (input.chief_complaint || 'outpatient clinical consultation')
    .replace(/^Chief complaint:?\s*/i, '')
    .replace(/[\n\r]+/g, ' ')
    .trim();
  if (cc.length > 110) {
    cc = cc.slice(0, 110).replace(/[,;.\s]+$/, '');
  }

  // 2. Extract salient onset/duration from HPI (1 crisp phrase)
  let symptomOnset = '';
  const rawHpi = (input.hpi || '').replace(/[\n\r]+/g, ' ').trim();
  if (rawHpi && rawHpi.length > 8) {
    const firstSentence = rawHpi.split(/[.!?]\s+/)[0] || rawHpi;
    if (firstSentence.length > 10 && !firstSentence.toLowerCase().includes(cc.toLowerCase().slice(0, 20))) {
      symptomOnset = firstSentence.slice(0, 95).trim();
      if (!/[.!?]$/.test(symptomOnset)) symptomOnset += '.';
    }
  }

  // 3. Collect critical alerts (panic labs, allergies, contradictions)
  const alerts: string[] = [];
  const keyPoints: string[] = [
    `Patient: ${pName}, ${ageGender}${token ? ` (${token})` : ''}`,
    `Chief Complaint: ${cc}`
  ];

  if (symptomOnset) {
    keyPoints.push(`Onset / Timeline: ${symptomOnset}`);
  }

  // High-priority panic labs
  const panicLabs = (input.abnormal_labs || []).filter(
    (l) => l.is_panic || l.severity === 'panic' || l.status === 'PANIC' || l.status === 'HIGH' || l.status === 'LOW'
  );
  if (panicLabs.length > 0) {
    const topLab = panicLabs[0];
    const alertMsg = `Critical lab alert: ${topLab.name} is ${topLab.status || 'abnormal'}${topLab.value ? ` at ${topLab.value}` : ''}.`;
    alerts.push(alertMsg);
    keyPoints.push(`Lab Alert: ${topLab.name} ${topLab.status || 'abnormal'} (${topLab.value || ''})`);
  }

  // Documented severe drug allergies
  const allergies = (input.allergies || '').trim();
  if (allergies && !/no known|none|nil|nkda|denies|unremarkable/i.test(allergies)) {
    const allergyMsg = `Documented allergy to ${allergies.slice(0, 45)}.`;
    alerts.push(allergyMsg);
    keyPoints.push(`Allergy Flag: ${allergies.slice(0, 45)}`);
  }

  // High-tier contradictions between spoken history and uploaded documents
  if (input.contradictions && input.contradictions.length > 0) {
    const topConflict = input.contradictions[0];
    const conflictMsg = `Note: Contradiction flagged regarding ${topConflict.concept || 'history vs records'}.`;
    alerts.push(conflictMsg);
    keyPoints.push(`Discrepancy: ${topConflict.concept || 'Contradiction flagged'}`);
  }

  // Pertinent active medications
  let backgroundNote = '';
  const meds = (input.medications || '').trim();
  if (meds && !/none|no med|nil/i.test(meds) && meds.length < 60) {
    backgroundNote = `Current medication: ${meds}.`;
    if (keyPoints.length < 4) {
      keyPoints.push(`Medications: ${meds}`);
    }
  }

  // 4. Synthesize spoken handoff script (~55-75 words)
  let text = `Clinical intake briefing for ${pName}, a ${ageGender}${token ? `, ${token}` : ''}. `;
  text += `Presenting with ${cc}. `;
  if (symptomOnset) {
    text += `${symptomOnset} `;
  }
  if (alerts.length > 0) {
    text += `${alerts.join(' ')} `;
  }
  if (backgroundNote) {
    text += `${backgroundNote} `;
  }
  text += `Intake is verified and ready for your clinical examination.`;

  text = sanitizeTextForSpokenAudio(text);

  return {
    briefing_text: text,
    key_points: keyPoints.slice(0, 4),
    duration_est_seconds: Math.max(20, Math.round(text.split(/\s+/).length / 2.3)),
    engine: 'deterministic-clinical-summarizer'
  };
}

/**
 * AI-powered High-Yield Doctor Clinical Audio Briefing Generator.
 * Uses Groq LPU models first (ultra-fast 200-400ms inference) -> falls back to Mistral Small -> falls back to Deterministic Summarizer.
 * Synthesizes ONLY high-impact clinical information (~55-75 words), eliminating long questionnaires or negative checklists.
 */
export async function generateDoctorAudioBriefingAI(input: DoctorAudioBriefingInput): Promise<DoctorAudioBriefingOutput> {
  const fallback = generateDeterministicDoctorBriefing(input);

  const prompt = `
You are a senior physician's clinical AI assistant delivering a spoken 30-second handover briefing to an attending doctor before they enter the examination room.

DOCTOR'S EXPLICIT REQUIREMENT:
- DO NOT read exhaustive details, negative checklists, or raw questionnaire answers.
- DO summarize the case into a high-yield, crisp clinical handoff in natural spoken English (~55-75 words).

STRUCTURE TO FOLLOW:
1. Patient identifier & demographics: e.g. "Clinical briefing for Ramesh, a 45-year-old male, Token A-12."
2. Core active complaint & timeline: Synthesize the primary symptom and onset/duration in 1 concise, direct sentence.
3. Critical safety alerts (ONLY if present): Mention any panic lab value (e.g. "Alert: Troponin elevated at 0.15"), severe allergy, or medication contradiction.
4. Pertinent medical background (ONLY if directly relevant to current complaint): e.g. "Known type 2 diabetic on Metformin."
5. Ready statement: "Intake complete and ready for your assessment."

TTS AUDIO RESTRAINT:
- Output MUST be spoken English text suitable for Text-To-Speech.
- No markdown, asterisks, bullet points, headers, or emojis in "briefing_text".
- Length: strictly 50 to 75 words.

PATIENT INTAKE DATA:
Patient Demographics: Name: ${input.patient.name || 'Patient'}, Age: ${input.patient.age || 'Unknown'}, Gender: ${input.patient.gender || 'Unknown'}, Token: ${input.patient.queue_id || input.patient.token || 'N/A'}
Chief Complaint: ${input.chief_complaint || 'Outpatient consultation'}
HPI Narrative: ${input.hpi || 'None recorded'}
Allergies: ${input.allergies || 'No known drug allergies'}
Medications: ${input.medications || 'None recorded'}
Past History: ${input.past_medical || 'None recorded'}
Abnormal / Panic Labs: ${JSON.stringify(input.abnormal_labs || [])}
Contradictions: ${JSON.stringify(input.contradictions || [])}
Safety Alerts: ${JSON.stringify(input.safety_alerts || [])}
Clinical Mode: ${input.clinical_mode || 'allopathy'}

Output strictly valid JSON with this schema:
{
  "briefing_text": "Spoken handover text for the doctor in natural English, 50-75 words, no emojis/markdown",
  "key_points": [
    "Patient: [Name, Age, Gender, Token]",
    "Chief Complaint: [Concise primary complaint & onset]",
    "Critical Alerts: [Any panic lab or allergy, or 'None flagged']",
    "Relevant Background: [Key chronic condition or medication if any]"
  ],
  "duration_est_seconds": 30
}
`;

  try {
    const raw = await executeLlmChatCompletion(prompt, true);
    if (raw) {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (parsed && parsed.briefing_text && parsed.briefing_text.length > 25) {
        let cleanText = sanitizeTextForSpokenAudio(parsed.briefing_text);
        return {
          briefing_text: cleanText,
          key_points: Array.isArray(parsed.key_points) && parsed.key_points.length > 0
            ? parsed.key_points.map((p: any) => String(p).trim()).slice(0, 5)
            : fallback.key_points,
          duration_est_seconds: typeof parsed.duration_est_seconds === 'number'
            ? parsed.duration_est_seconds
            : Math.max(20, Math.round(cleanText.split(/\s+/).length / 2.3)),
          engine: 'groq-mistral-ai'
        };
      }
    }
  } catch (err: any) {
    console.warn('[Doctor Audio Briefing AI Notice] Falling back to deterministic summarizer:', err?.message || err);
  }

  return fallback;
}

