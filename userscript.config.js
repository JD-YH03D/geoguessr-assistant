// userscript.config.js
// Konfigurasi metadata untuk userscript - diedit sesuai kebutuhan

const metadata = {
  name: 'GeoGuessr - Let\'s explore the world!',
  namespace: 'https://github.com/JD-YH03D/release',
  version: '2.1.0',
  description: 'Universal geography game assistant with Mini Map - GeoGuessr, WorldGuessr, OpenGuessr, FreeGuessr',
  author: 'Bintang Toba Pro',
  license: 'MIT',
  match: [
    '*://*.geoguessr.com/*',
    '*://openguessr.com/*',
    '*://*.worldguessr.com/*',
    '*://*.worldguessr.net/*',
    '*://freeguessr.com/*',
    '*://geoduels.io/*',
    '*://guesswhereyouare.com/*'
  ],
  grant: [
    'GM_getValue',
    'GM_setValue',
    'GM_xmlhttpRequest',
    'GM_info'
  ],
  connect: [
    'nominatim.openstreetmap.org',
    'discord.com',
    'raw.githubusercontent.com',
    'npoint.io'
  ],
  'run-at': 'document-idle',
  icon: 'https://www.geoguessr.com/favicon.ico',
  downloadURL: 'https://update.greasyfork.org/scripts/578278/GeoGuessr%20-%20Let%27s%20explore%20the%20world%21.user.js',
  updateURL: 'https://update.greasyfork.org/scripts/578278/GeoGuessr%20-%20Let%27s%20explore%20the%20world%21.meta.js'
};

function generateBanner() {
  const lines = ['// ==UserScript=='];

  lines.push(`// @name         ${metadata.name}`);
  lines.push(`// @namespace    ${metadata.namespace}`);
  lines.push(`// @version      ${metadata.version}`);
  lines.push(`// @description  ${metadata.description}`);
  lines.push(`// @author       ${metadata.author}`);
  lines.push(`// @license      ${metadata.license}`);

  metadata.match.forEach(m => lines.push(`// @match        ${m}`));
  metadata.grant.forEach(g => lines.push(`// @grant        ${g}`));
  metadata.connect.forEach(c => lines.push(`// @connect      ${c}`));

  lines.push(`// @run-at       ${metadata['run-at']}`);
  lines.push(`// @icon         ${metadata.icon}`);
  lines.push(`// @downloadURL  ${metadata.downloadURL}`);
  lines.push(`// @updateURL    ${metadata.updateURL}`);
  lines.push('// ==/UserScript==');

  return lines.join('\n');
}

module.exports = {
  ...metadata,
  banner: generateBanner()
};
