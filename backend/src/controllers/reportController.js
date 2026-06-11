const SchedulerEntry = require('../models/SchedulerEntry');
const { ClientStandard, ClientStandardStage } = require('../models/ClientStandard');
const Client = require('../models/Client');
const User = require('../models/User');
const TrainingRecord = require('../models/TrainingRecord');
const Expense = require('../models/Expense');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

// ---- DATA BUILDERS ----

async function buildClientReport(companyId, clientId, startDate, endDate) {
  const client = await Client.findOne({ _id: clientId, companyId });
  if (!client) throw new Error('Client not found');

  const standards = await ClientStandard.find({ clientId, companyId }).populate('standardId', 'name');

  // All scheduler entries for this client (with populated employee)
  const entryFilter = { companyId, clientId };
  if (startDate && endDate) entryFilter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
  const allEntries = await SchedulerEntry.find(entryFilter)
    .populate('employeeId', 'name designation')
    .populate('stageId', 'name')
    .sort({ date: 1 });

  const result = { client, standards: [], allEntries, totalClientDays: allEntries.length };

  // Unique employees who worked on this client
  const empMap = {};
  allEntries.forEach(e => {
    if (e.employeeId) {
      const id = e.employeeId._id.toString();
      if (!empMap[id]) empMap[id] = { name: e.employeeId.name, designation: e.employeeId.designation, days: 0 };
      empMap[id].days++;
    }
  });
  result.employeeSummary = Object.values(empMap);

  for (const cs of standards) {
    const stages = await ClientStandardStage.find({ clientStandardId: cs._id, companyId })
      .populate('stageId', 'name');

    const stagesWithActual = await Promise.all(stages.map(async (s) => {
      // Count entries where stageId matches OR (stageId is null and clientId matches — unassigned days)
      const stageFilter = { companyId, clientId, stageId: s.stageId._id };
      if (startDate && endDate) stageFilter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
      const actualDays = await SchedulerEntry.countDocuments(stageFilter);

      // Who worked on this stage
      const stageEntries = await SchedulerEntry.find(stageFilter)
        .populate('employeeId', 'name')
        .sort({ date: 1 });

      const stageEmpMap = {};
      stageEntries.forEach(e => {
        if (e.employeeId) {
          const id = e.employeeId._id.toString();
          if (!stageEmpMap[id]) stageEmpMap[id] = { name: e.employeeId.name, days: 0, dates: [] };
          stageEmpMap[id].days++;
          stageEmpMap[id].dates.push(new Date(e.date).toLocaleDateString());
        }
      });

      return {
        stageName: s.stageId.name,
        allottedManDays: s.allottedManDays,
        actualDays,
        status: s.status,
        utilization: s.allottedManDays > 0 ? Math.round((actualDays / s.allottedManDays) * 100) : 0,
        employees: Object.values(stageEmpMap),
      };
    }));

    const totalAllotted = stagesWithActual.reduce((a, s) => a + s.allottedManDays, 0);
    const totalActual = stagesWithActual.reduce((a, s) => a + s.actualDays, 0);
    const complete = stagesWithActual.filter(s => s.status === 'complete').length;
    const inProgress = stagesWithActual.filter(s => s.status === 'in_progress').length;

    result.standards.push({
      standardName: cs.standardId.name,
      contractStartDate: cs.contractStartDate,
      targetEndDate: cs.targetEndDate,
      status: cs.status,
      stages: stagesWithActual,
      totalAllotted,
      totalActual,
      remainingDays: Math.max(0, totalAllotted - totalActual),
      completionPercent: stagesWithActual.length > 0 ? Math.round((complete / stagesWithActual.length) * 100) : 0,
      stagesComplete: complete,
      stagesInProgress: inProgress,
      stagesTotal: stagesWithActual.length,
    });
  }

  return result;
}

