const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', default: null },
  date: { type: Date, required: true },
  type: {
    type: String,
    enum: ['travel', 'local_travel', 'food', 'accommodation', 'other'],
    required: true,
  },
  amount: { type: Number, required: true },
  description: { type: String, trim: true },
  billAttachment: { type: String }, // file path
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  approvedAt: { type: Date, default: null },
  rejectionReason: { type: String, trim: true, default: null },
}, { timestamps: true });

expenseSchema.index({ companyId: 1, employeeId: 1 });
expenseSchema.index({ companyId: 1, clientId: 1 });
expenseSchema.index({ companyId: 1, status: 1 });

module.exports = mongoose.model('Expense', expenseSchema);
