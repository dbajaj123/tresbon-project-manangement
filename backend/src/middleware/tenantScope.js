// Automatically scopes all queries to the user's companyId
// Superadmin can pass ?companyId= to operate on any company
const tenantScope = (req, res, next) => {
  if (req.user.role === 'superadmin') {
    // Superadmin can target any company via query param or body
    req.companyId = req.query.companyId || req.body.companyId || null;
  } else {
    req.companyId = req.user.companyId.toString();
  }
  next();
};

module.exports = tenantScope;
