# Smart Health Kiosk – What to Install on Your PC (Windows)

Install the tools below so you can run the backend, both web dashboards, and the Flutter app on your Windows PC. Pi firmware is optional on PC (used for testing without real hardware).

---

## 1. Node.js (Backend + Dashboards)

**Version:** 18 or higher (LTS recommended, e.g. 20 or 22).

- **Download:** https://nodejs.org/  
  Choose the **LTS** Windows installer (`.msi`).
- **Install:** Run the installer. Ensure **“Add to PATH”** is checked.
- **Check:**
  ```powershell
  node -v    # e.g. v20.x.x
  npm -v     # e.g. 10.x.x
  ```

---

## 2. MongoDB (Database for Backend)

**Option A – MongoDB Atlas (cloud, no local install)**  
- Go to https://www.mongodb.com/cloud/atlas  
- Create a free cluster and get a connection string (e.g. `mongodb+srv://user:pass@cluster.mongodb.net/smart_health_kiosk`).  
- Use this as `MONGODB_URI` in the backend `.env`.

**Option B – MongoDB Community (local)**  
- **Download:** https://www.mongodb.com/try/download/community  
  Choose Windows, MSI, and a current version.  
- **Install:** Default options are fine. Install as a service so it starts with Windows.  
- Default URI: `mongodb://localhost:27017/smart_health_kiosk`  
- **Check:** Service “MongoDB” running in Services, or run:
  ```powershell
  "C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe" --version
  ```
  (Path may vary by version.)

---

## 3. Flutter SDK (Mobile App)

**Version:** Compatible with Dart 3.10+ (project uses `sdk: ^3.10.8`). Use a recent stable Flutter (3.22+).

- **Download:** https://docs.flutter.dev/get-started/install/windows  
  Use the **“flutter_windows_x.x.x-stable.zip”** link or install via Git.
- **Install:**
  - Unzip to a folder, e.g. `C:\flutter` (no spaces in path).
  - Add `C:\flutter\bin` to your **Path** (System Environment Variables).
- **Check:**
  ```powershell
  flutter doctor
  ```
  Fix any reported issues (e.g. Android Studio / Chrome / VS Code if you use them).

---

## 4. Python (Pi Firmware – optional on PC)

**Version:** 3.9 or higher.

- **Download:** https://www.python.org/downloads/  
  Get the latest 3.11 or 3.12 Windows installer.
- **Install:** Run the installer and **check “Add Python to PATH”**.
- **Check:**
  ```powershell
  python --version   # e.g. Python 3.12.x
  pip --version
  ```
- **Note:** Pi firmware uses GPIO/I2C drivers that only work on a Raspberry Pi. On Windows you can run the Flask server with simulated sensors for API testing.

---

## 5. Git (if not already installed)

- **Download:** https://git-scm.com/download/win  
- Needed to clone the repo and for Flutter’s Git dependency.  
- **Check:** `git --version`

---

## Quick reference – what runs where

| Component              | What you need   | Run command (from project root)        |
|------------------------|-----------------|----------------------------------------|
| Backend                | Node.js, MongoDB| `cd backend && npm install && npm run seed && npm start` |
| Super Admin Dashboard  | Node.js         | `cd super-admin-dashboard && npm install && npm run dev` (port 3001) |
| Hospital Dashboard     | Node.js         | `cd hospital-dashboard && npm install && npm run dev` (port 3002) |
| Flutter app            | Flutter SDK     | `cd mobile_app && flutter pub get && flutter run` |
| Pi firmware            | Python 3.9+     | `cd pi-firmware && pip install -r requirements.txt && python server.py` (port 5000; best on Pi) |

---

## First-time run order

1. **MongoDB** – Ensure MongoDB is running (local or Atlas URI in `.env`).
2. **Backend** – Copy `backend/.env` from `.env.example` if present, set `MONGODB_URI` (and optional `JWT_SECRET`, `MQTT_*`, etc.), then:
   ```powershell
   cd backend
   npm install
   npm run seed
   npm start
   ```
   Backend should be on **http://localhost:5000**.
3. **Super Admin** – In a new terminal:
   ```powershell
   cd super-admin-dashboard
   npm install
   npm run dev
   ```
   Open **http://localhost:3001**, login: `admin` / `admin123`.
4. **Hospital Dashboard** – In another terminal:
   ```powershell
   cd hospital-dashboard
   npm install
   npm run dev
   ```
   Open **http://localhost:3002**, login: `doctor1` / `doctor123`.
5. **Flutter app** – In another terminal:
   ```powershell
   cd mobile_app
   flutter pub get
   flutter run -d chrome
   ```
   Or choose an attached device with `flutter run`.
6. **Pi firmware** – Only if you want to simulate the kiosk on PC or run on a real Pi:
   ```powershell
   cd pi-firmware
   pip install -r requirements.txt
   python server.py
   ```
   Uses port 5000; if backend is already on 5000, change `SERVER_PORT` in `pi-firmware/config.py` (e.g. 5001) and use that port when connecting from the app.

---

## Optional (for full features)

- **MQTT:** Backend and app use HiveMQ Cloud; set `MQTT_BROKER_URL`, `MQTT_USERNAME`, `MQTT_PASSWORD` in backend `.env` and use the same broker in the Flutter app if you change from hardcoded values.
- **LLM (AI insights):** Set `LLM_API_KEY`, `LLM_API_URL`, `LLM_MODEL` in backend `.env`.
- **Google Maps (hospital search):** Set `GOOGLE_MAPS_API_KEY` in backend `.env`.
- **Android/iOS:** Install Android Studio and/or Xcode for device/emulator; `flutter doctor` will guide you.

---

## Summary – install list

| # | Tool        | Version   | Purpose                    |
|---|-------------|-----------|----------------------------|
| 1 | Node.js     | 18+ LTS   | Backend + both dashboards  |
| 2 | MongoDB     | (any)     | Backend database           |
| 3 | Flutter SDK | 3.22+     | Mobile app                 |
| 4 | Python      | 3.9+      | Pi firmware (optional on PC) |
| 5 | Git         | (any)     | Repo + Flutter             |

After installing, use the “First-time run order” above to run everything.
