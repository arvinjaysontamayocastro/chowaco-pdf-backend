const serverless = require('serverless-http');
const express = require('express');
const multer = require('multer');
const { corsMiddleware } = require('../shared/cors');
const uploadController = require('../../src/controllers/uploadController');

const app = express();
app.use(corsMiddleware);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
});

app.post('/', upload.single('pdf'), uploadController);

module.exports.handler = serverless(app, {
  basePath: '/.netlify/functions/upload',
});
