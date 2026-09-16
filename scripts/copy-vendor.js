'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dest = path.join(root, 'public', 'vendor');
fs.mkdirSync(dest, { recursive: true });

function copyFile(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

function resolvePkg(name) {
  return path.dirname(require.resolve(`${name}/package.json`));
}

const xtermDir = resolvePkg('@xterm/xterm');
const fitDir = resolvePkg('@xterm/addon-fit');

const xtermCss = path.join(xtermDir, 'css', 'xterm.css');
const candidates = [
  { from: path.join(xtermDir, 'lib', 'xterm.js'), as: 'xterm.js' },
  { from: path.join(xtermDir, 'lib', 'xterm.mjs'), as: 'xterm.mjs' },
];
const fitCandidates = [
  { from: path.join(fitDir, 'lib', 'addon-fit.js'), as: 'addon-fit.js' },
  { from: path.join(fitDir, 'lib', 'addon-fit.mjs'), as: 'addon-fit.mjs' },
];

copyFile(xtermCss, path.join(dest, 'xterm.css'));

let copied = [];
for (const c of [...candidates, ...fitCandidates]) {
  if (fs.existsSync(c.from)) {
    copyFile(c.from, path.join(dest, c.as));
    copied.push(c.as);
  }
}

fs.writeFileSync(
  path.join(dest, 'manifest.json'),
  JSON.stringify({ copied, xtermDir, fitDir }, null, 2)
);
console.log('Vendored xterm assets:', copied.join(', '));
