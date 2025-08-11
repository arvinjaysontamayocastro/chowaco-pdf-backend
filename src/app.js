require('dotenv').config();

const express = require('express');
const multer = require('multer');

const cors = require('cors');

const uploadController = require('./controllers/uploadController');
const askController = require('./controllers/askController');
const deleteController = require('./controllers/deleteController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
});

const app = express();

// Allowed origins only from env var
const allowedOrigins = process.env.FRONTEND_ORIGIN
  ? process.env.FRONTEND_ORIGIN.split(',').map((o) => o.trim())
  : null; // null means block all if not set

// Custom CORS logic to allow multiple origins
app.use(
  cors({
    origin: function (origin, callback) {
      if (!allowedOrigins) {
        // No FRONTEND_ORIGIN in env → block all
        return callback(
          new Error('CORS: No allowed origins set in env'),
          false
        );
      }
      if (!origin || allowedOrigins.includes(origin)) {
        // Allow only listed domains
        callback(null, true);
      } else {
        callback(new Error(`CORS: Origin ${origin} not allowed`), false);
      }
    },
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());

// Allow OPTIONS preflight for all routes
app.options('*', cors());
app.post('/upload', upload.single('pdf'), uploadController);
app.post('/ask', askController);
app.delete('/documents/:guid', deleteController);

module.exports = app;
