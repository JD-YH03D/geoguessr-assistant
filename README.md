# GeoGuessr Assistant - Bintang Toba Pro

Universal geography game assistant dengan Mini Map untuk GeoGuessr, WorldGuessr, OpenGuessr, FreeGuessr, dan platform lainnya.

## Fitur

- **Real-time Coordinate Extraction** - Ekstrak koordinat lokasi secara otomatis
- **Mini Map** - Peta kecil dengan berbagai layer (Default, Dark, Terrain)
- **Auto Place Marker** - Tempatkan pin secara otomatis pada peta game
- **Safe Mode** - Offset acak ~50m untuk anti-deteksi
- **Discord Integration** - Kirim lokasi ke webhook Discord
- **Round History** - Simpan dan export riwayat lokasi per round
- **Session Backup/Restore** - Backup dan restore seluruh session
- **Customizable Hotkeys** - Atur hotkey sesuai preferensi
- **Multi-Platform** - Mendukung GeoGuessr, WorldGuessr, OpenGuessr, FreeGuessr, GeoDuels

## Struktur Proyek (Source Code)

```
geoguessr-assistant/
├── src/
│   ├── config/              # Konfigurasi dan konstanta
│   │   ├── constants.js     # Konstanta utama (APP_CONFIG, TIMING, dll)
│   │   ├── defaults.js      # Default settings, hotkeys, presets
│   │   └── maps.js          # Map layers dan deskripsi hotkey
│   ├── core/                # State management
│   │   ├── state.js         # Global state & internal variables
│   │   ├── telemetry.js     # Sistem telemetry untuk debug
│   │   └── request-tokens.js# Token system untuk async operations
│   ├── extraction/          # Sistem ekstraksi koordinat
│   │   ├── xhr-interceptor.js    # Intercept XHR requests
│   │   ├── patch-manager.js      # Manager untuk XHR patch
│   │   ├── cache.js              # Cache hasil ekstraksi
│   │   ├── coordinate-extractor.js # Logika ekstraksi utama
│   │   └── extractor-registry.js  # Registry & shadow telemetry
│   ├── features/            # Fitur-fitur utama
│   │   ├── minimap.js       # Mini map (Leaflet)
│   │   ├── marker-placement.js   # Penempatan marker pada game map
│   │   ├── discord.js       # Discord webhook integration
│   │   ├── history.js       # Round history management
│   │   ├── session.js       # Session backup/restore
│   │   ├── address-lookup.js     # Nominatim reverse geocoding
│   │   └── status-indicators.js  # Status text & LED indicator
│   ├── ui/                  # User Interface
│   │   ├── phone-frame.js   # Phone-like panel utama
│   │   ├── views.js         # Generator untuk semua views
│   │   ├── navigation.js    # Navigation & hotkey cache
│   │   └── theming.js       # Theme, scale, & UI state
│   ├── platform/            # Platform detection
│   │   └── detector.js      # Deteksi situs game
│   ├── protection/          # Integrity protection
│   │   └── integrity-manager.js  # Sistem proteksi anti-tamper
│   ├── system/              # Core systems
│   │   ├── keyboard-handler.js   # Handler untuk semua hotkey
│   │   └── monitoring.js         # Main monitoring loop
│   └── main.js              # Entry point & lifecycle
├── dist/                    # Output userscript (generated)
│   └── geoguessr-assistant.user.js
├── package.json             # Dependencies & build scripts
├── rollup.config.js         # Rollup bundler configuration
├── userscript.config.js     # Userscript metadata config
└── .gitignore
```

## Cara Install dari GitHub ke Tampermonkey

### 1. Push ke GitHub

```bash
# Inisialisasi repository (jika belum)
git init
git add .
git commit -m "Initial commit: GeoGuessr Assistant v2.1.0"

# Push ke GitHub (ganti dengan URL repository Anda)
git remote add origin https://github.com/JD-YH03D/release.git
git branch -M main
git push -u origin main
```

