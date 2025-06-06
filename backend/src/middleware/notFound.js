const notFound = (req, res, next) => {
  const error = new Error(`URL bulunamadı - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

module.exports = notFound;
