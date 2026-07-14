const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
require('dotenv').config();


const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');
const habitRoutes = require('./routes/habitRoutes');

const app = express();

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((err) => console.error('❌ MongoDB connection error:', err.message));

// routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/habits', habitRoutes);

// TEMPORARY test route
const { askAI } = require('./services/aiService');
app.get('/api/ai-test', async (req, res) => {
  try {
    const reply = await askAI('Say hello and confirm you are working, in one sentence.');
    res.json({ reply });
  } catch (error) {
    res.status(500).json({ message: 'AI error', error: error.message });
  }
});

// health check route
app.get('/api/health', (req, res) => {
  res.json({ message: 'Hello from your server! 🚀' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});