const dns = require('dns');
const mongoose = require('mongoose');

const DEFAULT_LOCAL_URI = 'mongodb://127.0.0.1:27017/smart_health_kiosk';

/** Kept alive so the child mongod process keeps running */
let memoryServerInstance = null;

function useMemoryServer() {
  const v = (process.env.MONGODB_MEMORY_SERVER || '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

async function connectWithMemoryServer() {
  let MongoMemoryServer;
  try {
    ({ MongoMemoryServer } = require('mongodb-memory-server'));
  } catch {
    throw new Error(
      'MONGODB_MEMORY_SERVER is enabled but mongodb-memory-server is not installed. From the backend folder run: npm install'
    );
  }
  console.log(
    'Starting embedded MongoDB (mongodb-memory-server). The first run downloads MongoDB 7 for Windows (large file); this can take several minutes on a slow connection — it is not frozen.'
  );
  try {
    memoryServerInstance = await MongoMemoryServer.create({
      binary: { version: '7.0.14' },
    });
  } catch (err) {
    console.error(
      '\n--- In-memory MongoDB failed to start ---\n' +
        `Message: ${err.message}\n` +
        'Common causes:\n' +
        '  • Network/firewall/antivirus blocking the MongoDB binary download (MongoDB CDN).\n' +
        '  • Disk full or no permission to write the download cache (see ~/.cache/mongodb-memory-server or OS temp).\n' +
        '  • Corporate proxy: set HTTPS_PROXY or use real MongoDB instead (see below).\n' +
        'Alternative: In .env set MONGODB_MEMORY_SERVER=0, install MongoDB Community or run "docker compose up -d" in backend/, keep MONGODB_URI=mongodb://127.0.0.1:27017/smart_health_kiosk\n'
    );
    throw err;
  }
  const base = memoryServerInstance.getUri();
  const uri = base.endsWith('/') ? `${base}smart_health_kiosk` : `${base}/smart_health_kiosk`;
  await mongoose.connect(uri);
  console.log(
    'MongoDB connected (in-memory via mongodb-memory-server; data is lost when you stop the server)'
  );
}

async function connectDB() {
  if (useMemoryServer()) {
    await connectWithMemoryServer();
    return;
  }

  const uri = (process.env.MONGODB_URI || DEFAULT_LOCAL_URI).trim();
  console.log(
    `MongoDB mode: persistent URI (MONGODB_MEMORY_SERVER is off). Connecting to: ${uri.replace(/:[^:@/]+@/, ':****@')}`
  );
  const isAtlas = uri.startsWith('mongodb+srv://');
  if (isAtlas) {
    dns.setServers(['8.8.8.8', '8.8.4.4']);
  }
  const maxAttempts = isAtlas ? 5 : 6;
  const retryDelayMs = isAtlas ? 15000 : 3000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await mongoose.connect(uri);
      console.log('MongoDB connected');
      return;
    } catch (err) {
      const isWhitelist = isAtlas && err.message && err.message.includes('whitelist');
      if (isWhitelist) {
        console.error(
          `MongoDB Atlas: IP not whitelisted (attempt ${attempt}/${maxAttempts}). Add your IP or 0.0.0.0/0 at https://cloud.mongodb.com → Network Access.`
        );
      } else if (!isAtlas) {
        console.error(
          `MongoDB connection failed (attempt ${attempt}/${maxAttempts}): ${err.message}\n` +
            'Fix: start MongoDB / Docker, OR set MONGODB_MEMORY_SERVER=1 in .env (no install; first run may download MongoDB binaries).'
        );
      } else {
        console.error(`MongoDB connection failed (attempt ${attempt}/${maxAttempts}):`, err.message);
      }
      if (attempt === maxAttempts) throw err;
      console.log(`Retrying in ${retryDelayMs / 1000}s...`);
      await new Promise((r) => setTimeout(r, retryDelayMs));
    }
  }
}

module.exports = connectDB;
