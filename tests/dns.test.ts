import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeDomain,
  normalizeRecordName,
  normalizeRecordType,
  filterRecords,
} from '../src/utils/dns.js';
import { DNSRecord } from '@onlydns/sdk';

test('normalizeDomain cleans trailing dots and lowercases', () => {
  assert.equal(normalizeDomain('EXAMPLE.COM.'), 'example.com');
  assert.equal(normalizeDomain('  Sub.Example.Com  '), 'sub.example.com');
});

test('normalizeRecordName handles @, relative, domain-qualified, and canonical FQDN hosts consistently', () => {
  // Case 1: Without domain (relative)
  assert.equal(normalizeRecordName('testing', 'example.com'), 'testing.example.com.');
  assert.equal(normalizeRecordName('www', 'example.com'), 'www.example.com.');
  assert.equal(normalizeRecordName('@', 'example.com'), 'example.com.');
  assert.equal(normalizeRecordName('', 'example.com'), 'example.com.');
  assert.equal(normalizeRecordName('sub.dev', 'example.com'), 'sub.dev.example.com.');

  // Case 2: With domain but without trailing dot
  assert.equal(normalizeRecordName('testing.example.com', 'example.com'), 'testing.example.com.');
  assert.equal(normalizeRecordName('example.com', 'example.com'), 'example.com.');
  assert.equal(normalizeRecordName('www.example.com', 'example.com'), 'www.example.com.');
  assert.equal(normalizeRecordName('sub.dev.example.com', 'example.com'), 'sub.dev.example.com.');

  // Case 3: Full canonical FQDN with trailing dot
  assert.equal(normalizeRecordName('testing.example.com.', 'example.com'), 'testing.example.com.');
  assert.equal(normalizeRecordName('example.com.', 'example.com'), 'example.com.');
  assert.equal(normalizeRecordName('www.example.com.', 'example.com'), 'www.example.com.');
  assert.equal(normalizeRecordName('sub.dev.example.com.', 'example.com'), 'sub.dev.example.com.');
});

test('normalizeRecordType converts to uppercase', () => {
  assert.equal(normalizeRecordType('a'), 'A');
  assert.equal(normalizeRecordType('cname'), 'CNAME');
  assert.equal(normalizeRecordType('txt '), 'TXT');
});

test('filterRecords filters by type and name', () => {
  const records: DNSRecord[] = [
    { name: 'example.com', type: 'A', ttl: 300, records: ['1.2.3.4'] },
    { name: 'www.example.com', type: 'CNAME', ttl: 300, records: ['example.com'] },
    { name: 'mail.example.com', type: 'MX', ttl: 300, records: ['10 mail.example.com'] },
  ];

  const filteredByType = filterRecords(records, { type: 'CNAME' });
  assert.equal(filteredByType.length, 1);
  assert.equal(filteredByType[0].name, 'www.example.com');

  const filteredByName = filterRecords(records, { name: 'www', domainName: 'example.com' });
  assert.equal(filteredByName.length, 1);
  assert.equal(filteredByName[0].type, 'CNAME');
});
