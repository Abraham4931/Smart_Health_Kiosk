/**
 * Health insight from vitals. Supports Google Gemini and OpenAI-style APIs.
 * Set LLM_PROVIDER=gemini and LLM_API_KEY=your_google_api_key for Gemini.
 */

const GEMINI_PROMPT = `You are a health assistant. Given vital signs, reply with ONLY a valid JSON object (no markdown, no extra text):
{"summaryText":"2-3 sentence plain-language summary","riskLevel":"low|moderate|high|critical","conditionCategory":"e.g. normal, hypertension, respiratory concern, obesity","preventiveAdvice":"1-2 sentences of advice"}

Use WHO norms: BP 90-120/60-80, HR 60-100, SpO2 95-100%, Temp 36.1-37.2°C, BMI 18.5-24.9. This is NOT a diagnosis; do not replace a doctor.
If most values are N/A or only one vital (e.g. height only) was measured, say so in summaryText and suggest measuring more vitals for a fuller assessment; do not claim "all vital signs are within normal ranges" when most data is missing.
Important: Output must be valid JSON. Use only double quotes for strings; escape any quote inside a string with backslash (e.g. \\"). Keep summaryText and preventiveAdvice to 1-2 short sentences each.`;

/** True if at least one vital was measured (weight 0 counts as not measured). */
function hasAnyVital(v) {
  if (!v || typeof v !== 'object') return false;
  if (v.systolicBP != null || v.diastolicBP != null) return true;
  if (v.heartRate != null || v.spo2 != null) return true;
  if (v.temperatureCelsius != null) return true;
  if (v.heightCm != null) return true;
  if (v.weightKg != null && v.weightKg !== 0) return true;
  if (v.bmi != null) return true;
  return false;
}

async function analyzeVitals(vitals, patientHistory) {
  const provider = process.env.LLM_PROVIDER || (process.env.LLM_API_KEY?.startsWith('AIza') ? 'gemini' : 'openai');
  const apiKey = process.env.LLM_API_KEY;

  // Default/fallback only when nothing was measured
  if (!hasAnyVital(vitals)) {
    console.log('[LLM] Skipping LLM: no vitals measured');
    return generateFallbackInsight(vitals, true);
  }
  // No API key: use rule-based fallback even when vitals exist
  if (!apiKey || apiKey === 'your_llm_api_key') {
    console.log('[LLM] Skipping LLM: API key missing or placeholder');
    return generateFallbackInsight(vitals, false);
  }

  console.log('[LLM] Calling Gemini for analysis (vitals present)');
  const userMessage = `Latest vitals:
Systolic/Diastolic BP: ${vitals.systolicBP ?? 'N/A'}/${vitals.diastolicBP ?? 'N/A'} mmHg
Heart Rate: ${vitals.heartRate ?? 'N/A'} bpm | SpO2: ${vitals.spo2 ?? 'N/A'}%
Temperature: ${vitals.temperatureCelsius ?? 'N/A'}°C | Weight: ${vitals.weightKg ?? 'N/A'} kg | Height: ${vitals.heightCm ?? 'N/A'} cm | BMI: ${vitals.bmi ?? 'N/A'}
${patientHistory?.length ? `Recent history: ${JSON.stringify(patientHistory)}` : ''}

Reply with only the JSON object.`;

  try {
    if (provider === 'gemini') {
      return await callGemini(apiKey, userMessage);
    }
    return await callOpenAI(apiKey, userMessage);
  } catch (err) {
    console.error('[LLM] API error, using fallback:', err.message);
    return generateFallbackInsight(vitals, false, err.message);
  }
}

const GEMINI_DEFAULT_MODEL = 'gemini-2.5-flash';
const GEMINI_DEPRECATED_MODELS = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.0-pro'];

function getGeminiModel() {
  const envModel = process.env.LLM_MODEL || GEMINI_DEFAULT_MODEL;
  if (GEMINI_DEPRECATED_MODELS.includes(envModel)) {
    console.log('[LLM] Model', envModel, 'is deprecated; using', GEMINI_DEFAULT_MODEL);
    return GEMINI_DEFAULT_MODEL;
  }
  return envModel;
}

async function callGemini(apiKey, userMessage) {
  const model = getGeminiModel();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: `${GEMINI_PROMPT}\n\n${userMessage}` }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1024,
      },
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini ${res.status}: ${errText}`);
  }
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (text == null || String(text).trim() === '') {
    const finishReason = data.candidates?.[0]?.finishReason;
    const blockReason = finishReason && finishReason !== 'STOP' ? ` finishReason=${finishReason}` : '';
    const promptFeedback = data.promptFeedback ? ` promptFeedback=${JSON.stringify(data.promptFeedback)}` : '';
    console.error('[LLM] Gemini returned no text.', blockReason, promptFeedback);
    throw new Error(`No text in Gemini response${blockReason || promptFeedback || ' (empty or blocked)'}`);
  }
  try {
    return parseJsonInsight(String(text));
  } catch (e) {
    console.error('[LLM] Gemini JSON parse failed. Raw response (first 500 chars):', String(text).slice(0, 500));
    throw new Error(`Invalid JSON from Gemini: ${e.message}`);
  }
}

async function callOpenAI(apiKey, userMessage) {
  const apiUrl = process.env.LLM_API_URL || 'https://api.openai.com/v1/chat/completions';
  const model = process.env.LLM_MODEL || 'gpt-4';
  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: GEMINI_PROMPT },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.3,
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI ${res.status}: ${errText}`);
  }
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('No content in OpenAI response');
  return parseJsonInsight(text);
}

