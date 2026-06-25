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
      // Scope strictly to this clientStandard so the same stage name reused
      // under a different standard for this client does NOT get counted here.
      const stageFilter = { companyId, clientId, clientStandardId: cs._id, stageId: s.stageId._id };
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

// ---- PDF LAYOUT TOOLKIT ----
const PAGE = { width: 595, height: 842, margin: 40 };
const CONTENT = { left: 40, right: 555, width: 515 };
const BRAND = '#1e3a8a';
const INK = '#111827';
const MUTED = '#6b7280';
const LIGHT = '#9ca3af';
const LINE = '#e5e7eb';
const ZEBRA = '#f7f8fa';

const statusColor = { complete: '#16a34a', in_progress: '#d97706', not_started: '#9ca3af', approved: '#16a34a', pending: '#d97706', rejected: '#dc2626' };

// Ensure there's room; add page if not. Returns current y.
function ensureSpace(doc, needed) {
  if (doc.y + needed > PAGE.height - PAGE.margin) {
    doc.addPage();
    return PAGE.margin;
  }
  return doc.y;
}

function brandHeader(doc, subtitle) {
  doc.rect(0, 0, PAGE.width, 76).fill(BRAND);
  doc.fillColor('white').font('Helvetica-Bold').fontSize(18).text('Tresbon Consulting Solutions', PAGE.margin, 18);
  doc.font('Helvetica').fontSize(11).fillColor('#c7d2fe').text(subtitle, PAGE.margin, 48);
  doc.fontSize(9).fillColor('#c7d2fe').text(`Generated: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`, CONTENT.right - 200, 50, { width: 200, align: 'right' });
  doc.fillColor(INK).font('Helvetica');
  doc.y = 96;
}

function sectionTitle(doc, text) {
  doc.y = ensureSpace(doc, 40);
  const y = doc.y;
  doc.rect(CONTENT.left, y, 4, 16).fill(BRAND);
  doc.fillColor(BRAND).font('Helvetica-Bold').fontSize(12).text(text.toUpperCase(), CONTENT.left + 12, y + 1);
  doc.font('Helvetica').fillColor(INK);
  doc.y = y + 24;
}

// Stat cards row — evenly spaced
function statCards(doc, cards) {
  doc.y = ensureSpace(doc, 60);
  const y = doc.y;
  const gap = 10;
  const w = (CONTENT.width - gap * (cards.length - 1)) / cards.length;
  cards.forEach((c, i) => {
    const x = CONTENT.left + i * (w + gap);
    doc.roundedRect(x, y, w, 52, 6).fill('#f3f4f6');
    doc.fillColor(c.color || BRAND).font('Helvetica-Bold').fontSize(17).text(String(c.value), x + 6, y + 9, { width: w - 12, align: 'center' });
    doc.fillColor(MUTED).font('Helvetica').fontSize(7.5).text(c.label, x + 6, y + 33, { width: w - 12, align: 'center' });
  });
  doc.fillColor(INK);
  doc.y = y + 64;
}

// Generic table. cols = [{label, key, width, align, render, wrap}]
function table(doc, cols, rows, opts = {}) {
  const minRowH = opts.rowH || 18;
  const headerH = 20;
  const padTop = 5;
  const padBottom = 5;
  let y = ensureSpace(doc, headerH + minRowH);

  const drawHeader = () => {
    doc.rect(CONTENT.left, y, CONTENT.width, headerH).fill('#eef2ff');
    doc.fillColor(BRAND).font('Helvetica-Bold').fontSize(8);
    let x = CONTENT.left + 6;
    cols.forEach(c => {
      doc.text(c.label.toUpperCase(), x, y + 6, { width: c.width - 8, align: c.align || 'left' });
      x += c.width;
    });
    doc.font('Helvetica').fillColor(INK);
    y += headerH;
  };

  drawHeader();

  rows.forEach((r, idx) => {
    // Pre-compute the rendered string for each column and the tallest cell height
    const cellValues = cols.map(c => String(c.render ? c.render(r) : (r[c.key] ?? '-')));
    doc.font('Helvetica').fontSize(8.5);
    let maxH = minRowH - padTop - padBottom;
    cols.forEach((c, i) => {
      const h = doc.heightOfString(cellValues[i], { width: c.width - 8, align: c.align || 'left' });
      if (h > maxH) maxH = h;
    });
    const rowH = maxH + padTop + padBottom;

    // Page break if this row won't fit
    if (y + rowH > PAGE.height - PAGE.margin) {
      doc.addPage();
      y = PAGE.margin;
      drawHeader();
    }

    if (idx % 2 === 1) doc.rect(CONTENT.left, y, CONTENT.width, rowH).fill(ZEBRA);
    let x = CONTENT.left + 6;
    cols.forEach((c, i) => {
      doc.fillColor(c.colorFn ? c.colorFn(r) : INK).font('Helvetica').fontSize(8.5)
        .text(cellValues[i], x, y + padTop, { width: c.width - 8, align: c.align || 'left' });
      x += c.width;
    });
    doc.fillColor(INK);
    y += rowH;
  });

  // bottom border
  doc.moveTo(CONTENT.left, y).lineTo(CONTENT.right, y).strokeColor(LINE).lineWidth(0.5).stroke();
  doc.y = y + 12;
}

