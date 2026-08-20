'use strict';

const { app } = require('@azure/functions');
const { randomUUID } = require('node:crypto');
const { validateSubscription } = require('./validation');
const { findSubscription, createSubscription } = require('./cosmos');

function jsonResponse(status, body) {
  return { status, jsonBody: body };
}

async function readJsonBody(request) {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

// Resolves the real visitor IP even when requests arrive through a proxy
// (e.g. the Netlify redirect in netlify.toml), which forwards the original
// client address in X-Forwarded-For rather than the proxy's own IP.
function getClientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // The header can carry a chain (client, proxy1, proxy2, ...); the first
    // entry is the original caller.
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-azure-clientip') || 'unknown';
}

app.http('subscriptions', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'subscriptions',
  handler: async (request, context) => {
    const clientIp = getClientIp(request);
    const body = await readJsonBody(request);
    if (body === undefined) {
      return jsonResponse(400, { error: 'Request body must be valid JSON.' });
    }

    const result = validateSubscription(body);
    if (!result.valid) {
      context.log(`Validation failed for request from ${clientIp}`);
      return jsonResponse(400, { error: 'Validation failed.', details: result.errors });
    }

    // `rest` carries the optional masked card details (brand, last 4, expiry).
    const { firstName, lastName, email, plan, price, cvv,...rest } = result.value;
    try {
      // Re-subscribing to the same plan is a conflict, not a duplicate row:
      // respond 409 so it's correctly counted as a failed/duplicate request
      // in AppRequests (ResultCode 409) for alerting, instead of silently
      // masquerading as a 200 success.
      const existing = await findSubscription(email, plan);
      if (existing) {
        context.log(`409 Conflict: duplicate subscription attempt for plan "${plan}" (request from ${clientIp})`);
        return jsonResponse(409, {
          error: 'A subscription for this email and plan already exists.',
          id: existing.id,
          plan,
          price,
          createdAt: existing.createdAt,
          alreadySubscribed: true,
        });
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

      context.log(`Stored subscription ${saved.id} for plan "${plan}" (request from ${clientIp})`);
      return jsonResponse(201, {
        id: saved.id,
        plan,
        price,
        createdAt: saved.createdAt,
        alreadySubscribed: false,
      });
    } catch (error) {
      // Log the failure, never the submitted personal data.
      context.error(`Failed to store subscription (request from ${clientIp})`, error);

      // Temporary diagnostics: only when DEBUG_ERRORS=1 is set as an app
      // setting, so production responses never leak internal details.
      const debug = process.env.DEBUG_ERRORS === '1'
        ? { code: error.code, message: error.message }
        : undefined;

      return jsonResponse(500, {
        error: 'Could not store the subscription. Please try again later.',
        debug,
      });
    }
  },
});
