# Run the mobile app locally

The app is built with **Flutter**. Backend is on **port 5001**; the app is configured to use `http://localhost:5001/api` when running on the same PC.

---

## 1. Install Flutter (Windows)

1. **Download**  
   https://docs.flutter.dev/get-started/install/windows  
   Use the **“flutter_windows_x.x.x-stable.zip”** link (or “Download Flutter SDK” button).

2. **Extract**  
   Unzip to a folder **without spaces**, e.g. `C:\flutter` (not `C:\Program Files`).

3. **Add to PATH**  
   - Press Win + S, type **environment variables**, open **Edit the system environment variables**.  
   - Click **Environment Variables**.  
   - Under **User variables**, select **Path** → **Edit** → **New**.  
   - Add: `C:\flutter\bin` (or the path where you extracted Flutter, plus `\bin`).  
   - OK out of all dialogs.

4. **Restart your terminal** (or Cursor) so PATH is updated.

5. **Check**  
   ```powershell
   flutter doctor
   ```  
   Fix any reported issues. For **Chrome** (run in browser) you mainly need the **Flutter** and **Chrome** checkmarks.

---

## 2. Run the app

From the project root (or from `mobile_app`):

```powershell
cd C:\Users\User\Desktop\Smart_Health_Kiosk\mobile_app
flutter pub get
flutter run -d chrome
```

- **Chrome**: runs the app in the browser (easiest; no Android/iOS setup).  
- **Windows**: `flutter run -d windows` (needs “Windows desktop” in `flutter doctor`).  
- **Android**: connect a device or start an emulator, then `flutter run -d <device-id>` (run `flutter devices` to see IDs).

---

## 3. Backend must be running

Start the backend first (port 5001):

```powershell
cd C:\Users\User\Desktop\Smart_Health_Kiosk\backend
npm start
```

Then run the app. You can sign up, log in, and use the app against your local backend.

---

## 4. Using a physical phone (optional)

1. Put phone and PC on the **same WiFi**.  
2. Find your PC’s IP (PowerShell: `(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch 'Loopback' }).IPAddress`).  
3. In `lib/services/auth_service.dart`, set `_baseUrl` to `'http://YOUR_PC_IP:5001/api'` (e.g. `'http://192.168.1.100:5001/api'`).  
4. Run: `flutter run -d <your-android-device-id>`.
