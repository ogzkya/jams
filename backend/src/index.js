require('dotenv').config();
const express = require('express');
const connectDB = require('./db');

// Veritabanı bağlantısını kur
connectDB();

const app = express();
app.use(express.json());

// Diğer middleware ve rota tanımlamaları buraya gelecek

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda çalışıyor`);
});