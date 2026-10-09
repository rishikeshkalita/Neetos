// Deterministic API handler smoke tests; no live API key or network needed.
// Run with: node tests/api-handler.test.cjs
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');
const source = fs.readFileSync(path.join(__dirname, '..', 'api', 'chat.js'), 'utf8')
  .replace(/^export default async function handler/m, 'module.exports = async function handler');
const response = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
function loadHandler(fetchMock, key = 'unit-test-key') {
  const sandbox = {
    module: { exports: {} },
    process: { env: key ? { GEMINI_API_KEY: key } : {} },
    fetch: fetchMock,
    AbortController,
    setTimeout,
    clearTimeout,
    console: { error() {} }
  };
  vm.runInNewContext(source, sandbox, { filename: 'api/chat.js' });
  return sandbox.module.exports;
}
function mockRes() {
  return {
    statusCode: 200, headers: {}, body: undefined,
    setHeader(name, value) { this.headers[name] = value; return this; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}
const request = body => ({ method: 'POST', body: { message: 'Hi', history: [], profile: {}, tasks: [], taskHistory: [], study: {}, today: '2026-10-10', ...body } });
(async () => {
  {
    const calls = [];
    const sequence = [response(503, { error: { message: 'temporarily overloaded' } }), response(503, { error: { message: 'temporarily overloaded' } }), response(200, { candidates: [{ content: { parts: [{ text: JSON.stringify({ reply: 'Hello', study: { dailyChecklist: [] } }) }] } }] })];
    const handler = loadHandler(async (url, options) => { calls.push({ url, options }); return sequence.shift(); });
    const res = mockRes();
    await handler(request(), res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.reply, 'Hello');
    assert.equal(calls.length, 3);
    assert.match(calls[0].url, /gemini-3.8-flash/);
    assert.match(calls[2].url, /gemini-3.6-flash/);
    assert.equal(calls[0].options.headers['x-goog-api-key'], 'unit-test-key');
    assert.equal(calls[0].url.includes('?key='), false);
    const config = JSON.parse(calls[0].options.body).generationConfig;
    assert.equal(Object.hasOwn(config, 'temperature'), false);
    assert.equal(config.thinkingConfig.thinkingLevel, 'low');
  }
  {
    const calls = [];
    const handler = loadHandler(async (url) => {
      calls.push(url);
      if (url.includes('gemini-3.8-flash')) return response(404, { error: { message: 'model unavailable' } });
      return response(200, { candidates: [{ content: { parts: [{ text: JSON.stringify({ reply: 'Fallback worked', study: { dailyChecklist: [] } }) }] } }] });
    });
    const res = mockRes();
    await handler(request(), res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.reply, 'Fallback worked');
    assert.equal(calls.length, 2);
  }
  {
    let called = false;
    const handler = loadHandler(async () => { called = true; return response(200, {}); }, '');
    const res = mockRes();
    await handler(request(), res);
    assert.equal(res.statusCode, 503);
    assert.equal(called, false);
  }
  {
    const handler = loadHandler(async () => response(200, {}));
    const res = mockRes();
    await handler({ method: 'POST', body: { message: '' } }, res);
    assert.equal(res.statusCode, 400);
  }
  console.log('NEETOS API handler regression tests passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
