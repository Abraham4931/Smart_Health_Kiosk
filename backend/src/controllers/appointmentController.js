const { Appointment, PatientHospitalAccess, Measurement, AIInsight, Patient } = require('../models');
const { notifyHospital, notifyPatient } = require('../services/socketService');

exports.createAppointment = async (req, res) => {
  try {
    const patientId = req.user.id;
    const { hospitalId, measurementId, aiInsightId, bookingFee, paymentMethod, conditionLabel } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'Receipt image is required' });
    }

    const appointment = await Appointment.create({
      patientId,
      hospitalId,
      measurementId,
      aiInsightId: aiInsightId || null,
      receiptImageUrl: `/uploads/${req.file.filename}`,
      bookingFee: Number(bookingFee),
      paymentMethod,
      conditionLabel: conditionLabel || '',
    });

    const patient = await Patient.findById(patientId, 'name phone');

    notifyHospital(hospitalId, 'new_appointment_request', {
      appointmentId: appointment._id,
      patientName: patient.name,
      patientPhone: patient.phone,
      conditionLabel: appointment.conditionLabel,
      bookingFee: appointment.bookingFee,
      receiptImageUrl: appointment.receiptImageUrl,
    });

    res.status(201).json({ appointment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getMyAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({ patientId: req.user.id })
      .populate('hospitalId', 'name address specializations imageUrl')
      .sort({ createdAt: -1 });
    res.json({ appointments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getHospitalAppointments = async (req, res) => {
  try {
    const hospitalId = req.user.hospitalId;
    if (!hospitalId) return res.status(403).json({ error: 'No hospital assigned' });

    const { status } = req.query;
    const filter = { hospitalId };
    if (status) filter.status = status;

    const appointments = await Appointment.find(filter)
      .populate('patientId', 'name phone address')
      .sort({ createdAt: -1 });

    res.json({ appointments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.reviewAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, rejectionReason, appointmentDate } = req.body;
    const hospitalId = req.user.hospitalId;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Action must be approve or reject' });
    }

    const appointment = await Appointment.findById(id);
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });
    if (appointment.hospitalId.toString() !== hospitalId) {
      return res.status(403).json({ error: 'Not authorized for this appointment' });
    }
    if (appointment.status !== 'pending') {
      return res.status(400).json({ error: 'Appointment already reviewed' });
    }

    appointment.status = action === 'approve' ? 'approved' : 'rejected';
    appointment.reviewedBy = req.user.id;
    appointment.reviewedAt = new Date();
    if (action === 'approve' && appointmentDate) {
      appointment.appointmentDate = new Date(appointmentDate);
    }
    if (action === 'reject') {
      appointment.rejectionReason = rejectionReason || '';
    }
    await appointment.save();

    if (action === 'approve') {
      await PatientHospitalAccess.create({
        patientId: appointment.patientId,
        hospitalId: appointment.hospitalId,
        appointmentId: appointment._id,
      });

      const measurement = await Measurement.findById(appointment.measurementId);
      const insight = appointment.aiInsightId
        ? await AIInsight.findById(appointment.aiInsightId)
        : null;
      const patient = await Patient.findById(appointment.patientId);

      notifyHospital(hospitalId, 'patient_data_granted', {
        appointmentId: appointment._id,
        patient,
        measurement,
        insight,
      });
    }

    notifyPatient(appointment.patientId.toString(), 'appointment_update', {
      appointmentId: appointment._id,
      status: appointment.status,
      appointmentDate: appointment.appointmentDate,
    });

    res.json({ appointment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getHospitalPatients = async (req, res) => {
  try {
    const hospitalId = req.user.hospitalId;
    if (!hospitalId) return res.status(403).json({ error: 'No hospital assigned' });

    const accessRecords = await PatientHospitalAccess.find({
      hospitalId,
      status: 'active',
    }).populate('patientId appointmentId');

    const patientIds = accessRecords.map(a => a.patientId._id);

    const measurements = await Measurement.find({ patientId: { $in: patientIds } })
      .sort({ measuredAt: -1 })
      .lean();

    const insights = await AIInsight.find({ patientId: { $in: patientIds } })
      .sort({ createdAt: -1 })
      .lean();

    const patients = accessRecords.map(record => {
      const pid = record.patientId._id.toString();
      return {
        patient: record.patientId,
        appointment: record.appointmentId,
        measurements: measurements.filter(m => m.patientId.toString() === pid),
        insights: insights.filter(i => i.patientId.toString() === pid),
      };
    });

    res.json({ patients });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
