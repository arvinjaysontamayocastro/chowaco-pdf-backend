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

// // Debug logger to verify body parsing
// app.use((req, res, next) => {
//   console.log('---- Incoming request ----');
//   console.log('Method:', req.method);
//   console.log('URL:', req.originalUrl);
//   console.log('Headers:', req.headers);
//   console.log('Body:', req.body);
//   console.log('--------------------------');
//   next();
// });

// // Log the type of incoming body in dev mode
// if (process.env.NODE_ENV !== 'production') {
//   app.use((req, res, next) => {
//     if (Buffer.isBuffer(req.body)) {
//       console.log(
//         `[BodyLogger] Incoming body is a Buffer (${req.body.length} bytes)`
//       );
//     } else if (typeof req.body === 'object' && req.body !== null) {
//       console.log(`[BodyLogger] Incoming body is a parsed object:`, req.body);
//     } else if (typeof req.body === 'string') {
//       console.log(`[BodyLogger] Incoming body is a string:`, req.body);
//     } else if (req.body == null) {
//       console.log(`[BodyLogger] Incoming body is null/undefined`);
//     } else {
//       console.log(
//         `[BodyLogger] Incoming body type:`,
//         typeof req.body,
//         req.body
//       );
//     }
//     next();
//   });
// }

app.use(express.json());

app.use((req, res, next) => {
  if (Buffer.isBuffer(req.body)) {
    try {
      req.body = JSON.parse(req.body.toString('utf8'));
    } catch (err) {
      console.error('Failed to parse Buffer body:', err);
    }
  }
  next();
});

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

app.post('/api/upload', upload.single('pdf'), uploadController);
app.post('/api/ask', askController);
app.delete('/api/documents/:guid', deleteController);

module.exports = app;
