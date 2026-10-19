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
    { name: 'example.com', type: 'A', ttl: 300, records: ['1.2.3.4'] },
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

test('createOnlyDNSServer initializes McpServer with tools', () => {
  const { server, client } = createOnlyDNSServer({
    apiToken: 'test-token',
    baseUrl: 'https://api.onlydns.com/v1',
  });

  assert.ok(server);
  assert.ok(client);
});
