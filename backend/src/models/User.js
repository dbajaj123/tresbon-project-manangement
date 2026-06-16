const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['superadmin', 'admin', 'employee'], default: 'employee' },
  designation: { type: String, trim: true },
  dateOfJoining: { type: Date },
  dateOfLeaving: { type: Date, default: null },
  qualifications: { type: String },
  color: { type: String, default: '#2563eb' },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function (plain) {
  return bcrypt.compare(plain, this.password);
};

// Virtual: is the employee currently active (not left)
userSchema.virtual('isActive').get(function () {
  if (this.status === 'inactive') return false;
  if (this.dateOfLeaving && new Date(this.dateOfLeaving) < new Date()) return false;
  return true;
});

userSchema.index({ companyId: 1, email: 1 }, { unique: true });

module.exports = mongoose.model('User', userSchema);