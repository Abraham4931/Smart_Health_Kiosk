const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const express = require('express');
const http = require('http');
const cors = require('cors');
const connectDB = require('./config/db');
const socketService = require('./services/socketService');
const mqttService = require('./services/mqttService');

const authRoutes = require('./routes/auth');
const subscriptionRoutes = require('./routes/subscriptions');
const measurementRoutes = require('./routes/measurements');
const appointmentRoutes = require('./routes/appointments');
const adminRoutes = require('./routes/admin');

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/measurements', measurementRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 5000;

async function maybeAutoSeed() {
  if (process.env.SKIP_AUTO_SEED === '1') return;
  const { UserAccount } = require('./models');
  if ((await UserAccount.countDocuments()) > 0) return;
  const { runSeed } = require('./seed');
  console.log('Database empty — applying initial seed (admin / doctor1)…');
  await runSeed({ connect: false, disconnect: false });
}

async function start() {
  await connectDB();
  await maybeAutoSeed();

  const io = socketService.init(server);
  mqttService.init(io);

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend server running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('Server failed to start:', err.message || err);
  process.exit(1);
});
