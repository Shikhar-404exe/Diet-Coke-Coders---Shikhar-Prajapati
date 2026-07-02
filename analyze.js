const fs = require('fs');
const src = fs.readFileSync('src/App.jsx', 'utf8');

// Check for unbalanced backticks
let count = 0;
for (const ch of src) {
  if (ch === '`') count++;
}
console.log('backticks: ' + count + ' (should be even)');

// Check single quotes more carefully
let inTemplate = false;
let sq = 0, dq = 0;
for (let i = 0; i < src.length; i++) {
  const ch = src[i];
  const prev = i > 0 ? src[i-1] : '';
  if (ch === '`' && prev !== '\\') inTemplate = !inTemplate;
  if (!inTemplate) {
    if (ch === "'" && prev !== '\\') sq++;
    if (ch === '"' && prev !== '\\') dq++;
  }
}
console.log('single quotes: ' + sq + ' (should be even)');
console.log('double quotes: ' + dq + ' (should be even)');

// Find div imbalance with line numbers
lines = src.split('\n');
let depth = 0;
for (let i = 1179; i < lines.length; i++) {
  const line = lines[i];
  const openDivs = (line.match(/<div\b/g) || []).length;
  const selfClosing = (line.match(/<div[^>]*\/>/g) || []).length;
  const closeDivs = (line.match(/<\/div>/g) || []).length;
  const net = openDivs - selfClosing - closeDivs;
  depth += net;
}
console.log('div depth at end: ' + depth + ' (should be 1 for root div)');
