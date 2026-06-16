const User = require('../models/User');

// Helper: filter out employees who have left
const activeFilter = () => ({
  $or: [
    { dateOfLeaving: null },
    { dateOfLeaving: { $gt: new Date() } },
  ]
});

exports.list = async (req, res) => {
  try {
    const filter = { companyId: req.companyId };
    if (req.query.role) filter.role = req.query.role;

    // If fetching employees, exclude those who have left (unless ?includeLeft=true)
    if (req.query.role === 'employee' && req.query.includeLeft !== 'true') {
      filter.status = 'active';
      Object.assign(filter, activeFilter());
    }

    const users = await User.find(filter).select('-password').sort({ name: 1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id, companyId: req.companyId }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, email, password, role, designation, dateOfJoining, dateOfLeaving, qualifications, color } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'Missing required fields' });
    const user = await User.create({
      companyId: req.companyId,
      name, email, password,
      role: role || 'employee',
      designation, dateOfJoining, dateOfLeaving, qualifications,
      color: color || '#2563eb',
    });
    res.status(201).json({ ...user.toObject(), password: undefined });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Email already exists' });
    res.status(500).json({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { password, ...rest } = req.body;
    const user = await User.findOne({ _id: req.params.id, companyId: req.companyId });
    if (!user) return res.status(404).json({ message: 'User not found' });
    Object.assign(user, rest);
    if (password) user.password = password;
    // If dateOfLeaving is set and in the past, auto-set status to inactive
    if (rest.dateOfLeaving && new Date(rest.dateOfLeaving) < new Date()) {
      user.status = 'inactive';
    }
    await user.save();
    const updated = await User.findById(user._id).select('-password');
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.toggleStatus = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id, companyId: req.companyId });
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.status = user.status === 'active' ? 'inactive' : 'active';
    await user.save();
    res.json({ status: user.status });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};