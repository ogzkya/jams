const asyncHandler = require('express-async-handler');

const authorize = (...permittedRoles) => {
  return asyncHandler((req, res, next) => {
    if (!req.user || !permittedRoles.includes(req.user.role)) {
      res.status(403);
      throw new Error('Bu kaynağa erişim izniniz yok');
    }
    next();
  });
};

module.exports = { authorize };
