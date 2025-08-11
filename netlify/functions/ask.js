const serverless = require('serverless-http');
const express = require('express');
const { corsMiddleware } = require('../shared/cors');
const askController = require('../../src/controllers/askController');

const app = express();
app.use(corsMiddleware);
app.use(express.json());

app.post('/', askController);

module.exports.handler = serverless(app);