// Horizontal bar row (label + bar + value)
function barRow(doc, label, value, pct, valueText) {
  const y = ensureSpace(doc, 18);
  doc.fillColor(INK).font('Helvetica').fontSize(9).text(label, CONTENT.left, y + 1, { width: 130, lineBreak: false });
  const barX = CONTENT.left + 140;
  const barW = 250;
  doc.roundedRect(barX, y + 2, barW, 9, 2).fill(LINE);
  doc.roundedRect(barX, y + 2, Math.max(2, Math.min(barW, barW * pct / 100)), 9, 2).fill(BRAND);
  doc.fillColor(MUTED).fontSize(8.5).text(valueText, barX + barW + 10, y + 1, { width: 100, lineBreak: false });
  doc.fillColor(INK);
  doc.y = y + 16;
}

function keyValueBlock(doc, lines) {
  lines.forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    const y = ensureSpace(doc, 14);
    doc.fillColor(MUTED).font('Helvetica').fontSize(9).text(k, CONTENT.left, y, { width: 120, lineBreak: false });
    doc.fillColor(INK).fontSize(9).text(String(v), CONTENT.left + 125, y, { width: CONTENT.width - 125 });
  });
  doc.moveDown(0.5);
}

function newDoc(res, filename) {
  const doc = new PDFDocument({ margin: PAGE.margin, size: 'A4', bufferPages: true });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);
  return doc;
}

function finalizeDoc(doc) {
  // Page numbers footer
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.fillColor(LIGHT).font('Helvetica').fontSize(8)
      .text(`Tresbon Consulting Solutions  •  Page ${i + 1} of ${range.count}`, PAGE.margin, PAGE.height - 28, { width: CONTENT.width, align: 'center' });
  }
  doc.end();
}

