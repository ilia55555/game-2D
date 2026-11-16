#!/usr/bin/env node
/* همهٔ فایل‌ها را در یک HTML آفلاین تک‌فایلی ادغام می‌کند: node build.js */
const fs = require('fs'), path = require('path'), d = __dirname;
let html = fs.readFileSync(path.join(d, 'index.html'), 'utf8');
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/, (m, f) => '<style>\n' + fs.readFileSync(path.join(d, f), 'utf8') + '</style>');
html = html.replace(/<script src="([^"]+)"><\/script>/g, (m, f) => '<script>\n' + fs.readFileSync(path.join(d, f), 'utf8').replace(/<\/script/g, '<\\/script') + '</script>');
fs.writeFileSync(path.join(d, 'black-matter-offline.html'), html);
console.log('built black-matter-offline.html', (html.length / 1024).toFixed(0) + ' KB');
