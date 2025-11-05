#!/usr/bin/env node
const http = require('http');
const https = require('https');
const { URL, URLSearchParams } = require('url');

async function main() {
  const action = process.env.TOOLBOX_ACTION || 'execute';
  if (action === 'describe') {
    const schema = {
      name: 'deepsearch__create_conv',
      description: 'Create a new Deep Search conversation by asking a question. Use this tool when users need to investigate code across their entire enterprise\'s remote repositories - it\'s perfect for questions like "how is authentication implemented across all our microservices" when those services span multiple repos the user hasn\'t cloned locally. Provide natural language queries and let it autonomously search across all accessible repositories using its parallel tool execution to build comprehensive cross-repo understanding. Leverage it for enterprise-scale code discovery where manual repository exploration would be impractical, but remember it can\'t do exhaustive searches.\n\nIMPORTANT: Deep Search queries typically take 1-2 minutes to process. By default (prefer_async:true), this tool will automatically poll for results every 10 seconds for up to 5 minutes, returning the completed answer when ready.',
      inputSchema: {
        type: 'object',
        properties: {
          question: { type: 'string', description: 'Your question to ask.' },
          prefer_async: { type: 'boolean', description: 'If true, send Prefer: respond-async and return 202 + processing status.' },
        },
        required: ['question'],
      },
    };
    process.stdout.write(JSON.stringify(schema, null, 2) + '\n');
    return;
  }

  try {
    const input = await readStdinJson();
    const question = getParam(input, 'question', true, 'string');
    const preferAsync = getParam(input, 'prefer_async', false, 'boolean');
    // Default to true if not specified (async is recommended to avoid timeouts)
    const useAsync = preferAsync !== undefined ? preferAsync : true;

    const { baseUrl, token, xrw, timeout } = getConfig();

    const url = new URL('/.api/deepsearch/v1', baseUrl);
    const headers = baseHeaders(token, xrw);
    if (useAsync) headers['Prefer'] = 'respond-async';
    headers['Content-Type'] = 'application/json';

    const body = JSON.stringify({ question });
    try {
      const json = await doRequest('POST', url, headers, body, timeout);
      
      // If async and status is processing, auto-poll
      if (useAsync && json.questions?.[0]?.status === 'processing') {
        const convId = json.id;
        const questionId = json.questions[0].id;
        console.log(`🔄 Question created (ID: ${questionId}). Starting automatic polling...\n`);
        const result = await pollUntilComplete(convId, questionId, baseUrl, token, xrw, timeout);
        print(result);
      } else {
        // Extract only essential fields from the verbose response
        const simplified = {
          id: json.id,
          questions: json.questions?.map(q => ({
            id: q.id,
            question: q.question,
            title: q.title,
            answer: q.answer,
            sources: q.sources,
            status: q.status
          })) || []
        };
        print(simplified);
      }
    } catch (reqErr) {
      // Provide helpful message for timeout errors
      if (reqErr.message && reqErr.message.includes('timeout')) {
        const helpMsg = useAsync 
          ? 'Request timed out. This is unexpected with async mode. Check your connection or try increasing HTTP_TIMEOUT.'
          : 'Request timed out. Deep Search queries take 1-2 minutes. Try using prefer_async:true to avoid timeouts.';
        errorExit(`${reqErr.message}\n\n${helpMsg}`);
      }
      throw reqErr;
    }
  } catch (err) {
    errorExit(err.message || String(err));
  }
}

function getConfig() {
  const baseUrl = process.env.DEEPSEARCH_BASE_URL || 'https://sourcegraph.test:3443';
  const token = process.env.SRC_ACCESS_TOKEN;
  if (!token) throw new Error('SRC_ACCESS_TOKEN environment variable is required');
  const xrw = process.env.X_REQUESTED_WITH || 'amp-toolbox 0.1.0';
  // Async requests need less timeout (just getting 202), sync needs more (up to 60s before Cloudflare timeout)
  const timeout = parseInt(process.env.HTTP_TIMEOUT || '70', 10);
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
  if (required && (v === undefined || v === null || v === '')) {
    throw new Error(`'${name}' required`);
  }
  if (v !== undefined && v !== null) {
    if (type === 'string' && typeof v !== 'string') throw new Error(`'${name}' must be string`);
    if (type === 'boolean' && typeof v !== 'boolean') throw new Error(`'${name}' must be boolean`);
    if (type === 'number' && typeof v !== 'number') throw new Error(`'${name}' must be number`);
  }
  return v;
}

async function pollUntilComplete(conversationId, questionId, baseUrl, token, xrw, timeout) {
  const pollInterval = 10; // seconds
  const maxWait = 300; // seconds (5 minutes)
  const maxAttempts = Math.ceil(maxWait / pollInterval);
  let attempt = 0;

  const url = new URL(`/.api/deepsearch/v1/${conversationId}`, baseUrl);
  const headers = baseHeaders(token, xrw);

  while (attempt < maxAttempts) {
    attempt++;
    
    try {
      const convJson = await doRequest('GET', url, headers, null, timeout);
      const json = convJson.questions?.find(q => q.id === questionId);
      if (!json) {
        throw new Error(`Question ${questionId} not found in conversation ${conversationId}`);
      }
      const status = json.status;

      const elapsed = attempt * pollInterval;
      console.log(`⏳ Polling attempt ${attempt}/${maxAttempts} (${elapsed}s elapsed) - status: ${status}`);

      if (status === 'completed') {
        console.log('\n✅ Question completed!\n');
        return {
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
      } else if (status === 'failed') {
        throw new Error(`Question failed: ${json.failure_message || 'Unknown error'}`);
      }

      if (attempt < maxAttempts) {
        await sleep(pollInterval * 1000);
      }
    } catch (reqErr) {
      throw new Error(`Error polling question: ${reqErr.message}`);
    }
  }

  throw new Error(`Timeout: Question did not complete within ${maxWait} seconds (${maxAttempts} attempts)`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
