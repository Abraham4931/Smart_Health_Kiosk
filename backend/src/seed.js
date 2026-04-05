const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const { UserAccount, Hospital, Kiosk } = require('./models');

/**
 * @param {{ disconnect?: boolean, connect?: boolean }} opts
 * - connect: set false when mongoose is already connected (e.g. server startup).
 * - disconnect: set false when the process should keep the DB open (server).
 */
async function runSeed(opts = {}) {
  const { disconnect = true, connect = true } = opts;
  if (connect) {
    await connectDB();
  }

  const adminExists = await UserAccount.findOne({ username: 'admin' });
  if (!adminExists) {
    await UserAccount.create({
      username: 'admin',
      password: 'admin123',
      role: 'super_admin',
      name: 'System Administrator',
    });
    console.log('Created super_admin account: admin / admin123');
  }

  const hospitalCount = await Hospital.countDocuments();
  if (hospitalCount === 0) {
    const hospitals = await Hospital.insertMany([
      {
        name: 'Adama General Hospital',
        location: { type: 'Point', coordinates: [39.2671, 8.5400] },
        address: 'Adama, Ethiopia',
        phone: '+251-22-111-0000',
        specializations: ['general', 'cardiology', 'respiratory'],
        bookingFee: 200,
      },
      {
        name: 'Adama Cardiac Center',
        location: { type: 'Point', coordinates: [39.2700, 8.5420] },
        address: 'Adama, Ethiopia',
        phone: '+251-22-111-0001',
        specializations: ['cardiology', 'hypertension'],
        bookingFee: 350,
      },
    ]);
    console.log(`Seeded ${hospitals.length} hospitals`);

    await UserAccount.create({
      username: 'doctor1',
      password: 'doctor123',
      role: 'provider',
      name: 'Dr. Abebe',
      hospitalId: hospitals[0]._id,
    });
    console.log('Created provider account: doctor1 / doctor123');
  }

  const kioskCount = await Kiosk.countDocuments();
  if (kioskCount === 0) {
    await Kiosk.create({
      kioskId: 'KIOSK-001',
      wifiSsid: 'SmartHealthKiosk-001',
      location: { type: 'Point', coordinates: [39.2650, 8.5380] },
      address: 'Health Post, Adama',
      status: 'offline',
    });
    console.log('Seeded kiosk KIOSK-001');
  }

  console.log('Seed complete');
  if (disconnect) {
    await mongoose.disconnect();
  }
}

module.exports = { runSeed };

if (require.main === module) {
  runSeed().catch(console.error);
}
