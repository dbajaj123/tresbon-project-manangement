const Client = require('../models/Client');
const { ClientStandard, ClientStandardStage } = require('../models/ClientStandard');

exports.list = async (req, res) => {
  try {
    const clients = await Client.find({ companyId: req.companyId }).sort({ name: 1 });
    res.json(clients);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    const client = await Client.findOne({ _id: req.params.id, companyId: req.companyId });
    if (!client) return res.status(404).json({ message: 'Client not found' });

    const standards = await ClientStandard.find({ clientId: client._id })
      .populate('standardId', 'name description');

    const standardsWithStages = await Promise.all(standards.map(async (cs) => {
      const stages = await ClientStandardStage.find({ clientStandardId: cs._id })
        .populate('stageId', 'name');
      return { ...cs.toObject(), stages };
    }));

    res.json({ ...client.toObject(), standards: standardsWithStages });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const client = await Client.create({ ...req.body, companyId: req.companyId });
    res.status(201).json(client);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const client = await Client.findOneAndUpdate(
      { _id: req.params.id, companyId: req.companyId },
      req.body,
      { new: true }
    );
    if (!client) return res.status(404).json({ message: 'Client not found' });
    res.json(client);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.toggleStatus = async (req, res) => {
  try {
    const client = await Client.findOne({ _id: req.params.id, companyId: req.companyId });
    if (!client) return res.status(404).json({ message: 'Client not found' });
    client.status = client.status === 'active' ? 'inactive' : 'active';
    await client.save();
    res.json(client);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Assign a standard to a client
exports.assignStandard = async (req, res) => {
  try {
    const { standardId, contractStartDate, targetEndDate } = req.body;
    const existing = await ClientStandard.findOne({
      clientId: req.params.id, standardId, companyId: req.companyId
    });
    if (existing) return res.status(400).json({ message: 'Standard already assigned to this client' });

    const cs = await ClientStandard.create({
      companyId: req.companyId,
      clientId: req.params.id,
      standardId,
      contractStartDate,
      targetEndDate,
    });
    res.status(201).json(cs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Assign stages to a client-standard
exports.assignStages = async (req, res) => {
  try {
    const { clientStandardId, stages } = req.body;
    // stages = [{ stageId, allottedManDays }]
    const cs = await ClientStandard.findOne({ _id: clientStandardId, companyId: req.companyId });
    if (!cs) return res.status(404).json({ message: 'Client-Standard not found' });

    const created = await Promise.all(stages.map(({ stageId, allottedManDays }) =>
      ClientStandardStage.findOneAndUpdate(
        { companyId: req.companyId, clientStandardId, stageId },
        {
          companyId: req.companyId,
          clientStandardId,
          clientId: cs.clientId,
          standardId: cs.standardId,
          stageId,
          allottedManDays: allottedManDays || 1,
        },
        { upsert: true, new: true }
      )
    ));
    res.json(created);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update stage status or man days
exports.updateStage = async (req, res) => {
  try {
    const stage = await ClientStandardStage.findOneAndUpdate(
      { _id: req.params.stageId, companyId: req.companyId },
      req.body,
      { new: true }
    );
    if (!stage) return res.status(404).json({ message: 'Stage not found' });
    res.json(stage);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
