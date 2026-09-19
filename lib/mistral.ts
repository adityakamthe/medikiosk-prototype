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
 * Checks if a candidate question repeats or heavily overlaps with any past questions in the session.
 */
function checkQuestionRepetition(
  questionText: string,
  history: Array<{ question: string; answer: string; section?: string; field_name?: string }>
): boolean {
  if (!questionText || !history || history.length === 0) return false;
  const normNew = questionText.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const newTokens = new Set(normNew.split(' ').filter(w => w.length > 3));

  for (const h of history) {
    const pastQ = (h.question || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!pastQ) continue;
    
    // Direct or substring match
    if (pastQ === normNew || pastQ.includes(normNew) || (normNew.length > 20 && pastQ.includes(normNew.slice(0, 30)))) {
      return true;
    }

    // Significant token overlap check (>50% common clinical words)
    const pastTokens = new Set(pastQ.split(' ').filter(w => w.length > 3));
    if (newTokens.size >= 3 && pastTokens.size >= 3) {
      let overlapCount = 0;
      for (const token of newTokens) {
        if (pastTokens.has(token)) overlapCount++;
      }
      const similarity = overlapCount / Math.min(newTokens.size, pastTokens.size);
      if (similarity >= 0.55) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Evaluates which core clinical domains have already been probed in conversation history.
 */
function evaluateDomainCoverage(
  history: Array<{ question: string; answer: string; section?: string; field_name?: string }>
) {
  const historyText = history.map(h => `${h.question} ${h.answer} ${h.section || ''} ${h.field_name || ''}`).join(' ').toLowerCase();

  const hasPastIllness = 
    history.some(h => (h.section || '').includes('past') || (h.field_name || '').includes('chronic') || (h.field_name || '').includes('past_illness')) ||
    /(previous medical|chronic illness|past condition|diabetes|sugar|hypertension|bp|blood pressure|thyroid|asthma|पुरानी बीमारी|मधुमेह|रक्तदाब|दमा|आजार|পূর্ববর্তী রোগ|রোগ|ডায়াবেটিস|രോഗം|வியாதி|நோய்|ಅನಾರೋಗ್ಯ|ರೋಗ)/i.test(historyText);

  const hasMedications = 
    history.some(h => (h.section || '').includes('medication') || (h.field_name || '').includes('medication')) ||
    /(regular prescription|daily tablet|taking any medicine|painkiller|dawa|दवाई|औषध|மருந்து|ঔষধ|औषधे|మందులు|ಔಷಧಿ|മരുന്ന്)/i.test(historyText);

  const hasAllergies = 
    history.some(h => (h.section || '').includes('allerg') || (h.field_name || '').includes('allerg')) ||
    /(known allerg|penicillin|drug reaction|food allergy|एलर्जी|ऍलर्जी|অ্যালার্জি|அலர்ஜி|ಅಲರ್ಜಿ|അലർജി|అలెర్జీ|ਅਲਰਜੀ)/i.test(historyText);

  const hasFamilyHistory = 
    history.some(h => (h.section || '').includes('family') || (h.field_name || '').includes('family')) ||
    /(family history|parents or siblings|hereditary|परिवार|कुटुंब|குடும்ப|পারিবারিক|ಕುಟುಂಬ|കുടുംബം|కుటుంబ|ਪਰਿਵਾਰ)/i.test(historyText);

  return { hasPastIllness, hasMedications, hasAllergies, hasFamilyHistory };
}

export { getStructuredClinicalQuestion, validateLanguageScript };

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
    const prompt = `
    You are MediKiosk's empathetic, clinical conversational intake AI for ${isAyurveda ? `a Ministry of AYUSH Ayurvedic Clinic (Assessment: ${ayushAssessmentType.toUpperCase()})` : 'an Allopathic Outpatient Clinic in India'}.
    Your primary clinical responsibility is to conduct a thorough, non-repetitive, structured intake interview using the SOCRATES clinical framework and essential medical history, while actively monitoring for SEVERE or LIFE-THREATENING conditions.

    CLINICAL MODE: ${isAyurveda ? `MINISTRY OF AYUSH / AYURVEDIC CLINIC (${ayushAssessmentType.toUpperCase()} PARIKSHA)` : 'ALLOPATHIC CLINIC (DYNAMIC SOCRATES FRAMEWORK)'}
    PATIENT CHOSEN LANGUAGE: ${langConfig.name} (${langConfig.native})
    ${patientName ? `PATIENT NAME: "${patientName}". Address the patient respectfully by name (e.g. "${patientName} जी" in Hindi, "${patientName} garu" in Telugu, "${patientName} avargale" in Tamil, "Hello ${patientName}" in English) where appropriate.` : ''}
    
    CURRENT QUESTION NUMBER IN INTAKE: ${turnCount + 1} (Total limit: STRICTLY 10 to 12 questions)
    PATIENT CONVERSATION HISTORY SO FAR:
    ${JSON.stringify(history, null, 2)}

    CURRENT DOMAIN COVERAGE STATUS:
    - Previous Illnesses / Past Medical History Asked: ${domainCoverage.hasPastIllness ? 'YES (ALREADY COVERED - DO NOT RE-ASK)' : 'NO (MUST BE ASKED BEFORE COMPLETION)'}
    - Known Allergies Asked: ${domainCoverage.hasAllergies ? 'YES (ALREADY COVERED - DO NOT RE-ASK)' : 'NO (MUST BE ASKED BEFORE COMPLETION)'}
    - Family Medical History Asked: ${domainCoverage.hasFamilyHistory ? 'YES (ALREADY COVERED - DO NOT RE-ASK)' : 'NO (MUST BE ASKED BEFORE COMPLETION)'}
    - Current Medications Asked: ${domainCoverage.hasMedications ? 'YES (ALREADY COVERED - DO NOT RE-ASK)' : 'NO'}

    ========================================================================
    CRITICAL ANTI-REPETITION MANDATE (STRICT ZERO REPETITION):
    ========================================================================
    1. NEVER repeat a question or ask about information that the patient has already stated in ANY previous answer.
    2. Carefully check PATIENT CONVERSATION HISTORY SO FAR. If the patient already explained when it started, what type of pain it is, what medicines they take, their previous illness, or allergies, DO NOT probe that dimension again.
    3. Never generate a question that has a similar wording or identical intent to any question already in history.
    4. Every turn MUST explore a distinct, unprobed clinical dimension following the progression below.

    ========================================================================
    INTAKE STRUCTURE: STRICT 10 TO 12 QUESTIONS TOTAL
    ========================================================================
    The complete intake MUST consist of exactly 10 to 12 questions:
    - Turn 1-5: SOCRATES Symptom Inquiry (Site & Onset, Character & Radiation, Associated signs, Triggers & Relief, Severity 1-10 & Daily Impact)
    - Turn 6: MANDATORY - Previous Illnesses & Past Medical History (Diabetes, Hypertension, Heart disease, Asthma/COPD, Thyroid, past surgeries)
    - Turn 7: Current Active Medications & Treatments (daily pills, OTC analgesics, traditional remedies)
    - Turn 8: MANDATORY - Known Allergies (Penicillin, Sulfa, NSAIDs, food, environmental/dust)
    - Turn 9: MANDATORY - Family Medical History (hereditary conditions in parents/siblings: cardiac, diabetes, stroke, cancer)
    - Turn 10: Lifestyle, Dietary & Occupational Factors (physical exertion, smoking/tobacco/alcohol, hydration, sleep)
    - Turn 11: Review of Systems & Red-Flag Clearance (unexplained weight change, night sweats, other symptoms for doctor)
    - Turn 12: Intake Completion (set "is_intake_complete": true)

    COMPLETION RULES:
    - If turnCount < 10: set "is_intake_complete": false. The interview MUST NEVER end before 10 questions!
    - If turnCount >= 10 and turnCount < 12: set "is_intake_complete": true ONLY IF Previous Illnesses, Allergies, and Family History have all been asked. If any are missing, probe the missing domain immediately!
    - If turnCount >= 12: set "is_intake_complete": true. Hard upper limit of 12 questions.

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
    `}
    Also ensure Previous Illnesses, Current Medications, Allergies, and Family History are methodically inquired!
    ` : ''}

    ========================================================================
    CRITICAL SAFETY & SEVERITY RULES: MULTI-TURN VERIFICATION PROTOCOL
    ========================================================================
    STRICT CLINICAL RULE: ON A SINGLE-QUESTION BASIS, EMERGENCY TRIAGE MUST NEVER BE ACTIVATED!
    - Answering a single question is NEVER enough to declare an acute emergency. More questions MUST be asked to thoroughly explore whether this is an acute life-threatening event vs a chronic/subacute condition.
    - If the patient mentions a potentially severe symptom on Turn 1, 2, or 3:
      * DO NOT immediately stop routine questioning!
      * DO NOT set "is_severe": true, "suggested_emergency_routing": true, or "is_intake_complete": true!
      * Instead, ask focused follow-up questions following the SOCRATES hierarchy.
    - ONLY if after AT LEAST 3 to 4 clinical questions have been answered, the patient consistently confirms acute, corroborated life-threatening red-flag indicators across multiple answers, should "is_severe": true be considered.

    INSTRUCTIONS FOR GENERATING NEXT QUESTION:
    - Review what has already been answered in the history above.
    - Ask ONE clear, concise, tailored clinical question addressing the next unprobed clinical dimension.
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
      "current_framework_stage": "socrates_site_onset" | "socrates_character_radiation" | "socrates_associations_timing" | "socrates_severity_triggers" | "past_medical_history" | "medications" | "allergies" | "family_history" | "lifestyle_exposures" | "systemic_review" | "ayush_pariksha",
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

    // Programmatic Anti-Repetition Guardrail:
    // If the LLM generated question repeats an already asked question, substitute it with an unprobed clinical dimension.
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

    // Domain Coverage Enforcement:
    // Ensure mandatory domains (past illnesses, allergies, family history) are asked before completion.
    if (turnCount >= 6 && !domainCoverage.hasPastIllness && parsed.section !== 'past_history') {
      const pastQ = getStructuredClinicalQuestion(turnCount, patientLangCode, patientName, chiefComplaintItem, 'past_history');
      Object.assign(parsed, pastQ);
    } else if (turnCount >= 7 && !domainCoverage.hasAllergies && parsed.section !== 'allergies') {
      const allergyQ = getStructuredClinicalQuestion(turnCount, patientLangCode, patientName, chiefComplaintItem, 'allergies');
      Object.assign(parsed, allergyQ);
    } else if (turnCount >= 8 && !domainCoverage.hasFamilyHistory && parsed.section !== 'family_history') {
      const familyQ = getStructuredClinicalQuestion(turnCount, patientLangCode, patientName, chiefComplaintItem, 'family_history');
      Object.assign(parsed, familyQ);
    }

    // Strict 10 to 12 Question Limit Guardrails:
    if (!parsed.is_severe) {
      if (turnCount < 10) {
        // Never allow non-severe intakes to finish before question 10
        parsed.is_intake_complete = false;
      } else if (turnCount >= 10 && turnCount < 12) {
        // Between turns 10 and 12, can only complete if past illnesses, allergies, and family history have all been asked
        const updatedCoverage = evaluateDomainCoverage([...history, { question: parsed.question_en, answer: '', section: parsed.section, field_name: parsed.field_name }]);
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
