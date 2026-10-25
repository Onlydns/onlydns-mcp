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
  assert.equal(mx.name, 'example.com.');
  assert.deepEqual(mx.records, ['10 mail.example.com.']);

  // All records sent over PUT must have trailing dots
  for (const r of inMemoryRecords) {
    assert.ok(r.name.endsWith('.'), `Record name "${r.name}" must end with a trailing dot`);
  }

  // 3. Delete CNAME record using SDK removeRecord helper with relative name
  await client.removeRecord('example.com', 'www', 'CNAME');

  const records3 = await client.getRecords('example.com');
  assert.equal(records3.length, 2);
  assert.equal(records3.find((r) => r.type === 'CNAME'), undefined);

  // 4. Test 3 ways of adding and updating records (relative, domain-qualified without trailing dot, full canonical FQDN)
  // Way 1: Relative name "testing"
  await client.addRecord('example.com', 'testing', 'A', '1.2.3.4', 300);
  let recs = await client.getRecords('example.com');
  let testingRec = recs.find((r) => r.name === 'testing.example.com.');
  assert.ok(testingRec);
  assert.deepEqual(testingRec.records, ['1.2.3.4']);

  // Way 2: Domain-qualified name without trailing period "testing.example.com"
  await client.updateRecord('example.com', 'testing.example.com', 'A', ['5.6.7.8'], 600);
  recs = await client.getRecords('example.com');
  testingRec = recs.find((r) => r.name === 'testing.example.com.');
  assert.ok(testingRec);
  assert.deepEqual(testingRec.records, ['5.6.7.8']);
  assert.equal(testingRec.ttl, 600);

  // Way 3: Full canonical FQDN with trailing period "testing.example.com."
  await client.removeRecord('example.com', 'testing.example.com.', 'A');
  recs = await client.getRecords('example.com');
  assert.equal(recs.find((r) => r.name === 'testing.example.com.'), undefined);
});
