const Standard = require('../models/Standard');
const Stage = require('../models/Stage');

// ---- STANDARDS ----
exports.listStandards = async (req, res) => {
  try {
    const standards = await Standard.find({ companyId: req.companyId }).sort({ name: 1 });
    res.json(standards);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createStandard = async (req, res) => {
  try {
    const standard = await Standard.create({ ...req.body, companyId: req.companyId });
    res.status(201).json(standard);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateStandard = async (req, res) => {
  try {
    const standard = await Standard.findOneAndUpdate(
      { _id: req.params.id, companyId: req.companyId },
      req.body,
      { new: true }
    );
    if (!standard) return res.status(404).json({ message: 'Standard not found' });
    res.json(standard);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteStandard = async (req, res) => {
  try {
    await Standard.findOneAndDelete({ _id: req.params.id, companyId: req.companyId });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---- STAGES ----
exports.listStages = async (req, res) => {
  try {
    const stages = await Stage.find({ companyId: req.companyId }).sort({ name: 1 });
    res.json(stages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createStage = async (req, res) => {
  try {
    const stage = await Stage.create({ ...req.body, companyId: req.companyId });
    res.status(201).json(stage);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateStage = async (req, res) => {
  try {
    const stage = await Stage.findOneAndUpdate(
      { _id: req.params.id, companyId: req.companyId },
      req.body,
      { new: true }
    );
    if (!stage) return res.status(404).json({ message: 'Stage not found' });
    res.json(stage);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteStage = async (req, res) => {
  try {
    await Stage.findOneAndDelete({ _id: req.params.id, companyId: req.companyId });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
