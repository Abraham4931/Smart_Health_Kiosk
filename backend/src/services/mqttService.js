const mqtt = require('mqtt');
const { Measurement } = require('../models');
const { touchKioskActivity } = require('./kioskHeartbeat');

let client = null;
let ioInstance = null;

function init(io) {
  ioInstance = io;
  if (process.env.MQTT_DISABLED === '1') {
    console.log('MQTT: disabled (MQTT_DISABLED=1)');
    return;
  }
  const brokerUrl = process.env.MQTT_BROKER_URL;
  const username = process.env.MQTT_USERNAME;
  const password = process.env.MQTT_PASSWORD;

  if (!brokerUrl || brokerUrl.includes('your_mqtt')) {
    console.log('MQTT: No broker configured, skipping connection');
    return;
  }

  const opts = {};
  if (username && username !== 'your_mqtt_username') {
    opts.username = username;
    opts.password = password;
  }

  client = mqtt.connect(brokerUrl, opts);

  client.on('connect', () => {
    console.log('MQTT: Connected to HiveMQ broker');
    client.subscribe('kiosk/+/patient/+/vitals', { qos: 1 });
  });

  client.on('message', async (topic, message) => {
    try {
      const parts = topic.split('/');
      const kioskId = parts[1];
      const patientId = parts[3];
      const payload = JSON.parse(message.toString());

      const measuredAt = payload.measuredAt ? new Date(payload.measuredAt) : new Date();
      const windowStart = new Date(measuredAt.getTime() - 15000);
      const windowEnd = new Date(measuredAt.getTime() + 15000);

      const existing = await Measurement.findOne({
        patientId,
        measuredAt: { $gte: windowStart, $lte: windowEnd },
      });
      if (existing) {
        console.log(`MQTT: Skipped duplicate for patient ${patientId} (already saved via REST)`);
        return;
      }

      const measurement = await Measurement.create({
        patientId,
        kioskId,
        vitals: payload.vitals,
        measuredAt,
        syncStatus: 'synced',
      });

      console.log(`MQTT: Ingested measurement ${measurement._id} from kiosk ${kioskId}`);

      await touchKioskActivity(kioskId, measuredAt);

      if (ioInstance) {
        ioInstance.to(`patient:${patientId}`).emit('new_measurement', measurement);
      }
    } catch (err) {
      console.error('MQTT message processing error:', err.message);
    }
  });

  client.on('error', (err) => {
    console.error('MQTT connection error:', err.message);
  });
}

function getClient() {
  return client;
}

module.exports = { init, getClient };
