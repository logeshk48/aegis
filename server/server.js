const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');

const app = express();

app.use(cors({
  origin: 'http://localhost:5173',   // our frontend's address
  credentials: true,                 // allow cookies to be sent
}));
app.use(express.json());             // let the server read JSON sent to it
app.use(cookieParser());             // let the server read cookies

// connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((err) => console.error('❌ MongoDB connection error:', err.message));

// routes
app.use('/api/auth', authRoutes);    // all auth routes live under /api/auth
app.use('/api/tasks', taskRoutes);   // all task routes live under /api/tasks

// health check route
app.get('/api/health', (req, res) => {
  res.json({ message: 'Hello from your server! 🚀' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});