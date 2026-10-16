import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { OnlyDNSClient } from '../client/api.js';
import { normalizeDomain } from '../utils/dns.js';

export function registerDomainTools(server: McpServer, client: OnlyDNSClient): void {
  server.tool(
    'list_domains',
    'List all DNS domains managed in the OnlyDNS account.',
    {
      limit: z
        .number()
        .min(1)
        .max(1000)
        .optional()
        .default(200)
        .describe('Maximum number of domains to return (default: 200, max: 1000)'),
      offset: z
        .number()
        .min(0)
        .optional()
        .default(0)
        .describe('Pagination offset (default: 0)'),
    },
    async ({ limit, offset }) => {
      try {
        const domains = await client.listDomains(limit, offset);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  count: domains.length,
                  offset,
                  limit,
                  domains,
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
              text: `Error listing domains: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'create_domain',
    'Create/add a new DNS zone/domain under the OnlyDNS account.',
    {
      domainName: z.string().describe('Domain name to create (e.g. example.com)'),
    },
    async ({ domainName }) => {
      try {
        const cleanDomain = normalizeDomain(domainName);
        await client.createDomain(cleanDomain);
        return {
          content: [
            {
              type: 'text',
              text: `Successfully created domain zone for "${cleanDomain}".`,
            },
          ],
        };
      } catch (err: unknown) {
        const error = err as Error;
        return {
          content: [
            {
              type: 'text',
              text: `Error creating domain "${domainName}": ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
