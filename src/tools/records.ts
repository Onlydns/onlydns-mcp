import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { OnlyDNSClient } from '../client/api.js';
import { DNSRecord } from '../client/types.js';
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
          'Filter by record name/hostname (e.g. "www", "sub.example.com", or "@" for root)'
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
    'Add a DNS record to a domain. If a record with the same name and type already exists, the new value is appended to the record set.',
    {
      domainName: z.string().describe('Domain name (e.g. example.com)'),
      name: z
        .string()
        .describe('Record name/subdomain (e.g. "@", "www", "mail", or "app.example.com")'),
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

        const existingRecords = await client.getRecords(cleanDomain);
        let recordFound = false;

        const updatedRecords: DNSRecord[] = existingRecords.map((rec) => {
          if (
            rec.name.toLowerCase().replace(/\.+$/, '') === cleanName.toLowerCase() &&
            normalizeRecordType(rec.type) === cleanType
          ) {
            recordFound = true;
            const mergedValues = Array.from(new Set([...rec.records, ...newValues]));
            return {
              ...rec,
              ttl: ttl ?? rec.ttl,
              records: mergedValues,
            };
          }
          return rec;
        });

        if (!recordFound) {
          updatedRecords.push({
            name: cleanName,
            type: cleanType,
            ttl: ttl ?? 300,
            records: newValues,
          });
        }

        await client.replaceRecords(cleanDomain, updatedRecords);

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
    'Update an existing DNS record set for a given name and type, completely replacing its values and/or TTL.',
    {
      domainName: z.string().describe('Domain name (e.g. example.com)'),
      name: z.string().describe('Record name/subdomain to update (e.g. "@", "www")'),
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

        const existingRecords = await client.getRecords(cleanDomain);
        let recordFound = false;

        const updatedRecords: DNSRecord[] = existingRecords.map((rec) => {
          if (
            rec.name.toLowerCase().replace(/\.+$/, '') === cleanName.toLowerCase() &&
            normalizeRecordType(rec.type) === cleanType
          ) {
            recordFound = true;
            return {
              ...rec,
              ttl: ttl ?? rec.ttl,
              records: newValues,
            };
          }
          return rec;
        });

        if (!recordFound) {
          // If record didn't exist, create it
          updatedRecords.push({
            name: cleanName,
            type: cleanType,
            ttl: ttl ?? 300,
            records: newValues,
          });
        }

        await client.replaceRecords(cleanDomain, updatedRecords);

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
    'Delete a DNS record or specific value from a domain.',
    {
      domainName: z.string().describe('Domain name (e.g. example.com)'),
      name: z.string().describe('Record name/subdomain to delete (e.g. "@", "www")'),
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

        const existingRecords = await client.getRecords(cleanDomain);
        let matched = false;

        const updatedRecords: DNSRecord[] = [];

        for (const rec of existingRecords) {
          const isTarget =
            rec.name.toLowerCase().replace(/\.+$/, '') === cleanName.toLowerCase() &&
            normalizeRecordType(rec.type) === cleanType;

          if (isTarget) {
            matched = true;
            if (value !== undefined) {
              // Delete only specific value
              const remainingValues = rec.records.filter((v) => v !== value);
              if (remainingValues.length > 0) {
                updatedRecords.push({
                  ...rec,
                  records: remainingValues,
                });
              }
            }
            // If value is omitted, omit this whole record
          } else {
            updatedRecords.push(rec);
          }
        }

        if (!matched) {
          return {
            content: [
              {
                type: 'text',
                text: `No matching ${cleanType} record found for "${cleanName}" in domain "${cleanDomain}". No changes were made.`,
              },
            ],
          };
        }

        await client.replaceRecords(cleanDomain, updatedRecords);

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

  // 5. Set Records (Batch Replace)
  server.tool(
    'set_records',
    'Batch replace all DNS records for a domain in OnlyDNS.',
    {
      domainName: z.string().describe('Domain name (e.g. example.com)'),
      records: z
        .array(
          z.object({
            name: z.string().describe('Hostname / record name (e.g. "@", "www.example.com")'),
            type: z.string().describe('Record type (e.g. A, AAAA, CNAME, MX, TXT)'),
            ttl: z.number().min(1).describe('TTL in seconds'),
            records: z.array(z.string()).describe('List of record values'),
          })
        )
        .describe('Full list of DNS records to set for this domain'),
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
              text: `Successfully replaced all DNS records for "${cleanDomain}". (Total records configured: ${formattedRecords.length})`,
            },
          ],
        };
      } catch (err: unknown) {
        const error = err as Error;
        return {
          content: [
            {
              type: 'text',
              text: `Error setting records for "${domainName}": ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
