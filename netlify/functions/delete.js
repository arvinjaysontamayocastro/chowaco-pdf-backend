const serverless = require('serverless-http');
const express = require('express');
const { corsMiddleware } = require('../shared/cors');
const deleteController = require('../../src/controllers/deleteController');

const app = express();
app.use(corsMiddleware);
app.use(express.json());

// The original route was DELETE /documents/:guid; we'll accept DELETE with path param forwarded to express
app.delete('/:guid', deleteController);

module.exports.handler = serverless(app);
