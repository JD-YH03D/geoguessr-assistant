import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { readFileSync } from 'fs';

// Read userscript metadata from config
const metadataFile = readFileSync('./userscript.config.js', 'utf8');
const bannerMatch = metadataFile.match(/generateBanner\(\)\s*\{[\s\S]*?return\s+`([^`]+)`/);

// Generate banner manually
const banner = `// ==UserScript==
// @name         GeoGuessr - Let's explore the world!
// @namespace    https://github.com/JD-YH03D/release
// @version      2.1.0
// @description  Universal geography game assistant with Mini Map - GeoGuessr, WorldGuessr, OpenGuessr, FreeGuessr
// @author       Bintang Toba Pro
// @license      MIT
// @match        *://*.geoguessr.com/*
// @match        *://openguessr.com/*
// @match        *://*.worldguessr.com/*
// @match        *://*.worldguessr.net/*
// @match        *://freeguessr.com/*
// @match        *://geoduels.io/*
// @match        *://guesswhereyouare.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        GM_info
// @connect      nominatim.openstreetmap.org
// @connect      discord.com
// @connect      raw.githubusercontent.com
// @connect      npoint.io
// @run-at       document-idle
// @icon         https://www.geoguessr.com/favicon.ico
// @downloadURL  https://update.greasyfork.org/scripts/578278/GeoGuessr%20-%20Let%27s%20explore%20the%20world%21.user.js
// @updateURL    https://update.greasyfork.org/scripts/578278/GeoGuessr%20-%20Let%27s%20explore%20the%20world%21.meta.js
// ==/UserScript==`;

export default {
  input: 'src/main.js',
  output: {
    file: 'dist/geoguessr-assistant.user.js',
    format: 'iife',
    banner: banner,
    intro: `/* global google, L */\n/* eslint-disable */\n`,
    outro: `/* End of GeoGuessr Assistant */\n`
  },
  plugins: [
    resolve(),
    commonjs(),
  ],
  treeshake: false,
};
