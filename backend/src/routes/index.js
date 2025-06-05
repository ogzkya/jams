const express = require('express');
const router = express.Router();

// GET /
router.get('/', (req, res) => {
  res.json({ mesaj: 'API çalışıyor' });
});

module.exports = router;
