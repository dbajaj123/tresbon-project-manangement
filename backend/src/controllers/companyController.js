const Company = require('../models/Company');
const User = require('../models/User');

exports.list = async (req, res) => {
  try {
    const companies = await Company.find().sort({ createdAt: -1 });
    // Attach employee count
    const result = await Promise.all(companies.map(async (c) => {
      const employeeCount = await User.countDocuments({ companyId: c._id, role: 'employee' });
      return { ...c.toObject(), employeeCount };
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, email, phone, address, adminName, adminEmail, adminPassword } = req.body;
    if (!name || !email || !adminName || !adminEmail || !adminPassword) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const existing = await Company.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Company email already exists' });

    const company = await Company.create({ name, email, phone, address });

    const admin = await User.create({
      companyId: company._id,
      name: adminName,
      email: adminEmail,
      password: adminPassword,
      role: 'admin',
    });

    res.status(201).json({ company, admin: { _id: admin._id, name: admin.name, email: admin.email } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const company = await Company.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!company) return res.status(404).json({ message: 'Company not found' });
    res.json(company);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.toggleStatus = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ message: 'Company not found' });
    company.status = company.status === 'active' ? 'inactive' : 'active';
    await company.save();
    res.json(company);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ message: 'Company not found' });
    const userCounts = await User.aggregate([
      { $match: { companyId: company._id } },
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);
    res.json({ ...company.toObject(), userCounts });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
