const { Measurement, AIInsight, Patient } = require('../models');
const { analyzeVitals } = require('../services/llmService');
const { findNearbyHospitals } = require('../services/mapsService');

function normalizeVitals(vitals) {
  if (!vitals || typeof vitals !== 'object') return vitals;
  const out = { ...vitals };
  // Treat weight 0 as no sensor (store null like other missing params)
  if (out.weightKg === 0) out.weightKg = null;
  return out;
}

exports.createMeasurement = async (req, res) => {
  try {
    const patientId = req.user.id;
    const { kioskId, vitals, measuredAt } = req.body;

    const measurement = await Measurement.create({
      patientId,
      kioskId,
      vitals: normalizeVitals(vitals),
      measuredAt: measuredAt || new Date(),
      syncStatus: 'synced',
    });

    res.status(201).json({ measurement });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.analyzeAndSuggest = async (req, res) => {
  try {
    const { measurementId, latitude, longitude } = req.body;
    const patientId = req.user.id;

    const measurement = await Measurement.findOne({ _id: measurementId, patientId });
    if (!measurement) return res.status(404).json({ error: 'Measurement not found' });

    const history = await Measurement.find({ patientId })
      .sort({ measuredAt: -1 })
      .skip(1)
      .limit(3)
      .lean();

    const historyVitals = history.map(h => h.vitals);
    const llmResult = await analyzeVitals(measurement.vitals, historyVitals);

    const insight = await AIInsight.create({
      measurementId: measurement._id,
      patientId,
      summaryText: llmResult.summaryText,
      riskLevel: llmResult.riskLevel,
      conditionCategory: llmResult.conditionCategory,
      preventiveAdvice: llmResult.preventiveAdvice,
      isRuleBased: llmResult.isRuleBased === true,
    });

    const lat = latitude || 0;
    const lng = longitude || 0;
    const hospitals = await findNearbyHospitals(lat, lng, llmResult.conditionCategory);

    res.json({ insight, hospitals });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getMyMeasurements = async (req, res) => {
  try {
    const measurements = await Measurement.find({ patientId: req.user.id })
      .sort({ measuredAt: -1 })
      .limit(50);
    res.json({ measurements });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getPatientMeasurements = async (req, res) => {
  try {
    const { patientId } = req.params;
    const measurements = await Measurement.find({ patientId })
      .sort({ measuredAt: -1 })
      .limit(50);
    res.json({ measurements });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
