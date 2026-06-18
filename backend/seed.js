require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Company = require('./src/models/Company');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Create a placeholder company for superadmin
  let superCompany = await Company.findOne({ email: 'superadmin@auditpro.internal' });
  if (!superCompany) {
    superCompany = await Company.create({
      name: 'Tresbon System',
      email: 'superadmin@auditpro.internal',
    });
    console.log('Created system company');
  }

  // Create superadmin user
  const existing = await User.findOne({ email: 'superadmin@auditpro.com' });
  if (existing) {
    console.log('Superadmin already exists:', existing.email);
  } else {
    const superadmin = await User.create({
      companyId: superCompany._id,
      name: 'Super Admin',
      email: 'superadmin@auditpro.com',
      password: 'Admin@1234',
      role: 'superadmin',
    });
    console.log('Superadmin created:', superadmin.email, '| Password: Admin@1234');
  }

  await mongoose.disconnect();
  console.log('Done');
}

seed().catch(err => { console.error(err); process.exit(1); });