async function buildEmployeeReport(companyId, employeeId, startDate, endDate) {
  const employee = await User.findOne({ _id: employeeId, companyId }).select('-password');
  if (!employee) throw new Error('Employee not found');

  const filter = { companyId, employeeId };
  if (startDate && endDate) filter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };

  const entries = await SchedulerEntry.find(filter)
    .populate('clientId', 'name')
    .populate('stageId', 'name')
    .sort({ date: 1 });

  const trainings = await TrainingRecord.find({ companyId, employeeId }).sort({ date: -1 });

  const expenses = await Expense.find({ companyId, employeeId, status: 'approved' })
    .populate('clientId', 'name')
    .sort({ date: -1 });
  const totalExpenses = expenses.reduce((a, e) => a + e.amount, 0);

  // Group by client
  const clientMap = {};
  for (const e of entries) {
    const clientName = e.clientId?.name || 'Unassigned';
    const stageName = e.stageId?.name || 'Unassigned';
    if (!clientMap[clientName]) clientMap[clientName] = { client: clientName, totalDays: 0, stages: {} };
    clientMap[clientName].totalDays++;
    if (!clientMap[clientName].stages[stageName]) clientMap[clientName].stages[stageName] = { stage: stageName, days: 0, dates: [] };
    clientMap[clientName].stages[stageName].days++;
    clientMap[clientName].stages[stageName].dates.push(new Date(e.date).toLocaleDateString());
  }

  const clientSummary = Object.values(clientMap).map(c => ({
    ...c,
    stages: Object.values(c.stages),
  }));

  // Monthly breakdown
  const monthMap = {};
  entries.forEach(e => {
    const month = new Date(e.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    monthMap[month] = (monthMap[month] || 0) + 1;
  });
  const monthlyBreakdown = Object.entries(monthMap).map(([month, days]) => ({ month, days }));

  return {
    employee,
    totalDays: entries.length,
    entries,
    clientSummary,
    monthlyBreakdown,
    trainings,
    expenses,
    totalExpenses,
  };
}

async function buildExpenseReport(companyId, filters) {
  const filter = { companyId };
  if (filters.employeeId) filter.employeeId = filters.employeeId;
  if (filters.clientId) filter.clientId = filters.clientId;
  if (filters.startDate && filters.endDate) {
    filter.date = { $gte: new Date(filters.startDate), $lte: new Date(filters.endDate) };
  }
  if (filters.status) filter.status = filters.status;

  const expenses = await Expense.find(filter)
    .populate('employeeId', 'name designation')
    .populate('clientId', 'name')
    .populate('approvedBy', 'name')
    .sort({ date: -1 });

  const total = expenses.reduce((a, e) => a + e.amount, 0);
  const approved = expenses.filter(e => e.status === 'approved').reduce((a, e) => a + e.amount, 0);
  const pending = expenses.filter(e => e.status === 'pending').reduce((a, e) => a + e.amount, 0);

  const byType = expenses.reduce((acc, e) => {
    acc[e.type] = (acc[e.type] || 0) + e.amount;
    return acc;
  }, {});

  // Per employee summary
  const empMap = {};
  expenses.forEach(e => {
    const name = e.employeeId?.name || 'Unknown';
    if (!empMap[name]) empMap[name] = { name, total: 0, count: 0 };
    empMap[name].total += e.amount;
    empMap[name].count++;
  });

  // Per client summary
  const clientMap = {};
  expenses.forEach(e => {
    const name = e.clientId?.name || 'No Client';
    if (!clientMap[name]) clientMap[name] = { name, total: 0, count: 0 };
    clientMap[name].total += e.amount;
    clientMap[name].count++;
  });

  return {
    expenses,
    total,
    approved,
    pending,
    byType,
    byEmployee: Object.values(empMap).sort((a, b) => b.total - a.total),
    byClient: Object.values(clientMap).sort((a, b) => b.total - a.total),
  };
}

// ---- ENDPOINTS ----

