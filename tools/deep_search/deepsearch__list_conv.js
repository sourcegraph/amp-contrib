#!/usr/bin/env node
const http = require('http');
const https = require('https');
const { URL, URLSearchParams } = require('url');

async function main() {
  const action = process.env.TOOLBOX_ACTION || 'execute';
  if (action === 'describe') {
    const schema = {
      name: 'deepsearch__list_conv',
      description: 'List Deep Search conversations with optional filters and pagination.',
      inputSchema: {
        type: 'object',
        properties: {
          filter_id: { type: 'string', description: 'Filter by conversation ID' },
          filter_user_id: { type: 'string', description: 'Filter by user ID' },
          filter_read_token: { type: 'string', description: 'Filter by read token' },
          page_first: { type: 'number', description: 'Number of results per page' },
          page_after: { type: 'string', description: 'Pagination cursor' },
          sort: { type: 'string', description: 'Sort order (created_at, -created_at, id, -id, updated_at, -updated_at)' },
        },
      },
    };
    process.stdout.write(JSON.stringify(schema, null, 2) + '\n');
    return;
  }

  try {
    const input = await readStdinJson();
    const { baseUrl, token, xrw, timeout } = getConfig();

    const url = new URL('/.api/deepsearch/v1', baseUrl);
    const params = new URLSearchParams();
    if (isString(input.filter_id)) params.set('filter_id', input.filter_id);
    if (isString(input.filter_user_id)) params.set('filter_user_id', input.filter_user_id);
    if (isString(input.filter_read_token)) params.set('filter_read_token', input.filter_read_token);
    if (isNumber(input.page_first)) params.set('page_first', String(input.page_first));
    if (isString(input.page_after)) params.set('page_after', input.page_after);
    if (isString(input.sort)) params.set('sort', input.sort);
    const qs = params.toString();
    if (qs) url.search = '?' + qs;

    const headers = baseHeaders(token, xrw);
    const json = await doRequest('GET', url, headers, null, timeout);
    // Extract only essential fields from conversations list
    const simplified = Array.isArray(json) ? json.map(conv => ({
      id: conv.id,
      created_at: conv.created_at,
      updated_at: conv.updated_at,
      questions: conv.questions?.map(q => ({
        id: q.id,
        question: q.question,
        title: q.title,
        answer: q.answer,
        sources: q.sources,
        status: q.status
      })) || []
    })) : json;
    print(simplified);
  } catch (err) {
    errorExit(err.message || String(err));
  }
}

function isString(v) { return typeof v === 'string' && v.length > 0; }
function isNumber(v) { return typeof v === 'number' && !isNaN(v); }

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
