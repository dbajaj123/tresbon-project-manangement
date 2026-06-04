const mongoose = require('mongoose');

// Assignment of a standard to a client
const clientStandardSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  standardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Standard', required: true },
  contractStartDate: { type: Date },
  targetEndDate: { type: Date },
  status: { type: String, enum: ['not_started', 'in_progress', 'complete'], default: 'not_started' },
}, { timestamps: true });

clientStandardSchema.index({ companyId: 1, clientId: 1 });

// Assignment of a stage to a client-standard
const clientStandardStageSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  clientStandardId: { type: mongoose.Schema.Types.ObjectId, ref: 'ClientStandard', required: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  standardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Standard', required: true },
  stageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Stage', required: true },
  allottedManDays: { type: Number, required: true, default: 1 },
  status: { type: String, enum: ['not_started', 'in_progress', 'complete'], default: 'not_started' },
  // actualDays is computed dynamically from scheduler entries — not stored here
}, { timestamps: true });

clientStandardStageSchema.index({ companyId: 1, clientStandardId: 1 });
clientStandardStageSchema.index({ companyId: 1, clientId: 1, stageId: 1 });

const ClientStandard = mongoose.model('ClientStandard', clientStandardSchema);
const ClientStandardStage = mongoose.model('ClientStandardStage', clientStandardStageSchema);

module.exports = { ClientStandard, ClientStandardStage };
