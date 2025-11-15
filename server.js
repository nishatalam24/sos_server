const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const authRoutes = require('./routes/auth.controller');
const sosRoutes = require('./routes/sos.controller');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/sos', sosRoutes);

app.get('/', (_req, res) => {
  res.json({ message: 'SOS API running' });
});

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('Mongo error', err));

const PORT = process.env.PORT || 5500;
app.listen(PORT, () => console.log(`Server on ${PORT}`));