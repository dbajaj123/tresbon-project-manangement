const SchedulerEntry = require('../models/SchedulerEntry');

// Get entries for a date range
exports.list = async (req, res) => {
  try {
    const { startDate, endDate, employeeId } = req.query;
    const filter = { companyId: req.companyId };
    if (startDate && endDate) {
      filter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    if (employeeId) filter.employeeId = employeeId;

    const entries = await SchedulerEntry.find(filter)
      .populate('employeeId', 'name designation')
      .populate('clientId', 'name')
      .populate('stageId', 'name')
      .populate('clientStandardId')
      .sort({ date: 1 });

    res.json(entries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { date, employeeId, clientId, clientStandardId, stageId, notes } = req.body;

    // Overbooking check: warn if employee has 3+ entries on same day
    const existingCount = await SchedulerEntry.countDocuments({
      companyId: req.companyId,
      employeeId,
      date: new Date(date),
    });
    const warning = existingCount >= 3 ? 'Employee already has multiple assignments on this day' : null;

    const entry = await SchedulerEntry.create({
      companyId: req.companyId,
      date: new Date(date),
      employeeId,
      clientId,
      clientStandardId,
      stageId,
      notes,
      createdBy: req.user._id,
    });

    const populated = await entry.populate([
      { path: 'employeeId', select: 'name designation' },
      { path: 'clientId', select: 'name' },
      { path: 'stageId', select: 'name' },
    ]);

    res.status(201).json({ entry: populated, warning });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const entry = await SchedulerEntry.findOne({ _id: req.params.id, companyId: req.companyId });
    if (!entry) return res.status(404).json({ message: 'Entry not found' });

    // Employees can only edit their own entries
    if (req.user.role === 'employee' && entry.employeeId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only edit your own schedule entries' });
    }

    Object.assign(entry, req.body, { updatedBy: req.user._id });
    await entry.save();
    res.json(entry);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const entry = await SchedulerEntry.findOne({ _id: req.params.id, companyId: req.companyId });
    if (!entry) return res.status(404).json({ message: 'Entry not found' });

    if (req.user.role === 'employee' && entry.employeeId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only delete your own schedule entries' });
    }

    await entry.deleteOne();
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
