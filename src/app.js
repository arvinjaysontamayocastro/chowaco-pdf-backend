const express = require('express');
const multer = require('multer');
const uploadController = require('./controllers/uploadController');
const askController = require('./controllers/askController');
const deleteController = require('./controllers/deleteController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 } // 100 MB
});

const app = express();
app.use(express.json());

app.post('/upload', upload.single('pdf'), uploadController);
app.post('/ask', askController);
app.delete('/documents/:guid', deleteController);

module.exports = app;
