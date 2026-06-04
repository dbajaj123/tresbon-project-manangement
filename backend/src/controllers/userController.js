const User = require('../models/User');

exports.list = async (req, res) => {
  try {
    const filter = { companyId: req.companyId };
    if (req.query.role) filter.role = req.query.role;
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
    const { name, email, password, role, designation, dateOfJoining, qualifications } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'Missing required fields' });
    // Only admin can create employees; superadmin handled via company creation
    const user = await User.create({
      companyId: req.companyId,
      name, email, password,
      role: role || 'employee',
      designation, dateOfJoining, qualifications,
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
    if (password) user.password = password; // triggers pre-save hash
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
