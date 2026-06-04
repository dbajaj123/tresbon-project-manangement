const mongoose = require('mongoose');

const schedulerEntrySchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  date: { type: Date, required: true },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  clientStandardId: { type: mongoose.Schema.Types.ObjectId, ref: 'ClientStandard', required: true },
  stageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Stage', required: true },
  notes: { type: String, trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

schedulerEntrySchema.index({ companyId: 1, date: 1 });
schedulerEntrySchema.index({ companyId: 1, employeeId: 1, date: 1 });
schedulerEntrySchema.index({ companyId: 1, clientId: 1, stageId: 1 });

module.exports = mongoose.model('SchedulerEntry', schedulerEntrySchema);
