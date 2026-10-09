// Lightweight source-contract checks. Run with: node tests/reliability-contract.test.cjs
const fs = require('node:fs');
const assert = require('node:assert/strict');
const html = fs.readFileSync('index.html','utf8');
const api = fs.readFileSync('api/chat.js','utf8');
const sw = fs.readFileSync('sw.js','utf8');
assert.match(html, /status:t\.done\?'completed':\(\['postponed','partially_completed','missed','cancelled'\]\.includes\(t\.status\)\?t\.status:'unknown'\)/);
assert.match(html, /function ensureRevisionQueue/);
assert.match(html, /\[3,7,14,30\]/);
assert.match(html, /function mergeCloudSnapshot/);
assert.match(html, /The AI returned an invalid task/);
assert.match(api, /message\.length>5000/);
assert.match(api, /daily task count to a realistic maximum of 12/);
assert.match(sw, /neetos-shell-v6/);
assert.match(sw, /request\.mode==='navigate'/);
console.log('NEETOS reliability source-contract checks passed.');
