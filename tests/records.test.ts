import test from 'node:test';
import assert from 'node:assert/strict';
import { OnlyDNSClient, DNSRecord } from '@onlydns/sdk';

test('Record manipulation - add, update, delete flow', async () => {
  let inMemoryRecords: DNSRecord[] = [
    { name: 'example.com', type: 'A', ttl: 300, records: ['1.2.3.4'] },
    { name: 'www.example.com', type: 'CNAME', ttl: 300, records: ['example.com.'] },
  ];

  const mockFetch: typeof fetch = async (input, init) => {
    if (init?.method === 'GET') {
      return new Response(JSON.stringify(inMemoryRecords), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (init?.method === 'PUT') {
      inMemoryRecords = JSON.parse(init.body as string);
      return new Response(null, { status: 204 });
    }
    return new Response('Not found', { status: 404 });
  };

  const client = new OnlyDNSClient({
    apiToken: 'token-123',
    baseUrl: 'https://api.onlydns.com/v1',
    fetch: mockFetch,
  });

  // 1. Initial get
  const records1 = await client.getRecords('example.com');
  assert.equal(records1.length, 2);

  // 2. Add an MX record using SDK addRecord helper
  await client.addRecord('example.com', 'example.com', 'MX', '10 mail.example.com.', 300);

  const records2 = await client.getRecords('example.com');
  assert.equal(records2.length, 3);
  const mx = records2.find((r) => r.type === 'MX');
  assert.ok(mx);
  assert.deepEqual(mx.records, ['10 mail.example.com.']);

  // 3. Delete CNAME record using SDK removeRecord helper
  await client.removeRecord('example.com', 'www.example.com', 'CNAME');

  const records3 = await client.getRecords('example.com');
  assert.equal(records3.length, 2);
  assert.equal(records3.find((r) => r.type === 'CNAME'), undefined);
});
