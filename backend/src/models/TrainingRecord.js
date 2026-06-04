const mongoose = require('mongoose');

const trainingRecordSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subject: { type: String, required: true, trim: true },
  duration: { type: String, trim: true }, // e.g. "2 days", "8 hours"
  date: { type: Date, required: true },
  trainerName: { type: String, trim: true },
  certificateIssued: { type: Boolean, default: false },
  expiryDate: { type: Date },
}, { timestamps: true });

trainingRecordSchema.index({ companyId: 1, employeeId: 1 });

module.exports = mongoose.model('TrainingRecord', trainingRecordSchema);
