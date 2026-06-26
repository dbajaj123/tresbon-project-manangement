const express = require('express');
const router = express.Router();
const { auth, requireRole } = require('../middleware/auth');
const tenantScope = require('../middleware/tenantScope');
const upload = require('../middleware/upload');

const authCtrl = require('../controllers/authController');
const companyCtrl = require('../controllers/companyController');
const userCtrl = require('../controllers/userController');
const clientCtrl = require('../controllers/clientController');
const poolCtrl = require('../controllers/poolController');
const schedulerCtrl = require('../controllers/schedulerController');
const trainingCtrl = require('../controllers/trainingController');
const expenseCtrl = require('../controllers/expenseController');
const reportCtrl = require('../controllers/reportController');

// ---- AUTH ----
router.post('/auth/login', authCtrl.login);
router.post('/auth/refresh', authCtrl.refresh);
router.get('/auth/me', auth, authCtrl.me);

// ---- COMPANIES (superadmin) ----
router.get('/companies', auth, requireRole('superadmin'), companyCtrl.list);
router.post('/companies', auth, requireRole('superadmin'), companyCtrl.create);
router.get('/companies/:id', auth, requireRole('superadmin'), companyCtrl.getOne);
router.put('/companies/:id', auth, requireRole('superadmin'), companyCtrl.update);
router.patch('/companies/:id/toggle-status', auth, requireRole('superadmin'), companyCtrl.toggleStatus);

// All routes below require auth + tenant scope
const scoped = [auth, tenantScope];

// ---- USERS ----
router.get('/users', ...scoped, requireRole('admin', 'superadmin'), userCtrl.list);
router.post('/users', ...scoped, requireRole('admin', 'superadmin'), userCtrl.create);
router.get('/users/:id', ...scoped, userCtrl.getOne);
router.put('/users/:id', ...scoped, requireRole('admin', 'superadmin'), userCtrl.update);
router.patch('/users/:id/toggle-status', ...scoped, requireRole('admin', 'superadmin'), userCtrl.toggleStatus);

// ---- STANDARDS POOL ----
router.get('/standards', ...scoped, poolCtrl.listStandards);
router.post('/standards', ...scoped, requireRole('admin', 'superadmin'), poolCtrl.createStandard);
router.put('/standards/:id', ...scoped, requireRole('admin', 'superadmin'), poolCtrl.updateStandard);
router.delete('/standards/:id', ...scoped, requireRole('admin', 'superadmin'), poolCtrl.deleteStandard);

// ---- STAGES POOL ----
router.get('/stages', ...scoped, poolCtrl.listStages);
router.post('/stages', ...scoped, requireRole('admin', 'superadmin'), poolCtrl.createStage);
router.put('/stages/:id', ...scoped, requireRole('admin', 'superadmin'), poolCtrl.updateStage);
router.delete('/stages/:id', ...scoped, requireRole('admin', 'superadmin'), poolCtrl.deleteStage);

// ---- CLIENTS ----
router.get('/clients', ...scoped, clientCtrl.list);
router.post('/clients', ...scoped, requireRole('admin', 'superadmin'), clientCtrl.create);
router.get('/clients/:id', ...scoped, clientCtrl.getOne);
router.put('/clients/:id', ...scoped, requireRole('admin', 'superadmin'), clientCtrl.update);
router.patch('/clients/:id/toggle-status', ...scoped, requireRole('admin', 'superadmin'), clientCtrl.toggleStatus);
router.post('/clients/:id/standards', ...scoped, requireRole('admin', 'superadmin'), clientCtrl.assignStandard);
router.post('/clients/:id/stages', ...scoped, requireRole('admin', 'superadmin'), clientCtrl.assignStages);
router.put('/clients/:id/standards/:csId', ...scoped, requireRole('admin', 'superadmin'), clientCtrl.updateStandard);
router.put('/clients/stages/:stageId', ...scoped, requireRole('admin', 'superadmin'), clientCtrl.updateStage);
router.delete('/clients/stages/:stageId', ...scoped, requireRole('admin', 'superadmin'), clientCtrl.deleteStage);
router.delete('/clients/:id', ...scoped, requireRole('admin', 'superadmin'), clientCtrl.deleteClient);

// ---- SCHEDULER ----
router.get('/scheduler', ...scoped, schedulerCtrl.list);
router.post('/scheduler', ...scoped, schedulerCtrl.create);
router.put('/scheduler/:id', ...scoped, schedulerCtrl.update);
router.delete('/scheduler/:id', ...scoped, schedulerCtrl.remove);

// ---- TRAINING ----
router.get('/training', ...scoped, trainingCtrl.list);
router.post('/training', ...scoped, requireRole('admin', 'superadmin'), trainingCtrl.create);
router.put('/training/:id', ...scoped, requireRole('admin', 'superadmin'), trainingCtrl.update);
router.delete('/training/:id', ...scoped, requireRole('admin', 'superadmin'), trainingCtrl.remove);

// ---- EXPENSES ----
router.get('/expenses', ...scoped, expenseCtrl.list);
router.post('/expenses', ...scoped, upload.single('bill'), expenseCtrl.create);
router.put('/expenses/:id', ...scoped, upload.single('bill'), expenseCtrl.update);
router.patch('/expenses/:id/action', ...scoped, requireRole('admin', 'superadmin'), expenseCtrl.approve);
router.get('/expenses/:id/attachment', ...scoped, expenseCtrl.getAttachment);

// ---- REPORTS ----
router.get('/reports/client', ...scoped, reportCtrl.clientReport);
router.get('/reports/employee', ...scoped, reportCtrl.employeeReport);
router.get('/reports/expenses', ...scoped, reportCtrl.expenseReport);
router.get('/reports/client/pdf', ...scoped, reportCtrl.exportClientPDF);
router.get('/reports/employee/pdf', ...scoped, reportCtrl.exportEmployeePDF);
router.get('/reports/expenses/pdf', ...scoped, reportCtrl.exportExpensePDF);
router.get('/reports/expenses/excel', ...scoped, reportCtrl.exportExpenseExcel);
router.get('/reports/monthly', ...scoped, reportCtrl.monthlyWorkdays);

module.exports = router;