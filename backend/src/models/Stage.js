const mongoose = require('mongoose');

const stageSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  name: { type: String, required: true, trim: true },
  defaultManDays: { type: Number, default: 1 },
}, { timestamps: true });

stageSchema.index({ companyId: 1 });

module.exports = mongoose.model('Stage', stageSchema);
