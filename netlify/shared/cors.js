const cors = require('cors');

const allowedOrigins = process.env.FRONTEND_ORIGIN ? process.env.FRONTEND_ORIGIN.split(',').map(s=>s.trim()) : null;

function originCallback(origin, cb) {
  if (!allowedOrigins) {
    // No allowed origins set → block non-browser requests unless FRONTEND_ORIGIN omitted (dev)
    return cb(new Error('CORS: No allowed origins set in env'), false);
  }
  if (!origin || allowedOrigins.includes(origin)) {
    cb(null, true);
  } else {
    cb(new Error('CORS: Origin ' + origin + ' not allowed'), false);
  }
}

const corsMiddleware = cors({
  origin: originCallback,
  methods: ['GET','POST','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
});

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': process.env.FRONTEND_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };
}

module.exports = { corsMiddleware, corsHeaders };