### 2. Build Userscript

```bash
# Install dependencies
npm install

# Build (generate dist/geoguessr-assistant.user.js)
npm run build

# Build & watch untuk development
npm run build:watch
```

### 3. Install di Tampermonkey (Raw GitHub URL)

1. **Push file hasil build ke GitHub:**
   ```bash
   git add dist/geoguessr-assistant.user.js
   git commit -m "Build v2.1.0"
   git push
   ```

2. **Dapatkan Raw URL:**
   - Buka file `dist/geoguessr-assistant.user.js` di GitHub
   - Klik tombol **Raw** di kanan atas
   - Copy URL-nya (contoh: `https://raw.githubusercontent.com/JD-YH03D/release/main/dist/geoguessr-assistant.user.js`)

3. **Install via Tampermonkey:**
   - Buka Tampermonkey Dashboard
   - Klik tab **Utilities**
   - Di bagian "Install from URL", paste raw URL
   - Klik **Install**
   - Selesai!

### 4. Auto-Update (Opsional)

Untuk mengaktifkan auto-update, ubah `userscript.config.js` atau update `@downloadURL` dan `@updateURL` di metadata:

```javascript
// @downloadURL https://raw.githubusercontent.com/JD-YH03D/release/main/dist/geoguessr-assistant.user.js
// @updateURL   https://raw.githubusercontent.com/JD-YH03D/release/main/dist/geoguessr-assistant.user.js
```

## Cara Mengembangkan / Kontribusi

### Prerequisites
- Node.js 18+
- npm atau yarn
- Git

### Setup Development

```bash
# Clone repository
git clone https://github.com/JD-YH03D/release.git
cd geoguessr-assistant

# Install dependencies
npm install

# Build
npm run build
```

### Menambah Fitur Baru

1. **Tambahkan konfigurasi** di `src/config/` jika diperlukan
2. **Buat modul baru** di folder yang sesuai (`src/features/`, `src/ui/`, dll.)
3. **Export fungsi** dari modul baru
4. **Import dan gunakan** di file yang membutuhkan
5. **Build dan test** dengan `npm run build`

### Menambah Map Layer Baru

Edit `src/config/maps.js`:

```javascript
export const MAP_LAYERS = Object.freeze({
  // ... layer existing
  satellite: Object.freeze({
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    options: { maxZoom: 19 }
  })
});
```

### Menambah Platform Baru

Edit `src/platform/detector.js`:

```javascript
const PLATFORM_MAP = {
  // ... platform existing
  'platformbaru': 'platformbaru'
};
```

Tambahkan juga `@match` di metadata userscript.

## Hotkey Default

| Key | Fungsi |
|-----|--------|
| `Home` | Buka/tutup panel |
| `V` | Quick open menu |
| `M` | Place marker |
| `X` | Refresh koordinat |
| `1` | Auto place marker |
| `2` | Safe place (~50m offset) |
| `S` | Zoom in mini map |
| `A` | Zoom out mini map |
| `C` | Copy koordinat |
| `G` | Buka Google Maps |
| `D` | Kirim ke Discord |

## Teknologi

- **Vanilla JavaScript** - Tanpa framework, pure JS untuk kompatibilitas userscript
- **Leaflet.js** - Library peta untuk mini map
- **Nominatim API** - Reverse geocoding (OpenStreetMap)
- **Rollup** - Module bundler
- **Tampermonkey/Greasemonkey API** - GM_getValue, GM_setValue, GM_xmlhttpRequest, GM_info

## Lisensi

MIT License - Bintang Toba Pro

## Catatan Keamanan

- Script ini menggunakan **Integrity Protection System** untuk mencegah modifikasi tidak sah
- Jangan membagikan build yang telah dimodifikasi tanpa izin
- Gunakan selalu build official dari repository GitHub

---

**Versi:** 2.1.0  
**Author:** Bintang Toba Pro  
**Repository:** https://github.com/JD-YH03D/release
