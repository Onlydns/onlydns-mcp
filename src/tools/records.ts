import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { OnlyDNSClient, DNSRecord, RecordType } from '@onlydns/sdk';
import {
  filterRecords,
  normalizeDomain,
  normalizeRecordName,
  normalizeRecordType,
} from '../utils/dns.js';

export function registerRecordTools(server: McpServer, client: OnlyDNSClient): void {
  // 1. List Records
  server.tool(
    'list_records',
    'List all DNS records for a domain, with optional filtering by record type (A, AAAA, CNAME, MX, TXT, etc.) or hostname.',
    {
      domainName: z.string().describe('The domain name to list records for (e.g. example.com)'),
      type: z
        .string()
        .optional()
        .describe('Filter by record type (e.g. A, AAAA, CNAME, MX, TXT, SRV, CAA, NS)'),
      name: z
        .string()
        .optional()
        .describe(
          'Filter by record name/hostname. Accepts relative subdomain (e.g. "testing", "@", "www"), domain-qualified name (e.g. "testing.example.com"), or full canonical FQDN (e.g. "testing.example.com.").'
        ),
    },
    async ({ domainName, type, name }) => {
      try {
        const cleanDomain = normalizeDomain(domainName);
        const records = await client.getRecords(cleanDomain);
        const filtered = filterRecords(records, {
          domainName: cleanDomain,
          type,
          name,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  domain: cleanDomain,
                  totalRecords: filtered.length,
                  filter: {
                    type: type ? normalizeRecordType(type) : undefined,
                    name: name || undefined,
                  },
                  records: filtered,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (err: unknown) {
        const error = err as Error;
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching records for "${domainName}": ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // 2. Add Record
  server.tool(
    'add_record',
    'Add a DNS record to a domain. Accepts relative hostnames (e.g. "testing"), domain-qualified names (e.g. "testing.example.com"), or canonical FQDNs (e.g. "testing.example.com."). If a record with the same name and type already exists, the new value is appended to the record set.',
    {
      domainName: z.string().describe('Domain name (e.g. example.com)'),
      name: z
        .string()
        .describe(
          'Record name/subdomain. Accepts relative name (e.g. "testing", "www", "@"), domain-qualified name (e.g. "testing.example.com"), or full canonical FQDN (e.g. "testing.example.com."). Canonicalization is handled automatically.'
        ),
      type: z
        .string()
        .describe(
          'DNS record type (e.g. A, AAAA, CNAME, MX, TXT, SRV, CAA, NS, URL, PROXY)'
        ),
      value: z
        .union([z.string(), z.array(z.string())])
        .describe(
          'Record content/value (e.g. "1.2.3.4", "v=spf1 include:... ~all", "10 mail.example.com"). Can be a single string or array of strings.'
        ),
      ttl: z
        .number()
        .min(1)
        .optional()
        .default(300)
        .describe('Time to live in seconds (default: 300)'),
    },
    async ({ domainName, name, type, value, ttl }) => {
      try {
        const cleanDomain = normalizeDomain(domainName);
        const cleanName = normalizeRecordName(name, cleanDomain);
        const cleanType = normalizeRecordType(type);
        const newValues = Array.isArray(value) ? value : [value];

        await client.addRecord(cleanDomain, cleanName, cleanType as RecordType, newValues, ttl ?? 300);

        return {
          content: [
            {
              type: 'text',
              text: `Successfully added ${cleanType} record for "${cleanName}" in domain "${cleanDomain}".\nValues: ${newValues.join(', ')} (TTL: ${ttl ?? 300})`,
            },
          ],
        };
      } catch (err: unknown) {
        const error = err as Error;
        return {
          content: [
            {
              type: 'text',
              text: `Error adding record to "${domainName}": ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // 3. Update Record
  server.tool(
    'update_record',
    'Update an existing DNS record set for a given name and type, completely replacing its values and/or TTL. Accepts relative names (e.g. "testing"), domain-qualified names (e.g. "testing.example.com"), or canonical FQDNs (e.g. "testing.example.com.").',
    {
      domainName: z.string().describe('Domain name (e.g. example.com)'),
      name: z
        .string()
        .describe(
          'Record name/subdomain to update. Accepts relative name (e.g. "testing", "www", "@"), domain-qualified name (e.g. "testing.example.com"), or full canonical FQDN (e.g. "testing.example.com."). Canonicalization is handled automatically.'
        ),
      type: z.string().describe('DNS record type to update (e.g. A, CNAME, TXT)'),
      value: z
        .union([z.string(), z.array(z.string())])
        .describe('New value(s) for the record. Overwrites existing values for this name and type.'),
      ttl: z
        .number()
        .min(1)
        .optional()
        .describe('Optional new TTL in seconds (keeps existing TTL if not specified)'),
    },
    async ({ domainName, name, type, value, ttl }) => {
      try {
        const cleanDomain = normalizeDomain(domainName);
        const cleanName = normalizeRecordName(name, cleanDomain);
        const cleanType = normalizeRecordType(type);
        const newValues = Array.isArray(value) ? value : [value];

        await client.updateRecord(cleanDomain, cleanName, cleanType as RecordType, newValues, ttl);

        return {
          content: [
            {
              type: 'text',
              text: `Successfully updated ${cleanType} record for "${cleanName}" in domain "${cleanDomain}".\nNew Values: ${newValues.join(', ')}${ttl ? ` (TTL: ${ttl})` : ''}`,
            },
          ],
        };
      } catch (err: unknown) {
        const error = err as Error;
        return {
          content: [
            {
              type: 'text',
              text: `Error updating record for "${domainName}": ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // 4. Delete Record
  server.tool(
    'delete_record',
    'Delete a DNS record or specific value from a domain. Accepts relative names (e.g. "testing"), domain-qualified names (e.g. "testing.example.com"), or canonical FQDNs (e.g. "testing.example.com.").',
    {
      domainName: z.string().describe('Domain name (e.g. example.com)'),
      name: z
        .string()
        .describe(
          'Record name/subdomain to delete. Accepts relative name (e.g. "testing", "www", "@"), domain-qualified name (e.g. "testing.example.com"), or full canonical FQDN (e.g. "testing.example.com."). Canonicalization is handled automatically.'
        ),
      type: z.string().describe('Record type to delete (e.g. A, CNAME, TXT)'),
      value: z
        .string()
        .optional()
        .describe(
          'Specific record value to delete. If omitted, all values for this name and type are deleted.'
        ),
    },
    async ({ domainName, name, type, value }) => {
      try {
        const cleanDomain = normalizeDomain(domainName);
        const cleanName = normalizeRecordName(name, cleanDomain);
        const cleanType = normalizeRecordType(type);

        await client.removeRecord(cleanDomain, cleanName, cleanType as RecordType, value);

        return {
          content: [
            {
              type: 'text',
              text: `Successfully deleted ${value ? `value "${value}" from ` : ''}${cleanType} record on "${cleanName}" in domain "${cleanDomain}".`,
            },
          ],
        };
      } catch (err: unknown) {
        const error = err as Error;
        return {
          content: [
            {
              type: 'text',
              text: `Error deleting record from "${domainName}": ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // 5. Replace All Records (Bulk)
  server.tool(
    'set_records',
    'Completely replace ALL DNS records in a zone with a new list of records. Warning: destructive if omitted records are intended to be preserved.',
    {
      domainName: z.string().describe('Domain name (e.g. example.com)'),
      records: z
        .array(
          z.object({
            name: z
              .string()
              .describe(
                'Record name/subdomain. Accepts relative name (e.g. "testing", "www", "@"), domain-qualified name (e.g. "testing.example.com"), or full canonical FQDN (e.g. "testing.example.com."). Canonicalization is handled automatically.'
              ),
            type: z.string().describe('Record type (e.g. "A", "CNAME", "TXT")'),
            ttl: z.number().min(1).default(300).describe('TTL in seconds'),
            records: z
              .array(z.string())
              .min(1)
              .describe('List of record values (e.g. ["1.2.3.4"])'),
          })
        )
        .describe('Complete list of replacement DNS records'),
    },
    async ({ domainName, records }) => {
      try {
        const cleanDomain = normalizeDomain(domainName);
        const formattedRecords: DNSRecord[] = records.map((r) => ({
          name: normalizeRecordName(r.name, cleanDomain),
          type: normalizeRecordType(r.type),
          ttl: r.ttl,
          records: r.records,
        }));

        await client.replaceRecords(cleanDomain, formattedRecords);

        return {
          content: [
            {
              type: 'text',
              text: `Successfully replaced all DNS records for "${cleanDomain}". Total record entries: ${formattedRecords.length}.`,
            },
          ],
        };
      } catch (err: unknown) {
        const error = err as Error;
        return {
          content: [
            {
              type: 'text',
              text: `Error replacing records for "${domainName}": ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
