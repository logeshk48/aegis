const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());            // let the frontend talk to this server
app.use(express.json());    // let the server read JSON sent to it

// our first route — a simple health check
app.get('/api/health', (req, res) => {
  res.json({ message: 'Hello from your server! 🚀' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});