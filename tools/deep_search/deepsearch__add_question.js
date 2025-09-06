#!/usr/bin/env node
const http = require('http');
const https = require('https');
const { URL } = require('url');

async function main() {
  const action = process.env.TOOLBOX_ACTION || 'execute';
  if (action === 'describe') {
    const schema = {
      name: 'deepsearch__add_question',
      description: 'Add a question to an existing Deep Search conversation. Optionally request async processing.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'number', description: 'Conversation ID' },
          question: { type: 'string', description: 'Your question text' },
          prefer_async: { type: 'boolean', description: 'If true, send Prefer: respond-async and return 202 + processing status.' },
        },
        required: ['id', 'question'],
      },
    };
    process.stdout.write(JSON.stringify(schema, null, 2) + '\n');
    return;
  }

  try {
    const input = await readStdinJson();
    const id = getParam(input, 'id', true, 'number');
    const question = getParam(input, 'question', true, 'string');
    const preferAsync = getParam(input, 'prefer_async', false, 'boolean') || false;

    const { baseUrl, token, xrw, timeout } = getConfig();
    const url = new URL(`/\.api/deepsearch/v1/${encodeURIComponent(String(id))}/questions`.replace('%2F','/'), baseUrl);
    const headers = baseHeaders(token, xrw);
    if (preferAsync) headers['Prefer'] = 'respond-async';
    headers['Content-Type'] = 'application/json';

    // API examples show conversation_id in body; include it alongside path ID for consistency
    const body = JSON.stringify({ conversation_id: id, question });
    const json = await doRequest('POST', url, headers, body, timeout);
    // Extract only essential fields from the verbose response
    const simplified = {
      id: json.id,
      conversation_id: json.conversation_id,
      question: json.question,
      title: json.title,
      answer: json.answer,
      sources: json.sources,
      status: json.status
    };
    print(simplified);
  } catch (err) {
    errorExit(err.message || String(err));
  }
}

function getConfig() {
  const baseUrl = process.env.DEEPSEARCH_BASE_URL || 'https://sourcegraph.test:3443';
  const token = process.env.SRC_ACCESS_TOKEN;
  if (!token) throw new Error('SRC_ACCESS_TOKEN environment variable is required');
  const xrw = process.env.X_REQUESTED_WITH || 'amp-toolbox 0.1.0';
  const timeout = parseInt(process.env.HTTP_TIMEOUT || '30', 10);
  return { baseUrl, token, xrw, timeout };
}

function baseHeaders(token, xrw) {
  return {
    'Accept': 'application/json',
    'X-Requested-With': xrw,
    'Authorization': `token ${token}`,
  };
}

function readStdinJson() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => (data += c));
    process.stdin.on('end', () => {
      if (!data.trim()) return resolve({});
      try { resolve(JSON.parse(data)); } catch { reject(new Error('stdin must be valid JSON')); }
    });
    process.stdin.on('error', reject);
  });
}

function getParam(obj, name, required, type) {
  const v = obj[name];
  if (required && (v === undefined || v === null || v === '')) throw new Error(`'${name}' required`);
  if (v !== undefined && v !== null) {
    if (type === 'number' && typeof v !== 'number') throw new Error(`'${name}' must be number`);
    if (type === 'string' && typeof v !== 'string') throw new Error(`'${name}' must be string`);
    if (type === 'boolean' && typeof v !== 'boolean') throw new Error(`'${name}' must be boolean`);
  }
  return v;
}

function doRequest(method, urlObj, headers, body, timeoutSec) {
  return new Promise((resolve, reject) => {
    const isHttp = urlObj.protocol === 'http:';
    const mod = isHttp ? http : https;

    const options = {
      method,
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttp ? 80 : 443),
      path: urlObj.pathname + (urlObj.search || ''),
      headers,
    };

    const req = mod.request(options, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        const status = res.statusCode || 0;
        if (status < 200 || status >= 300) {
          let msg = (data || '').slice(0, 256);
          try {
            const j = JSON.parse(data || '{}');
            msg = j.message || JSON.stringify(j);
          } catch {}
          const e = new Error(`HTTP ${status}: ${msg}`);
          e.statusCode = status;
          return reject(e);
        }
        try { resolve(JSON.parse(data || '{}')); } catch { resolve({}); }
      });
    });

    req.setTimeout((timeoutSec || 30) * 1000, () => {
      req.destroy(new Error('Request timeout'));
    });
    req.on('error', reject);

    if (body) req.write(body);
    req.end();
  });
}

function print(obj) {
  process.stdout.write(JSON.stringify(obj, null, 2) + '\n');
}

function errorExit(msg, code = 1) {
  process.stderr.write(String(msg) + '\n');
  process.exit(code);
}

main();
