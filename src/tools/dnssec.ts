import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { OnlyDNSClient } from '@onlydns/sdk';
import { normalizeDomain } from '../utils/dns.js';

export function registerDnssecTools(server: McpServer, client: OnlyDNSClient): void {
  server.tool(
    'get_dnssec',
    'Get DNSSEC configuration status, NSEC3 parameters, and DS / DNSKEY keys for a domain.',
    {
      domainName: z.string().describe('Domain name (e.g. example.com)'),
    },
    async ({ domainName }) => {
      try {
        const cleanDomain = normalizeDomain(domainName);
        const dnssec = await client.getDnssecStatus(cleanDomain);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  domain: cleanDomain,
                  ...dnssec,
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
              text: `Error getting DNSSEC status for "${domainName}": ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'enable_dnssec',
    'Enable DNSSEC signing for a domain in OnlyDNS.',
    {
      domainName: z.string().describe('Domain name (e.g. example.com)'),
    },
    async ({ domainName }) => {
      try {
        const cleanDomain = normalizeDomain(domainName);
        await client.enableDnssec(cleanDomain);
        return {
          content: [
            {
              type: 'text',
              text: `Successfully enabled DNSSEC for domain "${cleanDomain}".`,
            },
          ],
        };
      } catch (err: unknown) {
        const error = err as Error;
        return {
          content: [
            {
              type: 'text',
              text: `Error enabling DNSSEC for "${domainName}": ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'disable_dnssec',
    'Disable DNSSEC signing and remove DNSSEC keys for a domain in OnlyDNS.',
    {
      domainName: z.string().describe('Domain name (e.g. example.com)'),
    },
    async ({ domainName }) => {
      try {
        const cleanDomain = normalizeDomain(domainName);
        await client.disableDnssec(cleanDomain);
        return {
          content: [
            {
              type: 'text',
              text: `Successfully disabled DNSSEC for domain "${cleanDomain}".`,
            },
          ],
        };
      } catch (err: unknown) {
        const error = err as Error;
        return {
          content: [
            {
              type: 'text',
              text: `Error disabling DNSSEC for "${domainName}": ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
