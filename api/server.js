'use strict';

/**
 * Plain Node HTTP server exposing POST /api/subscriptions, for running on a
 * VM/container instead of Azure Functions (see api/index.js for the SWA
 * equivalent). Reuses validation.js and cosmos.js unchanged - only the
 * request/response transport differs.
 */

const http = require('node:http');
const { randomUUID } = require('node:crypto');
const { validateSubscription } = require('./validation');
const { findSubscription, createSubscription } = require('./cosmos');

const PORT = process.env.PORT || 3000;
const MAX_BODY_BYTES = 1024 * 1024; // 1MB guard against oversized payloads

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

function readJsonBody(req) {
  return new Promise((resolve) => {
    let size = 0;
    const chunks = [];

    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        req.destroy();
        resolve(undefined);
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        resolve(undefined);
      }
    });

    req.on('error', () => resolve(undefined));
  });
}

async function handleSubscriptions(req, res) {
  const body = await readJsonBody(req);
  if (body === undefined) {
    sendJson(res, 400, { error: 'Request body must be valid JSON.' });
    return;
  }

  const result = validateSubscription(body);
  if (!result.valid) {
    sendJson(res, 400, { error: 'Validation failed.', details: result.errors });
    return;
  }

  // `rest` carries the optional masked card details (brand, last 4, expiry).
  const { firstName, lastName, email, plan, price, cvv, ...rest } = result.value;
  try {
    // Re-subscribing to the same plan is a no-op rather than a duplicate row.
    const existing = await findSubscription(email, plan);
    if (existing) {
      console.log(`Subscription already exists for plan "${plan}"`);
      sendJson(res, 200, {
        id: existing.id,
        plan,
        price,
        createdAt: existing.createdAt,
        alreadySubscribed: true,
      });
      return;
    }

    const saved = await createSubscription({
      id: randomUUID(),
      type: 'subscription',
      firstName,
      lastName,
      email,
      plan,
      price,
      cvv,
      ...rest,
      source: 'web',
      createdAt: new Date().toISOString(),
    });

    console.log(`Stored subscription ${saved.id} for plan "${plan}"`);
    sendJson(res, 201, {
      id: saved.id,
      plan,
      price,
      createdAt: saved.createdAt,
      alreadySubscribed: false,
    });
  } catch (error) {
    // Log the failure, never the submitted personal data.
    console.error('Failed to store subscription', error);

    // Temporary diagnostics: only when DEBUG_ERRORS=1 is set as an env var,
    // so production responses never leak internal details.
    const debug = process.env.DEBUG_ERRORS === '1'
      ? { code: error.code, message: error.message }
      : undefined;

    sendJson(res, 500, {
      error: 'Could not store the subscription. Please try again later.',
      debug,
    });
  }
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/subscriptions') {
    handleSubscriptions(req, res).catch((error) => {
      console.error('Unhandled error in /api/subscriptions', error);
      sendJson(res, 500, { error: 'Internal server error.' });
    });
    return;
  }

  if (req.method === 'GET' && req.url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok\n');
    return;
  }

  sendJson(res, 404, { error: 'Not found.' });
});

server.listen(PORT, () => {
  console.log(`Subscriptions API listening on port ${PORT}`);
});

module.exports = server;