// ---- EXPORT: CLIENT PDF ----
exports.exportClientPDF = async (req, res) => {
  try {
    const { clientId, startDate, endDate } = req.query;
    if (!clientId) return res.status(400).json({ message: 'clientId required' });
    const data = await buildClientReport(req.companyId, clientId, startDate, endDate);

    const doc = newDoc(res, `client-report-${data.client.name}.pdf`);
    brandHeader(doc, 'Client Report');

    sectionTitle(doc, 'Client Information');
    doc.fillColor(BRAND).font('Helvetica-Bold').fontSize(15).text(data.client.name, CONTENT.left, doc.y);
    doc.font('Helvetica').fillColor(INK);
    doc.y += 4;
    keyValueBlock(doc, [
      ['Contact', data.client.contactPerson],
      ['Email', data.client.email],
      ['Phone', data.client.phone],
      ['Address', data.client.address],
    ]);

    sectionTitle(doc, 'Summary');
    statCards(doc, [
      { label: 'Total Days on Site', value: data.totalClientDays },
      { label: 'Standards', value: data.standards.length },
      { label: 'Employees', value: data.employeeSummary.length },
    ]);

    if (data.employeeSummary.length > 0) {
      sectionTitle(doc, 'Employees Assigned');
      table(doc,
        [
          { label: 'Employee', width: 300, key: 'name' },
          { label: 'Designation', width: 130, render: r => r.designation || '-' },
          { label: 'Days', width: 85, align: 'right', render: r => `${r.days}d` },
        ],
        data.employeeSummary
      );
    }

    for (const s of data.standards) {
      const daysProgress = s.totalAllotted > 0 ? Math.round((s.totalActual / s.totalAllotted) * 100) : 0;
      sectionTitle(doc, `Standard: ${s.standardName}`);
      keyValueBlock(doc, [
        ['Status', s.status.replace('_', ' ').toUpperCase()],
        ['Stages', `${s.stagesComplete}/${s.stagesTotal} complete`],
        ['Contract', `${s.contractStartDate ? new Date(s.contractStartDate).toLocaleDateString('en-GB') : 'N/A'}  to  ${s.targetEndDate ? new Date(s.targetEndDate).toLocaleDateString('en-GB') : 'N/A'}`],
        ['Days', `Allotted ${s.totalAllotted}  •  Used ${s.totalActual}  •  Remaining ${s.remainingDays}`],
      ]);
      barRow(doc, 'Overall progress (days)', null, daysProgress, `${s.totalActual}/${s.totalAllotted} days (${daysProgress}%)`);
      doc.moveDown(0.3);

      table(doc,
        [
          { label: 'Stage', width: 165, render: r => r.stageName },
          { label: 'Allotted', width: 60, align: 'right', render: r => `${r.allottedManDays}d` },
          { label: 'Actual', width: 55, align: 'right', render: r => `${r.actualDays}d` },
          { label: 'Util %', width: 55, align: 'right', render: r => `${r.utilization}%`,
            colorFn: r => r.utilization > 100 ? '#dc2626' : r.utilization > 75 ? '#d97706' : '#16a34a' },
          { label: 'Employees', width: 180, render: r => r.employees && r.employees.length ? r.employees.map(e => `${e.name} (${e.days}d)`).join(', ') : '-' },
        ],
        s.stages
      );
    }

    finalizeDoc(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// ---- EXPORT: EMPLOYEE PDF ----
exports.exportEmployeePDF = async (req, res) => {
  try {
    const employeeId = req.user.role === 'employee' ? req.user._id : req.query.employeeId;
    if (!employeeId) return res.status(400).json({ message: 'employeeId required' });
    const data = await buildEmployeeReport(req.companyId, employeeId, req.query.startDate, req.query.endDate);

    const doc = newDoc(res, `employee-report-${data.employee.name}.pdf`);
    brandHeader(doc, 'Employee Report');

    sectionTitle(doc, 'Employee Information');
    doc.fillColor(BRAND).font('Helvetica-Bold').fontSize(15).text(data.employee.name, CONTENT.left, doc.y);
    doc.font('Helvetica').fillColor(INK);
    doc.y += 4;
    keyValueBlock(doc, [
      ['Designation', data.employee.designation],
      ['Email', data.employee.email],
      ['Date of Joining', data.employee.dateOfJoining ? new Date(data.employee.dateOfJoining).toLocaleDateString('en-GB') : null],
      ['Qualifications', data.employee.qualifications],
    ]);

    sectionTitle(doc, 'Summary');
    statCards(doc, [
      { label: 'Total Days Worked', value: data.totalDays },
      { label: 'Clients Served', value: data.clientSummary.length },
      { label: 'Approved Expenses', value: `${data.totalExpenses.toLocaleString('en-IN')}` },
      { label: 'Trainings', value: data.trainings.length },
    ]);

    if (data.monthlyBreakdown.length > 0) {
      sectionTitle(doc, 'Monthly Breakdown');
      const maxDays = Math.max(...data.monthlyBreakdown.map(m => m.days), 1);
      data.monthlyBreakdown.forEach(m => barRow(doc, m.month, null, (m.days / maxDays) * 100, `${m.days} days`));
      doc.moveDown(0.5);
    }

    if (data.clientSummary.length > 0) {
      sectionTitle(doc, 'Work by Client');
      for (const c of data.clientSummary) {
        doc.y = ensureSpace(doc, 30);
        doc.fillColor(BRAND).font('Helvetica-Bold').fontSize(11).text(c.client, CONTENT.left, doc.y, { continued: true });
        doc.fillColor(MUTED).font('Helvetica').fontSize(9).text(`   —   ${c.totalDays} day(s)`);
        doc.y += 2;
        table(doc,
          [
            { label: 'Stage', width: 140, render: r => r.stage },
            { label: 'Days', width: 50, align: 'right', render: r => `${r.days}d` },
            { label: 'Dates', width: 325, render: r => r.dates.slice(0, 10).join(', ') + (r.dates.length > 10 ? ` +${r.dates.length - 10}` : '') },
          ],
          c.stages,
          { rowH: 16 }
        );
      }
    }

    if (data.trainings.length > 0) {
      sectionTitle(doc, 'Training Records');
      table(doc,
        [
          { label: 'Subject', width: 130, render: r => r.subject },
          { label: 'Date', width: 70, render: r => new Date(r.date).toLocaleDateString('en-GB') },
          { label: 'Duration', width: 70, render: r => r.duration || '-' },
          { label: 'Trainer', width: 110, render: r => r.trainerName || '-' },
          { label: 'Certificate', width: 135, render: r => r.certificateIssued ? (r.expiryDate ? `Yes (exp ${new Date(r.expiryDate).toLocaleDateString('en-GB')})` : 'Yes') : 'No',
            colorFn: r => r.certificateIssued ? '#16a34a' : LIGHT },
        ],
        data.trainings
      );
    }

    finalizeDoc(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// ---- EXPORT: EXPENSE PDF ----
exports.exportExpensePDF = async (req, res) => {
  try {
    const filters = req.user.role === 'employee' ? { ...req.query, employeeId: req.user._id } : req.query;
    const data = await buildExpenseReport(req.companyId, filters);

    const doc = newDoc(res, 'expense-report.pdf');
    brandHeader(doc, 'Expense Report');

    sectionTitle(doc, 'Summary');
    statCards(doc, [
      { label: 'Total Submitted', value: `${data.total.toLocaleString('en-IN')}` },
      { label: 'Approved', value: `${data.approved.toLocaleString('en-IN')}`, color: '#16a34a' },
      { label: 'Pending', value: `${data.pending.toLocaleString('en-IN')}`, color: '#d97706' },
      { label: 'Transactions', value: data.expenses.length },
    ]);

    const typeEntries = Object.entries(data.byType);
    if (typeEntries.length > 0) {
      sectionTitle(doc, 'By Expense Type');
      typeEntries.forEach(([type, amount]) => {
        const pct = data.total > 0 ? Math.round((amount / data.total) * 100) : 0;
        barRow(doc, type.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()), null, pct, `${amount.toLocaleString('en-IN')} (${pct}%)`);
      });
      doc.moveDown(0.5);
    }

    if (data.byEmployee.length > 0) {
      sectionTitle(doc, 'By Employee');
      table(doc,
        [
          { label: 'Employee', width: 280, render: r => r.name },
          { label: 'Transactions', width: 120, align: 'right', render: r => String(r.count) },
          { label: 'Total', width: 115, align: 'right', render: r => `${r.total.toLocaleString('en-IN')}`, colorFn: () => BRAND },
        ],
        data.byEmployee
      );
    }

    sectionTitle(doc, 'All Transactions');
    table(doc,
      [
        { label: 'Date', width: 70, render: r => new Date(r.date).toLocaleDateString('en-GB') },
        { label: 'Employee', width: 110, render: r => r.employeeId?.name || '-' },
        { label: 'Type', width: 80, render: r => r.type.replace('_', ' ') },
        { label: 'Amount', width: 75, align: 'right', render: r => `${r.amount.toLocaleString('en-IN')}`, colorFn: () => BRAND },
        { label: 'Client', width: 100, render: r => r.clientId?.name || '-' },
        { label: 'Status', width: 70, render: r => r.status, colorFn: r => statusColor[r.status] || LIGHT },
      ],
      data.expenses
    );

    finalizeDoc(doc);
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
    wb.creator = 'Tresbon Consulting Solutions';

    // Summary sheet
    const ws1 = wb.addWorksheet('Summary');
    ws1.addRow(['Tresbon Consulting Solutions - Expense Report']).font = { bold: true, size: 16 };
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
    const allEmployees = await User.find({ companyId: req.companyId, role: 'employee', status: 'active', $or: [{ dateOfLeaving: null }, { dateOfLeaving: { $gt: new Date() } }] }).select('name designation');
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