function parseJsonInsight(text) {
  if (text == null || typeof text !== 'string') throw new Error('Empty or invalid JSON');
  let cleaned = text.replace(/```json\s*|\s*```/g, '').trim();
  const firstBrace = cleaned.indexOf('{');
  if (firstBrace !== -1) {
    const lastBrace = cleaned.lastIndexOf('}');
    if (lastBrace > firstBrace) cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    parsed = parseJsonInsightFallback(cleaned);
    if (!parsed) throw e;
  }
  if (!parsed || typeof parsed !== 'object') throw new Error('Empty or invalid JSON');
  return {
    summaryText: String(parsed.summaryText ?? 'Summary not available.').trim() || 'Summary not available.',
    riskLevel: ['low', 'moderate', 'high', 'critical'].includes(parsed.riskLevel) ? parsed.riskLevel : 'low',
    conditionCategory: String(parsed.conditionCategory ?? 'normal').trim() || 'normal',
    preventiveAdvice: String(parsed.preventiveAdvice ?? 'Consult a healthcare provider for personalized advice.').trim() || 'Consult a healthcare provider for personalized advice.',
    isRuleBased: false,
  };
}

/** When JSON.parse fails (e.g. unterminated string), try to extract fields with regex. */
function parseJsonInsightFallback(cleaned) {
  const out = {};
  const riskMatch = cleaned.match(/"riskLevel"\s*:\s*"([^"]*)"/);
  if (riskMatch) out.riskLevel = riskMatch[1].trim();
  const catMatch = cleaned.match(/"conditionCategory"\s*:\s*"([^"]*)"/);
  if (catMatch) out.conditionCategory = catMatch[1].trim();
  const sumMatch = cleaned.match(/"summaryText"\s*:\s*"((?:[^"\\]|\\.)*?)"\s*,\s*"riskLevel"/)
    || cleaned.match(/"summaryText"\s*:\s*"((?:[\s\S])*?)(?="\s*,\s*"riskLevel")/);
  if (sumMatch) out.summaryText = sumMatch[1].replace(/\\./g, (m) => (m === '\\n' ? '\n' : m === '\\"' ? '"' : m)).trim();
  const advMatch = cleaned.match(/"preventiveAdvice"\s*:\s*"((?:[^"\\]|\\.)*?)"\s*}/)
    || cleaned.match(/"preventiveAdvice"\s*:\s*"((?:[\s\S])*?)"\s*}\s*$/);
  if (advMatch) out.preventiveAdvice = advMatch[1].replace(/\\./g, (m) => (m === '\\n' ? '\n' : m === '\\"' ? '"' : m)).trim();
  if (out.riskLevel || out.conditionCategory || out.summaryText || out.preventiveAdvice) return out;
  return null;
}

function generateFallbackInsight(vitals, nothingMeasured, llmErrorMessage) {
  const v = vitals || {};

  if (nothingMeasured) {
    return {
      summaryText: 'No measurements to analyze. Complete at least one vital sign measurement for an AI health summary.',
      riskLevel: 'low',
      conditionCategory: 'normal',
      preventiveAdvice: 'Use the kiosk to measure blood pressure, height, weight, SpO2, heart rate, or temperature, then request analysis again.',
      isRuleBased: true,
    };
  }

  const issues = [];
  let riskLevel = 'low';

  const systolic = v.systolicBP;
  const diastolic = v.diastolicBP;
  if (systolic != null && diastolic != null) {
    if (systolic > 140 || diastolic > 90) {
      issues.push('elevated blood pressure');
      riskLevel = systolic > 180 ? 'critical' : 'high';
    }
  }
  if (v.spo2 != null && v.spo2 < 95) {
    issues.push('low oxygen saturation');
    riskLevel = v.spo2 < 90 ? 'critical' : 'high';
  }
  if (v.heartRate != null) {
    if (v.heartRate > 100) issues.push('elevated heart rate');
    if (v.heartRate < 60) issues.push('low heart rate');
  }
  if (v.temperatureCelsius != null && v.temperatureCelsius > 37.5) {
    issues.push('elevated temperature');
    if (riskLevel === 'low') riskLevel = 'moderate';
  }
  if (v.bmi != null && v.bmi > 30) {
    issues.push('BMI indicates obesity');
    if (riskLevel === 'low') riskLevel = 'moderate';
  }

  const conditionCategory = issues.length === 0
    ? 'normal'
    : issues.includes('elevated blood pressure')
      ? 'hypertension'
      : issues.includes('low oxygen saturation')
        ? 'respiratory concern'
        : 'general concern';

  const ruleSummary = issues.length === 0
    ? 'All measured vital signs are within normal ranges.'
    : `Detected: ${issues.join(', ')}. Please consult a healthcare professional for proper evaluation.`;

  // When LLM was attempted but failed, show that clearly so user knows it's not the AI
  const summaryText = llmErrorMessage
    ? `AI analysis could not be completed. (${llmErrorMessage}) The following is a basic summary: ${ruleSummary}`
    : ruleSummary;

  return {
    summaryText,
    riskLevel,
    conditionCategory,
    preventiveAdvice: issues.length === 0
      ? 'Continue maintaining a healthy lifestyle with regular exercise and balanced diet.'
      : 'Schedule a follow-up with a healthcare provider. Monitor your vitals regularly.',
    isRuleBased: true,
  };
}

module.exports = { analyzeVitals };
