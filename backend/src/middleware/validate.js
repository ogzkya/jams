const { validationResult } = require('express-validator');

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400);
    throw new Error(errors.array().map(e => `${e.param}: ${e.msg}`).join(', '));
  }
  next();
}

module.exports = validate;
