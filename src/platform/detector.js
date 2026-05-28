// ============================================
// PLATFORM DETECTION
// Deteksi situs game yang sedang dibuka
// ============================================

const PLATFORM_MAP = {
  'geoguessr': 'geoguessr',
  'worldguessr': 'worldguessr',
  'openguessr': 'openguessr',
  'freeguessr': 'freeguessr',
  'guesswhereyouare': 'freeguessr',
  'geoduel': 'geoduels'
};

/**
 * Deteksi platform dari URL saat ini
 */
export function detectPlatform() {
  const url = window.location.href.toLowerCase();

  for (const [keyword, platform] of Object.entries(PLATFORM_MAP)) {
    if (url.includes(keyword)) return platform;
  }
  return 'unknown';
}

/**
 * Daftar semua platform yang didukung
 */
export function getSupportedPlatforms() {
  return Object.values(PLATFORM_MAP).filter((v, i, a) => a.indexOf(v) === i);
}
