import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { OnlyDNSClient, TsigAlgorithm } from '@onlydns/sdk';
import { normalizeDomain } from '../utils/dns.js';

export function registerTsigTools(server: McpServer, client: OnlyDNSClient): void {
  // 1. List TSIG Keys
  server.tool(
    'list_tsig_keys',
    'List all TSIG keys configured for the OnlyDNS account.',
    {},
    async () => {
      try {
        const keys = await client.getTsigKeys();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  count: keys.length,
                  tsigKeys: keys,
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
              text: `Error listing TSIG keys: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // 2. Get TSIG Key
  server.tool(
    'get_tsig_key',
    'Get details for a specific TSIG key by name.',
    {
      keyName: z.string().describe('TSIG key name (e.g. key-12345)'),
    },
    async ({ keyName }) => {
      try {
        const key = await client.getTsigKey(keyName);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(key, null, 2),
            },
          ],
        };
      } catch (err: unknown) {
        const error = err as Error;
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching TSIG key "${keyName}": ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // 3. Create TSIG Key
  server.tool(
    'create_tsig_key',
    'Generate a new TSIG key for secondary DNS transfers (AXFR) or dynamic DNS updates.',
    {
      algorithm: z
        .enum([
          'hmac-sha256',
          'hmac-sha512',
          'hmac-sha384',
          'hmac-sha224',
          'hmac-sha1',
          'mac-md5',
        ])
        .optional()
        .default('hmac-sha256')
        .describe('TSIG algorithm (default: hmac-sha256)'),
    },
    async ({ algorithm }) => {
      try {
        const key = await client.createTsigKey(algorithm as TsigAlgorithm);
        return {
          content: [
            {
              type: 'text',
              text: `Successfully created TSIG key:\n${JSON.stringify(key, null, 2)}`,
            },
          ],
        };
      } catch (err: unknown) {
        const error = err as Error;
        return {
          content: [
            {
              type: 'text',
              text: `Error creating TSIG key: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // 4. Configure Domain TSIG
  server.tool(
    'configure_domain_tsig',
    'Attach and configure TSIG permissions (AXFR transfer / dynamic DNS updates) for a domain.',
    {
      domainName: z.string().describe('Domain name (e.g. example.com)'),
      keyName: z.string().describe('TSIG key name'),
      allowAxfr: z
        .boolean()
        .describe('Whether to allow AXFR zone transfers for this domain using this key'),
      allowDnsUpdate: z
        .boolean()
        .describe('Whether to allow RFC 2136 DNS updates for this domain using this key'),
    },
    async ({ domainName, keyName, allowAxfr, allowDnsUpdate }) => {
      try {
        const cleanDomain = normalizeDomain(domainName);
        await client.updateDomainTsig(cleanDomain, keyName, allowAxfr, allowDnsUpdate);
        return {
          content: [
            {
              type: 'text',
              text: `Successfully updated TSIG settings for "${keyName}" on domain "${cleanDomain}". (allowAxfr: ${allowAxfr}, allowDnsUpdate: ${allowDnsUpdate})`,
            },
          ],
        };
      } catch (err: unknown) {
        const error = err as Error;
        return {
          content: [
            {
              type: 'text',
              text: `Error configuring TSIG for domain "${domainName}": ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // 5. Remove Domain TSIG
  server.tool(
    'remove_domain_tsig',
    'Remove all TSIG keys associated with a domain.',
    {
      domainName: z.string().describe('Domain name (e.g. example.com)'),
    },
    async ({ domainName }) => {
      try {
        const cleanDomain = normalizeDomain(domainName);
        await client.deleteDomainTsig(cleanDomain);
        return {
          content: [
            {
              type: 'text',
              text: `Successfully removed all TSIG keys from domain "${cleanDomain}".`,
            },
          ],
        };
      } catch (err: unknown) {
        const error = err as Error;
        return {
          content: [
            {
              type: 'text',
              text: `Error removing TSIG keys from domain "${domainName}": ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
