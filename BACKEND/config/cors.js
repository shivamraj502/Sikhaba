const cors = require('cors');

const allowedOrigins = [
  'http://localhost:5173',
  'https://sikhaba-nwhe.vercel.app',
];

module.exports = cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
});