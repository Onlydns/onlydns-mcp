import test from 'node:test';
import assert from 'node:assert/strict';
import { OnlyDNSClient, OnlyDNSError, ValidationError } from '@onlydns/sdk';
import { createOnlyDNSServer } from '../src/server.js';

test('OnlyDNSClient.listDomains calls GET /dns with pagination params', async () => {
  let capturedUrl = '';
  let capturedHeaders: Headers | undefined;

  const mockFetch: typeof fetch = async (input, init) => {
    capturedUrl = String(input);
    capturedHeaders = new Headers(init?.headers);
    return new Response(JSON.stringify(['example.com', 'example.org']), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const client = new OnlyDNSClient({
    apiToken: 'test-token',
    baseUrl: 'https://api.onlydns.com/v1',
    fetch: mockFetch,
  });

  const domains = await client.listDomains({ limit: 50, offset: 10 });
  assert.equal(capturedUrl, 'https://api.onlydns.com/v1/dns?offset=10&limit=50');
  assert.equal(capturedHeaders?.get('Authorization'), 'Bearer test-token');
  assert.deepEqual(domains, ['example.com', 'example.org']);
});

test('OnlyDNSClient.createDomain calls POST /dns with domain in body', async () => {
  let capturedUrl = '';
  let capturedMethod = '';
  let capturedBody = '';

  const mockFetch: typeof fetch = async (input, init) => {
    capturedUrl = String(input);
    capturedMethod = init?.method || '';
    capturedBody = String(init?.body || '');
    return new Response(null, { status: 201 });
  };

  const client = new OnlyDNSClient({
    apiToken: 'test-token',
    baseUrl: 'https://api.onlydns.com/v1',
    fetch: mockFetch,
  });

  await client.createDomain('newdomain.com');
  assert.equal(capturedUrl, 'https://api.onlydns.com/v1/dns');
  assert.equal(capturedMethod, 'POST');
  assert.deepEqual(JSON.parse(capturedBody), { domain: 'newdomain.com' });
});

test('OnlyDNSClient.getRecords calls GET /dns/{domain}/records', async () => {
  let capturedUrl = '';

  const mockFetch: typeof fetch = async (input) => {
    capturedUrl = String(input);
    return new Response(
      JSON.stringify([
        { name: 'example.com', type: 'A', ttl: 300, records: ['1.2.3.4'] },
      ]),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  };

  const client = new OnlyDNSClient({
    apiToken: 'test-token',
    baseUrl: 'https://api.onlydns.com/v1',
    fetch: mockFetch,
  });

  const records = await client.getRecords('example.com');
  assert.equal(capturedUrl, 'https://api.onlydns.com/v1/dns/example.com/records');
  assert.equal(records.length, 1);
  assert.equal(records[0].records[0], '1.2.3.4');
});

test('OnlyDNSClient.replaceRecords calls PUT /dns/{domain}/records', async () => {
  let capturedUrl = '';
  let capturedMethod = '';
  let capturedBody = '';

  const mockFetch: typeof fetch = async (input, init) => {
    capturedUrl = String(input);
    capturedMethod = init?.method || '';
    capturedBody = String(init?.body || '');
    return new Response(null, { status: 204 });
  };

  const client = new OnlyDNSClient({
    apiToken: 'test-token',
    baseUrl: 'https://api.onlydns.com/v1',
    fetch: mockFetch,
  });

  await client.replaceRecords('example.com', [
    { name: 'example.com', type: 'A', ttl: 300, records: ['1.2.3.4'] },
  ]);

  assert.equal(capturedUrl, 'https://api.onlydns.com/v1/dns/example.com/records');
  assert.equal(capturedMethod, 'PUT');
  assert.deepEqual(JSON.parse(capturedBody), [
    { name: 'example.com.', type: 'A', ttl: 300, records: ['1.2.3.4'] },
  ]);
});

test('OnlyDNSClient.enableDnssec calls POST /dns/{domain}/dnssec', async () => {
  let capturedUrl = '';
  let capturedMethod = '';

  const mockFetch: typeof fetch = async (input, init) => {
    capturedUrl = String(input);
    capturedMethod = init?.method || '';
    return new Response(null, { status: 201 });
  };

  const client = new OnlyDNSClient({
    apiToken: 'test-token',
    baseUrl: 'https://api.onlydns.com/v1',
    fetch: mockFetch,
  });

  await client.enableDnssec('example.com');
  assert.equal(capturedUrl, 'https://api.onlydns.com/v1/dns/example.com/dnssec');
  assert.equal(capturedMethod, 'POST');
});

test('OnlyDNSClient.disableDnssec calls DELETE /dns/{domain}/dnssec', async () => {
  let capturedUrl = '';
  let capturedMethod = '';

  const mockFetch: typeof fetch = async (input, init) => {
    capturedUrl = String(input);
    capturedMethod = init?.method || '';
    return new Response(null, { status: 204 });
  };

  const client = new OnlyDNSClient({
    apiToken: 'test-token',
    baseUrl: 'https://api.onlydns.com/v1',
    fetch: mockFetch,
  });

  await client.disableDnssec('example.com');
  assert.equal(capturedUrl, 'https://api.onlydns.com/v1/dns/example.com/dnssec');
  assert.equal(capturedMethod, 'DELETE');
});

test('OnlyDNSClient translates API error responses', async () => {
  const mockFetch: typeof fetch = async () => {
    return new Response(
      JSON.stringify({
        title: 'Validation Error',
        errorCode: 4001,
        description: ['Invalid record data', 'TTL must be >= 1'],
      }),
      {
        status: 400,
        statusText: 'Bad Request',
        headers: { 'Content-Type': 'application/json' },
      }
    );
  };

  const client = new OnlyDNSClient({
    apiToken: 'test-token',
    baseUrl: 'https://api.onlydns.com/v1',
    fetch: mockFetch,
  });

  await assert.rejects(
    async () => {
      await client.getRecords('example.com');
    },
    (err: unknown) => {
      assert(err instanceof ValidationError);
      assert(err instanceof OnlyDNSError);
      assert.equal(err.statusCode, 400);
      assert.deepEqual(err.details, ['Invalid record data', 'TTL must be >= 1']);
      assert.match(err.message, /Validation Error/);
      return true;
    }
  );
});

test('OnlyDNSClient.getDomainTsig calls GET /dns/{domain}/tsig', async () => {
  let capturedUrl = '';

  const mockFetch: typeof fetch = async (input) => {
    capturedUrl = String(input);
    return new Response(
      JSON.stringify({
        'key-123': {
          allowAxfr: false,
          allowDnsUpdate: true,
          subdomains: ['_acme_challenge'],
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  };

  const client = new OnlyDNSClient({
    apiToken: 'test-token',
    baseUrl: 'https://api.onlydns.com/v1',
    fetch: mockFetch,
  });

  const tsig = await client.getDomainTsig('example.com');
  assert.equal(capturedUrl, 'https://api.onlydns.com/v1/dns/example.com/tsig');
  assert.deepEqual(tsig, {
    'key-123': {
      allowAxfr: false,
      allowDnsUpdate: true,
      subdomains: ['_acme_challenge'],
    },
  });
});

test('OnlyDNSClient.updateDomainTsig calls PATCH /dns/{domain}/tsig/{key} with subdomains', async () => {
  let capturedUrl = '';
  let capturedMethod = '';
  let capturedBody = '';

  const mockFetch: typeof fetch = async (input, init) => {
    capturedUrl = String(input);
    capturedMethod = init?.method || '';
    capturedBody = String(init?.body || '');
    return new Response(null, { status: 204 });
  };

  const client = new OnlyDNSClient({
    apiToken: 'test-token',
    baseUrl: 'https://api.onlydns.com/v1',
    fetch: mockFetch,
  });

  await client.updateDomainTsig('example.com', 'key-test', false, true, ['_acme_challenge', 'dev']);
  assert.equal(capturedUrl, 'https://api.onlydns.com/v1/dns/example.com/tsig/key-test');
  assert.equal(capturedMethod, 'PATCH');
  assert.deepEqual(JSON.parse(capturedBody), {
    allowAxfr: false,
    allowDnsUpdate: true,
    subdomains: ['_acme_challenge', 'dev'],
  });
});

test('createOnlyDNSServer initializes McpServer with tools', () => {
  const { server, client } = createOnlyDNSServer({
    apiToken: 'test-token',
    baseUrl: 'https://api.onlydns.com/v1',
  });

  assert.ok(server);
  assert.ok(client);
});

test('OnlyDNSClient account and OIDC methods call appropriate endpoints', async () => {
  const calls: { url: string; method: string; body?: unknown } = { url: '', method: '' };

  const mockFetch: typeof fetch = async (input, init) => {
    calls.url = String(input);
    calls.method = init?.method || 'GET';
    calls.body = init?.body ? JSON.parse(String(init.body)) : undefined;

    if (calls.url.endsWith('/account') && calls.method === 'GET') {
      return new Response(
        JSON.stringify({
          accountId: '018f1234-5678-7000-8000-000000000001',
          companyName: 'Acme Corporation',
          package: {
            id: 'pkg-1',
            description: 'Enterprise Tier',
            amount: 49.99,
            features: {
              domains: 50,
              records: 5000,
              queries: 1000000,
              dnssec: true,
              tsig: true,
              proxy: true,
              customSSO: true,
            },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (calls.url.endsWith('/account/oidc') && calls.method === 'GET') {
      return new Response(
        JSON.stringify({
          configured: true,
          discoveryUrl: 'https://idp.example.com/.well-known/openid-configuration',
          clientId: 'client-123',
          enforceSso: true,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (calls.url.endsWith('/account/oidc') && calls.method === 'POST') {
      return new Response(
        JSON.stringify({
          configured: true,
          discoveryUrl: (calls.body as { discoveryUrl?: string })?.discoveryUrl,
          clientId: (calls.body as { clientId?: string })?.clientId,
          enforceSso: (calls.body as { enforceSso?: boolean })?.enforceSso,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (calls.url.endsWith('/account/oidc') && calls.method === 'DELETE') {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'OIDC configuration removed successfully',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (calls.url.endsWith('/account/oidc/test') && calls.method === 'POST') {
      return new Response(
        JSON.stringify({
          success: true,
          issuer: 'https://idp.example.com',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(null, { status: 404 });
  };

  const client = new OnlyDNSClient({
    apiToken: 'test-token',
    baseUrl: 'https://api.onlydns.com/v1',
    fetch: mockFetch,
  });

  // 1. getAccount
  const acc = await client.getAccount();
  assert.equal(calls.url, 'https://api.onlydns.com/v1/account');
  assert.equal(acc.accountId, '018f1234-5678-7000-8000-000000000001');
  assert.equal(acc.package?.features.customSSO, true);

  // 2. getAccountOidc
  const oidc = await client.getAccountOidc();
  assert.equal(calls.url, 'https://api.onlydns.com/v1/account/oidc');
  assert.equal(oidc.configured, true);

  // 3. saveAccountOidc
  const saved = await client.saveAccountOidc({
    discoveryUrl: 'https://idp.example.com/.well-known/openid-configuration',
    clientId: 'client-123',
    enforceSso: true,
  });
  assert.equal(calls.url, 'https://api.onlydns.com/v1/account/oidc');
  assert.equal(saved.enforceSso, true);

  // 4. testAccountOidc
  const testRes = await client.testAccountOidc('https://idp.example.com/.well-known/openid-configuration');
  assert.equal(calls.url, 'https://api.onlydns.com/v1/account/oidc/test');
  assert.equal(testRes.success, true);

  // 5. deleteAccountOidc
  const delRes = await client.deleteAccountOidc();
  assert.equal(calls.url, 'https://api.onlydns.com/v1/account/oidc');
  assert.equal(delRes.success, true);
});
