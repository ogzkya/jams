require('dotenv').config();
const express = require('express');
const connectDB = require('./db');
const cors = require('cors');
const path = require('path');

// Middleware import
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');
const morgan = require('morgan');

// Routes import
const indexRoutes = require('./routes/index');
const userRoutes = require('./routes/users');
const inventoryRoutes = require('./routes/inventory');
const serverRoutes = require('./routes/servers');
const locationRoutes = require('./routes/locations');
const credentialRoutes = require('./routes/credentials');
const auditRoutes = require('./routes/audit');

// Veritabanı bağlantısını kur
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// API Routes
app.use('/api', indexRoutes);
app.use('/api/users', userRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/servers', serverRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/credentials', credentialRoutes);
app.use('/api/audit', auditRoutes);

// Static dosyalar (production)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../client/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../../client/build', 'index.html'));
  });
}

// Error middleware
app.use(notFound);
app.use(errorHandler);

module.exports = app;