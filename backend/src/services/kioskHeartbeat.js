const { Kiosk } = require('../models');

/**
 * Marks a kiosk as recently active (REST or MQTT). Ignores unknown kiosk IDs.
 */
async function touchKioskActivity(kioskId, at = new Date()) {
  if (kioskId == null || String(kioskId).trim() === '') return;
  try {
    await Kiosk.updateOne(
      { kioskId: String(kioskId) },
      { $set: { lastHeartbeat: at, lastSyncTime: at, status: 'online' } },
    );
  } catch {
    /* non-fatal */
  }
}

module.exports = { touchKioskActivity };
