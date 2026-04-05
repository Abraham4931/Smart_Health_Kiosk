/**
 * LLM (Gemini) test script. Run from backend folder:
 *   node test-llm.js
 *
 * Uses .env (LLM_API_KEY, LLM_PROVIDER, LLM_MODEL). Prints whether the
 * response came from the real LLM or the rule-based fallback.
 */
require('dotenv').config();
const { analyzeVitals } = require('./src/services/llmService');

const apiKey = process.env.LLM_API_KEY;
const provider = process.env.LLM_PROVIDER || (apiKey?.startsWith('AIza') ? 'gemini' : 'openai');
const keyStatus = !apiKey
  ? 'NOT SET'
  : apiKey === 'your_llm_api_key'
    ? 'PLACEHOLDER (invalid)'
    : 'SET (' + apiKey.substring(0, 8) + '...)';

console.log('--- LLM test ---');
console.log('LLM_API_KEY:', keyStatus);
console.log('LLM_PROVIDER:', provider);
console.log('LLM_MODEL:', process.env.LLM_MODEL || '(default)');
console.log('');

// Sample vitals (at least one present so LLM is attempted if key is set)
const sampleVitals = {
  systolicBP: 118,
  diastolicBP: 78,
  heartRate: 72,
  spo2: 98,
  temperatureCelsius: 36.6,
  weightKg: 75,
  heightCm: 183,
  bmi: 22.4,
};
const sampleHistory = [];

console.log('Calling analyzeVitals with sample vitals...');
console.log('Vitals:', JSON.stringify(sampleVitals, null, 2));
console.log('');

analyzeVitals(sampleVitals, sampleHistory)
  .then((result) => {
    console.log('--- Result ---');
    console.log('isRuleBased:', result.isRuleBased);
    console.log('riskLevel:', result.riskLevel);
    console.log('conditionCategory:', result.conditionCategory);
    console.log('summaryText:', result.summaryText);
    console.log('preventiveAdvice:', result.preventiveAdvice);
    console.log('');
    if (result.isRuleBased) {
      console.log('>>> This is the RULE-BASED fallback (no LLM or LLM failed).');
      console.log('    Set a valid LLM_API_KEY in .env to get real AI insights.');
    } else {
      console.log('>>> This is a real LLM (Gemini) response.');
    }
  })
  .catch((err) => {
    console.error('Test failed:', err.message);
    process.exit(1);
  });
