const Expense = require('../models/Expense');
const path = require('path');

exports.list = async (req, res) => {
  try {
    const filter = { companyId: req.companyId };
    if (req.user.role === 'employee') filter.employeeId = req.user._id;
    if (req.query.employeeId && req.user.role === 'admin') filter.employeeId = req.query.employeeId;
    if (req.query.clientId) filter.clientId = req.query.clientId;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.startDate && req.query.endDate) {
      filter.date = { $gte: new Date(req.query.startDate), $lte: new Date(req.query.endDate) };
    }

    const expenses = await Expense.find(filter)
      .populate('employeeId', 'name designation')
      .populate('clientId', 'name')
      .populate('approvedBy', 'name')
      .sort({ date: -1 });
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const data = {
      ...req.body,
      companyId: req.companyId,
      employeeId: req.user._id,
    };
    if (req.file) data.billAttachment = req.file.filename;

    const expense = await Expense.create(data);
    res.status(201).json(expense);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const expense = await Expense.findOne({ _id: req.params.id, companyId: req.companyId });
    if (!expense) return res.status(404).json({ message: 'Expense not found' });

    // Only owner can edit, and only if still pending
    if (req.user.role === 'employee') {
      if (expense.employeeId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
      if (expense.status !== 'pending') {
        return res.status(400).json({ message: 'Cannot edit a processed expense' });
      }
    }

    Object.assign(expense, req.body);
    if (req.file) expense.billAttachment = req.file.filename;
    await expense.save();
    res.json(expense);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.approve = async (req, res) => {
  try {
    const { action, rejectionReason } = req.body; // action: 'approve' | 'reject'
    const expense = await Expense.findOne({ _id: req.params.id, companyId: req.companyId });
    if (!expense) return res.status(404).json({ message: 'Expense not found' });

    if (action === 'approve') {
      expense.status = 'approved';
      expense.approvedBy = req.user._id;
      expense.approvedAt = new Date();
    } else if (action === 'reject') {
      expense.status = 'rejected';
      expense.rejectionReason = rejectionReason || 'Rejected';
    } else {
      return res.status(400).json({ message: 'Invalid action' });
    }
    await expense.save();
    res.json(expense);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAttachment = async (req, res) => {
  try {
    const expense = await Expense.findOne({ _id: req.params.id, companyId: req.companyId });
    if (!expense || !expense.billAttachment) return res.status(404).json({ message: 'File not found' });
    const filePath = path.join(__dirname, '../../uploads', expense.billAttachment);
    res.sendFile(filePath);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
