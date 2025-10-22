#!/usr/bin/env node
const http = require('http');
const https = require('https');
const { URL } = require('url');

async function main() {
  const action = process.env.TOOLBOX_ACTION || 'execute';
  if (action === 'describe') {
    const schema = {
      name: 'deepsearch__poll_question',
      description: 'Poll a Deep Search question until it completes or times out. This tool implements the recommended polling strategy: checks every 10 seconds for up to 300 seconds (5 minutes). Use this after creating an async conversation to wait for results.',
      inputSchema: {
        type: 'object',
        properties: {
          conversation_id: { type: 'number', description: 'Conversation ID' },
          question_id: { type: 'number', description: 'Question ID' },
          poll_interval: { type: 'number', description: 'Polling interval in seconds (default: 10)' },
          max_wait: { type: 'number', description: 'Maximum wait time in seconds (default: 300)' },
        },
        required: ['conversation_id', 'question_id'],
      },
    };
    process.stdout.write(JSON.stringify(schema, null, 2) + '\n');
    return;
  }

  try {
    const input = await readStdinJson();
    const conversationId = getParam(input, 'conversation_id', true, 'number');
    const questionId = getParam(input, 'question_id', true, 'number');
    const pollInterval = getParam(input, 'poll_interval', false, 'number') || 10;
    const maxWait = getParam(input, 'max_wait', false, 'number') || 300;

    const { baseUrl, token, xrw, timeout } = getConfig();
    const url = new URL(`/.api/deepsearch/v1/${conversationId}`, baseUrl);
    const headers = baseHeaders(token, xrw);

    const maxAttempts = Math.ceil(maxWait / pollInterval);
    let attempt = 0;

    while (attempt < maxAttempts) {
      attempt++;
      
      try {
        const convJson = await doRequest('GET', url, headers, null, timeout);
        // Find the specific question in the conversation
        const json = convJson.questions?.find(q => q.id === questionId);
        if (!json) {
          errorExit(`Question ${questionId} not found in conversation ${conversationId}`);
        }
        const status = json.status;

        // Show progress - use console.log to ensure it flushes immediately
        const elapsed = attempt * pollInterval;
        console.log(`⏳ Polling attempt ${attempt}/${maxAttempts} (${elapsed}s elapsed) - status: ${status}`);

        if (status === 'completed') {
          // Return the completed question
          const simplified = {
            id: json.id,
            conversation_id: json.conversation_id,
            question: json.question,
            title: json.title,
            answer: json.answer,
            sources: json.sources,
            status: json.status,
            polling_info: {
              attempts: attempt,
              elapsed_seconds: elapsed
            }
          };
          console.log('\n✅ Question completed!\n');
          print(simplified);
          return;
        } else if (status === 'failed') {
          errorExit(`Question failed: ${json.failure_message || 'Unknown error'}`);
        }

        // Still processing
        if (attempt < maxAttempts) {
          await sleep(pollInterval * 1000);
        }
      } catch (reqErr) {
        errorExit(`Error polling question: ${reqErr.message}`);
      }
    }

    // Timed out
    errorExit(`Timeout: Question did not complete within ${maxWait} seconds (${maxAttempts} attempts)`);
  } catch (err) {
    errorExit(err.message || String(err));
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
