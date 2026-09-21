const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const { startDigestJob } = require('./jobs/digestJob');

const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');
const habitRoutes = require('./routes/habitRoutes');
const aiRoutes = require('./routes/aiRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const digestRoutes = require('./routes/digestRoutes');
const diaryRoutes = require('./routes/diaryRoutes');
const memoryRoutes = require('./routes/memoryRoutes');
const driftRoutes = require('./routes/driftRoutes');
const readRoutes = require('./routes/readRoutes');
const patternRoutes = require('./routes/patternRoutes');
const agentRoutes = require('./routes/agentRoutes');
const focusRoutes = require('./routes/focusRoutes');

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  process.env.CLIENT_URL,
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    startDigestJob();
  })
  .catch((err) => console.error('❌ MongoDB connection error:', err.message));

// routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/habits', habitRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/digest', digestRoutes);
app.use('/api/diary', diaryRoutes);
app.use('/api/memories', memoryRoutes);
app.use('/api/drift', driftRoutes);
app.use('/api/read', readRoutes);
app.use('/api/patterns', patternRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/focus', focusRoutes);

app.get('/api/health', (req, res) => {
  res.json({ message: 'Hello from your server! 🚀' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});