exports.clientReport = async (req, res) => {
  try {
    const { clientId, startDate, endDate } = req.query;
    if (!clientId) return res.status(400).json({ message: 'clientId required' });
    const data = await buildClientReport(req.companyId, clientId, startDate, endDate);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.employeeReport = async (req, res) => {
  try {
    const employeeId = req.user.role === 'employee' ? req.user._id : req.query.employeeId;
    if (!employeeId) return res.status(400).json({ message: 'employeeId required' });
    const data = await buildEmployeeReport(req.companyId, employeeId, req.query.startDate, req.query.endDate);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.expenseReport = async (req, res) => {
  try {
    const filters = req.user.role === 'employee'
      ? { ...req.query, employeeId: req.user._id }
      : req.query;
    const data = await buildExpenseReport(req.companyId, filters);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---- HELPERS FOR PDF ----
function drawHR(doc) {
  doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#e5e7eb').stroke();
  doc.moveDown(0.3);
}

function sectionHeader(doc, text) {
  doc.moveDown(0.5);
  doc.rect(40, doc.y, 515, 22).fill('#1e3a8a');
  doc.fillColor('white').fontSize(11).text(text, 48, doc.y - 17);
  doc.fillColor('black');
  doc.moveDown(0.8);
}

function row(doc, label, value, y) {
  doc.fontSize(9).fillColor('#6b7280').text(label, 48, y);
  doc.fontSize(9).fillColor('#111827').text(String(value), 200, y);
}

// ---- EXPORT PDF ----
exports.exportClientPDF = async (req, res) => {
  try {
    const { clientId, startDate, endDate } = req.query;
    if (!clientId) return res.status(400).json({ message: 'clientId required' });
    const data = await buildClientReport(req.companyId, clientId, startDate, endDate);

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="client-report-${data.client.name}.pdf"`);
    doc.pipe(res);

    // Header
    doc.rect(0, 0, 595, 70).fill('#1e3a8a');
    doc.fillColor('white').fontSize(20).text('AuditPro', 40, 18);
    doc.fontSize(10).text('Client Report', 40, 42);
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleDateString()}`, 400, 42);
    doc.fillColor('black').moveDown(3);

    // Client info
    sectionHeader(doc, 'CLIENT INFORMATION');
    const infoY = doc.y;
    doc.fontSize(16).fillColor('#1e3a8a').text(data.client.name, 48, infoY);
    doc.fontSize(9).fillColor('#6b7280');
    if (data.client.contactPerson) doc.text(`Contact: ${data.client.contactPerson}`);
    if (data.client.email) doc.text(`Email: ${data.client.email}`);
    if (data.client.phone) doc.text(`Phone: ${data.client.phone}`);
    doc.fillColor('black').moveDown(0.5);

    // Summary boxes
    sectionHeader(doc, 'SUMMARY');
    const boxY = doc.y;
    const boxes = [
      { label: 'Total Days', value: data.totalClientDays },
      { label: 'Standards', value: data.standards.length },
      { label: 'Employees', value: data.employeeSummary.length },
    ];
    boxes.forEach((b, i) => {
      const x = 48 + i * 170;
      doc.rect(x, boxY, 155, 45).fill('#f3f4f6');
      doc.fontSize(22).fillColor('#1e3a8a').text(String(b.value), x + 10, boxY + 5, { width: 135, align: 'center' });
      doc.fontSize(8).fillColor('#6b7280').text(b.label, x + 10, boxY + 30, { width: 135, align: 'center' });
    });
    doc.fillColor('black').moveDown(4);

    // Employee summary
    if (data.employeeSummary.length > 0) {
      sectionHeader(doc, 'EMPLOYEES ASSIGNED');
      data.employeeSummary.forEach(e => {
        doc.fontSize(9).fillColor('#111827').text(`${e.name}${e.designation ? ` (${e.designation})` : ''}`, 48, doc.y, { continued: true });
        doc.fillColor('#6b7280').text(`  —  ${e.days} day(s)`, { align: 'right' });
      });
      doc.moveDown(0.5);
    }

    // Standards
    for (const s of data.standards) {
      sectionHeader(doc, `STANDARD: ${s.standardName}`);

      doc.fontSize(9).fillColor('#6b7280');
      doc.text(`Status: ${s.status.replace('_', ' ').toUpperCase()}   |   Completion: ${s.completionPercent}%   |   ${s.stagesComplete}/${s.stagesTotal} stages complete`, 48);
      if (s.contractStartDate) doc.text(`Contract Start: ${new Date(s.contractStartDate).toLocaleDateString()}   |   Target End: ${s.targetEndDate ? new Date(s.targetEndDate).toLocaleDateString() : 'N/A'}`, 48);
      doc.text(`Days Allotted: ${s.totalAllotted}   |   Days Used: ${s.totalActual}   |   Remaining: ${s.remainingDays}`, 48);
      doc.fillColor('black').moveDown(0.5);

      // Progress bar
      const barY = doc.y;
      doc.rect(48, barY, 507, 8).fill('#e5e7eb');
      doc.rect(48, barY, Math.min(507, 507 * s.completionPercent / 100), 8).fill('#1e3a8a');
      doc.moveDown(1.2);

      // Stages table header
      const thY = doc.y;
      doc.rect(48, thY, 507, 18).fill('#f9fafb');
      doc.fontSize(8).fillColor('#6b7280');
      doc.text('STAGE', 55, thY + 5);
      doc.text('ALLOTTED', 230, thY + 5);
      doc.text('ACTUAL', 300, thY + 5);
      doc.text('UTILIZATION', 370, thY + 5);
      doc.text('STATUS', 460, thY + 5);
      doc.fillColor('black').moveDown(1.2);

      s.stages.forEach((st, idx) => {
        const rowY = doc.y;
        if (idx % 2 === 0) doc.rect(48, rowY, 507, 16).fill('#fafafa');
        doc.fontSize(9).fillColor('#111827').text(st.stageName, 55, rowY + 3, { width: 170 });
        doc.text(`${st.allottedManDays}d`, 230, rowY + 3);
        doc.text(`${st.actualDays}d`, 300, rowY + 3);

        // Mini progress bar
        doc.rect(370, rowY + 5, 80, 6).fill('#e5e7eb');
        const color = st.utilization > 100 ? '#ef4444' : st.utilization > 75 ? '#f59e0b' : '#22c55e';
        doc.rect(370, rowY + 5, Math.min(80, 80 * st.utilization / 100), 6).fill(color);
        doc.fillColor('#6b7280').fontSize(8).text(`${st.utilization}%`, 455, rowY + 3);

        const statusColors = { complete: '#22c55e', in_progress: '#f59e0b', not_started: '#9ca3af' };
        doc.fillColor(statusColors[st.status] || '#9ca3af').fontSize(8)
          .text(st.status.replace('_', ' '), 460, rowY + 3);
        doc.fillColor('black').moveDown(1);

        // Employees on this stage
        if (st.employees && st.employees.length > 0) {
          doc.fontSize(7).fillColor('#9ca3af');
          st.employees.forEach(e => {
            doc.text(`    └ ${e.name}: ${e.days} day(s) — ${e.dates.slice(0, 5).join(', ')}${e.dates.length > 5 ? '...' : ''}`, 65, doc.y);
          });
          doc.fillColor('black');
        }
      });
      doc.moveDown(0.5);
    }

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

exports.exportEmployeePDF = async (req, res) => {
  try {
    const employeeId = req.user.role === 'employee' ? req.user._id : req.query.employeeId;
    if (!employeeId) return res.status(400).json({ message: 'employeeId required' });
    const data = await buildEmployeeReport(req.companyId, employeeId, req.query.startDate, req.query.endDate);

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="employee-report-${data.employee.name}.pdf"`);
    doc.pipe(res);

    // Header
    doc.rect(0, 0, 595, 70).fill('#1e3a8a');
    doc.fillColor('white').fontSize(20).text('AuditPro', 40, 18);
    doc.fontSize(10).text('Employee Report', 40, 42);
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleDateString()}`, 400, 42);
    doc.fillColor('black').moveDown(3);

    // Employee info
    sectionHeader(doc, 'EMPLOYEE INFORMATION');
    doc.fontSize(16).fillColor('#1e3a8a').text(data.employee.name, 48);
    doc.fontSize(9).fillColor('#6b7280');
    if (data.employee.designation) doc.text(`Designation: ${data.employee.designation}`);
    if (data.employee.email) doc.text(`Email: ${data.employee.email}`);
    if (data.employee.dateOfJoining) doc.text(`Date of Joining: ${new Date(data.employee.dateOfJoining).toLocaleDateString()}`);
    if (data.employee.qualifications) doc.text(`Qualifications: ${data.employee.qualifications}`);
    doc.fillColor('black').moveDown(0.5);

    // Summary boxes
    sectionHeader(doc, 'SUMMARY');
    const boxY = doc.y;
    const boxes = [
      { label: 'Total Days Worked', value: data.totalDays },
      { label: 'Clients Served', value: data.clientSummary.length },
      { label: 'Approved Expenses', value: `₹${data.totalExpenses.toLocaleString()}` },
      { label: 'Trainings', value: data.trainings.length },
    ];
    boxes.forEach((b, i) => {
      const x = 48 + i * 127;
      doc.rect(x, boxY, 115, 45).fill('#f3f4f6');
      doc.fontSize(18).fillColor('#1e3a8a').text(String(b.value), x + 5, boxY + 5, { width: 105, align: 'center' });
      doc.fontSize(7).fillColor('#6b7280').text(b.label, x + 5, boxY + 30, { width: 105, align: 'center' });
    });
    doc.fillColor('black').moveDown(4);

    // Monthly breakdown
    if (data.monthlyBreakdown.length > 0) {
      sectionHeader(doc, 'MONTHLY BREAKDOWN');
      data.monthlyBreakdown.forEach(m => {
        const barW = Math.min(300, 300 * m.days / data.totalDays);
        const mY = doc.y;
        doc.fontSize(9).fillColor('#111827').text(m.month, 48, mY, { width: 80 });
        doc.rect(135, mY + 2, 300, 10).fill('#e5e7eb');
        doc.rect(135, mY + 2, barW, 10).fill('#1e3a8a');
        doc.fontSize(9).fillColor('#6b7280').text(`${m.days} days`, 445, mY);
        doc.fillColor('black').moveDown(1);
      });
    }

    // Client breakdown
    if (data.clientSummary.length > 0) {
      sectionHeader(doc, 'WORK BY CLIENT');
      for (const c of data.clientSummary) {
        doc.fontSize(11).fillColor('#1e3a8a').text(`${c.client}`, 48);
        doc.fontSize(9).fillColor('#6b7280').text(`Total: ${c.totalDays} day(s)`, 48);
        doc.fillColor('black');
        c.stages.forEach(s => {
          doc.fontSize(8).fillColor('#374151').text(`  • ${s.stage}: ${s.days} day(s)`, 55, doc.y);
          doc.fontSize(7).fillColor('#9ca3af').text(`    Dates: ${s.dates.slice(0, 8).join(', ')}${s.dates.length > 8 ? '...' : ''}`, 65, doc.y);
        });
        doc.fillColor('black').moveDown(0.5);
      }
    }

    // Training records
    if (data.trainings.length > 0) {
      sectionHeader(doc, 'TRAINING RECORDS');
      const thY = doc.y;
      doc.rect(48, thY, 507, 18).fill('#f9fafb');
      doc.fontSize(8).fillColor('#6b7280');
      ['SUBJECT', 'DATE', 'DURATION', 'TRAINER', 'CERTIFICATE'].forEach((h, i) => {
        doc.text(h, 55 + i * 100, thY + 5);
      });
      doc.fillColor('black').moveDown(1.2);

      data.trainings.forEach((t, idx) => {
        const rY = doc.y;
        if (idx % 2 === 0) doc.rect(48, rY, 507, 16).fill('#fafafa');
        doc.fontSize(8).fillColor('#111827');
        doc.text(t.subject, 55, rY + 3, { width: 95 });
        doc.text(new Date(t.date).toLocaleDateString(), 155, rY + 3);
        doc.text(t.duration || '-', 255, rY + 3);
        doc.text(t.trainerName || '-', 355, rY + 3);
        doc.fillColor(t.certificateIssued ? '#22c55e' : '#9ca3af')
          .text(t.certificateIssued ? 'Yes' : 'No', 455, rY + 3);
        doc.fillColor('black').moveDown(1);
        if (t.certificateIssued && t.expiryDate) {
          const expired = new Date(t.expiryDate) < new Date();
          doc.fontSize(7).fillColor(expired ? '#ef4444' : '#6b7280')
            .text(`  Expiry: ${new Date(t.expiryDate).toLocaleDateString()}${expired ? ' (EXPIRED)' : ''}`, 55, doc.y);
          doc.fillColor('black');
        }
      });
    }

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

exports.exportExpensePDF = async (req, res) => {
  try {
    const filters = req.user.role === 'employee' ? { ...req.query, employeeId: req.user._id } : req.query;
    const data = await buildExpenseReport(req.companyId, filters);

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="expense-report.pdf"`);
    doc.pipe(res);

    // Header
    doc.rect(0, 0, 595, 70).fill('#1e3a8a');
    doc.fillColor('white').fontSize(20).text('AuditPro', 40, 18);
    doc.fontSize(10).text('Expense Report', 40, 42);
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleDateString()}`, 400, 42);
    doc.fillColor('black').moveDown(3);

    // Summary boxes
    sectionHeader(doc, 'SUMMARY');
    const boxY = doc.y;
    const boxes = [
      { label: 'Total Submitted', value: `₹${data.total.toLocaleString()}` },
      { label: 'Approved', value: `₹${data.approved.toLocaleString()}` },
      { label: 'Pending', value: `₹${data.pending.toLocaleString()}` },
      { label: 'Transactions', value: data.expenses.length },
    ];
    boxes.forEach((b, i) => {
      const x = 48 + i * 127;
      doc.rect(x, boxY, 115, 45).fill('#f3f4f6');
      doc.fontSize(14).fillColor('#1e3a8a').text(String(b.value), x + 5, boxY + 8, { width: 105, align: 'center' });
      doc.fontSize(7).fillColor('#6b7280').text(b.label, x + 5, boxY + 30, { width: 105, align: 'center' });
    });
    doc.fillColor('black').moveDown(4);

    // By type
    sectionHeader(doc, 'BY EXPENSE TYPE');
    const typeEntries = Object.entries(data.byType);
    typeEntries.forEach(([type, amount]) => {
      const pct = data.total > 0 ? Math.round((amount / data.total) * 100) : 0;
      const tY = doc.y;
      doc.fontSize(9).fillColor('#111827').text(type.replace('_', ' ').toUpperCase(), 48, tY, { width: 120 });
      doc.rect(180, tY + 2, 250, 10).fill('#e5e7eb');
      doc.rect(180, tY + 2, 250 * pct / 100, 10).fill('#1e3a8a');
      doc.fillColor('#6b7280').text(`₹${amount.toLocaleString()} (${pct}%)`, 440, tY);
      doc.fillColor('black').moveDown(1);
    });

    // By employee
    if (data.byEmployee.length > 0) {
      sectionHeader(doc, 'BY EMPLOYEE');
      const thY = doc.y;
      doc.rect(48, thY, 507, 18).fill('#f9fafb');
      doc.fontSize(8).fillColor('#6b7280');
      doc.text('EMPLOYEE', 55, thY + 5);
      doc.text('TRANSACTIONS', 300, thY + 5);
      doc.text('TOTAL', 430, thY + 5);
      doc.fillColor('black').moveDown(1.2);

      data.byEmployee.forEach((e, idx) => {
        const rY = doc.y;
        if (idx % 2 === 0) doc.rect(48, rY, 507, 16).fill('#fafafa');
        doc.fontSize(9).fillColor('#111827').text(e.name, 55, rY + 3, { width: 240 });
        doc.text(String(e.count), 300, rY + 3);
        doc.fillColor('#1e3a8a').text(`₹${e.total.toLocaleString()}`, 430, rY + 3);
        doc.fillColor('black').moveDown(1);
      });
    }

    // Transactions table
    sectionHeader(doc, 'ALL TRANSACTIONS');
    const thY = doc.y;
    doc.rect(48, thY, 507, 18).fill('#f9fafb');
    doc.fontSize(8).fillColor('#6b7280');
    ['DATE', 'EMPLOYEE', 'TYPE', 'AMOUNT', 'CLIENT', 'STATUS'].forEach((h, i) => {
      const xs = [55, 130, 255, 320, 385, 480];
      doc.text(h, xs[i], thY + 5);
    });
    doc.fillColor('black').moveDown(1.2);

    data.expenses.forEach((e, idx) => {
      if (doc.y > 720) { doc.addPage(); }
      const rY = doc.y;
      if (idx % 2 === 0) doc.rect(48, rY, 507, 16).fill('#fafafa');
      doc.fontSize(8).fillColor('#111827');
      doc.text(new Date(e.date).toLocaleDateString(), 55, rY + 3);
      doc.text(e.employeeId?.name || '-', 130, rY + 3, { width: 120 });
      doc.text(e.type.replace('_', ' '), 255, rY + 3);
      doc.fillColor('#1e3a8a').text(`₹${e.amount.toLocaleString()}`, 320, rY + 3);
      doc.fillColor('#111827').text(e.clientId?.name || '-', 385, rY + 3, { width: 90 });
      const statusColors = { approved: '#22c55e', pending: '#f59e0b', rejected: '#ef4444' };
      doc.fillColor(statusColors[e.status] || '#9ca3af').text(e.status, 480, rY + 3);
      doc.fillColor('black').moveDown(1);
    });

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// ---- EXPORT EXCEL ----
exports.exportExpenseExcel = async (req, res) => {
  try {
    const filters = req.user.role === 'employee' ? { ...req.query, employeeId: req.user._id } : req.query;
    const data = await buildExpenseReport(req.companyId, filters);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'AuditPro';

    // Summary sheet
    const ws1 = wb.addWorksheet('Summary');
    ws1.addRow(['AuditPro - Expense Report']).font = { bold: true, size: 16 };
    ws1.addRow([`Generated: ${new Date().toLocaleDateString()}`]);
    ws1.addRow([]);
    ws1.addRow(['Total Submitted', `₹${data.total}`]);
    ws1.addRow(['Total Approved', `₹${data.approved}`]);
    ws1.addRow(['Total Pending', `₹${data.pending}`]);
    ws1.addRow([]);
    ws1.addRow(['By Type', 'Amount']);
    Object.entries(data.byType).forEach(([type, amount]) => ws1.addRow([type, amount]));
    ws1.addRow([]);
    ws1.addRow(['By Employee', 'Transactions', 'Total']);
    data.byEmployee.forEach(e => ws1.addRow([e.name, e.count, e.total]));

    // Transactions sheet
    const ws = wb.addWorksheet('Transactions');
    ws.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Employee', key: 'employee', width: 22 },
      { header: 'Client', key: 'client', width: 22 },
      { header: 'Type', key: 'type', width: 15 },
      { header: 'Amount', key: 'amount', width: 14 },
      { header: 'Description', key: 'description', width: 30 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Approved By', key: 'approvedBy', width: 18 },
    ];
    ws.getRow(1).font = { bold: true };

    data.expenses.forEach(e => ws.addRow({
      date: new Date(e.date).toLocaleDateString(),
      employee: e.employeeId?.name || '-',
      client: e.clientId?.name || '-',
      type: e.type.replace('_', ' '),
      amount: e.amount,
      description: e.description || '',
      status: e.status,
      approvedBy: e.approvedBy?.name || '-',
    }));

    ws.addRow([]);
    const totalRow = ws.addRow({ date: 'TOTAL', amount: data.total });
    totalRow.font = { bold: true };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="expense-report.xlsx"');
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// ---- MONTHLY WORKDAYS REPORT ----
// Returns for a given month: total calendar days, workable days (Mon-Fri), days utilised per employee
exports.monthlyWorkdays = async (req, res) => {
  try {
    const { year, month } = req.query; // month = 1-12
    if (!year || !month) return res.status(400).json({ message: 'year and month required' });

    const y = parseInt(year), m = parseInt(month);
    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 0); // last day of month
    const totalDays = endDate.getDate();

    // Count workable days (Mon-Fri, excluding weekends)
    let workableDays = 0;
    for (let d = 1; d <= totalDays; d++) {
      const day = new Date(y, m - 1, d).getDay();
      if (day !== 0 && day !== 6) workableDays++;
    }

    // Get all scheduler entries for this month
    const entries = await SchedulerEntry.find({
      companyId: req.companyId,
      date: { $gte: startDate, $lte: endDate },
    }).populate('employeeId', 'name designation');

    // Total days utilised
    const totalUtilised = entries.length;

    // Per employee breakdown
    const empMap = {};
    entries.forEach(e => {
      if (!e.employeeId) return;
      const empId = e.employeeId._id.toString();
      if (!empMap[empId]) {
        empMap[empId] = {
          _id: empId,
          name: e.employeeId.name,
          designation: e.employeeId.designation,
          daysUtilised: 0,
        };
      }
      empMap[empId].daysUtilised++;
    });

    const employeeBreakdown = Object.values(empMap).map(e => ({
      ...e,
      utilizationPct: workableDays > 0 ? Math.round((e.daysUtilised / workableDays) * 100) : 0,
    })).sort((a, b) => b.daysUtilised - a.daysUtilised);

    // All employees (including those with 0 days)
    const allEmployees = await User.find({ companyId: req.companyId, role: 'employee', status: 'active' }).select('name designation');
    const fullBreakdown = allEmployees.map(e => {
      const found = empMap[e._id.toString()];
      return found || { _id: e._id, name: e.name, designation: e.designation, daysUtilised: 0, utilizationPct: 0 };
    }).sort((a, b) => b.daysUtilised - a.daysUtilised);

    res.json({
      year: y,
      month: m,
      monthName: startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      totalDays,
      workableDays,
      totalUtilised,
      overallUtilizationPct: workableDays > 0 ? Math.round((totalUtilised / (workableDays * (fullBreakdown.length || 1))) * 100) : 0,
      employeeBreakdown: fullBreakdown,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};