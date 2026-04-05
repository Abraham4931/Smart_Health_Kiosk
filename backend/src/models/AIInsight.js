const mongoose = require('mongoose');

const aiInsightSchema = new mongoose.Schema({
  measurementId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Measurement',
    required: true,
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
  },
  summaryText: { type: String, required: true },
  riskLevel: {
    type: String,
    enum: ['low', 'moderate', 'high', 'critical'],
    default: 'low',
  },
  conditionCategory: { type: String, default: '' },
  preventiveAdvice: { type: String, default: '' },
  disclaimer: {
    type: String,
    default: 'This is a preliminary AI-generated insight and does NOT constitute a clinical diagnosis. Please consult a healthcare professional.',
  },
  isRuleBased: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('AIInsight', aiInsightSchema);
