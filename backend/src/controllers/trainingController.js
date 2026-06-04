const TrainingRecord = require('../models/TrainingRecord');

exports.list = async (req, res) => {
  try {
    const filter = { companyId: req.companyId };
    if (req.query.employeeId) filter.employeeId = req.query.employeeId;
    // Employees see only their own
    if (req.user.role === 'employee') filter.employeeId = req.user._id;

    const records = await TrainingRecord.find(filter)
      .populate('employeeId', 'name designation')
      .sort({ date: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const record = await TrainingRecord.create({ ...req.body, companyId: req.companyId });
    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const record = await TrainingRecord.findOneAndUpdate(
      { _id: req.params.id, companyId: req.companyId },
      req.body,
      { new: true }
    );
    if (!record) return res.status(404).json({ message: 'Record not found' });
    res.json(record);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    await TrainingRecord.findOneAndDelete({ _id: req.params.id, companyId: req.companyId });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
