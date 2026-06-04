const mongoose = require('mongoose');

const standardSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
}, { timestamps: true });

standardSchema.index({ companyId: 1 });

module.exports = mongoose.model('Standard', standardSchema);
