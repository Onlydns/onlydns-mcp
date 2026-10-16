import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { OnlyDNSClient } from '../client/api.js';
import { normalizeDomain } from '../utils/dns.js';

export function registerTsigTools(server: McpServer, client: OnlyDNSClient): void {
  // 1. List TSIG Keys
  server.tool(
    'list_tsig_keys',
    'List all TSIG keys for the OnlyDNS account, or list TSIG keys enabled for a specific domain.',
    {
      domainName: z
        .string()
        .optional()
        .describe('Optional domain name to list TSIG keys specific to that domain.'),
    },
    async ({ domainName }) => {
      try {
        if (domainName) {
          const cleanDomain = normalizeDomain(domainName);
          const domainKeys = await client.getDomainTsigKeys(cleanDomain);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    domain: cleanDomain,
                    tsigKeys: domainKeys,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

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

  // 2. Create TSIG Key
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
        const key = await client.createTsigKey(algorithm);
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

  // 3. Delete TSIG Key
  server.tool(
    'delete_tsig_key',
    'Delete a TSIG key from the account.',
    {
      key: z.string().describe('The name or identifier of the TSIG key to delete'),
    },
    async ({ key }) => {
      try {
        await client.deleteTsigKey(key);
        return {
          content: [
            {
              type: 'text',
              text: `Successfully deleted TSIG key "${key}".`,
            },
          ],
        };
      } catch (err: unknown) {
        const error = err as Error;
        return {
          content: [
            {
              type: 'text',
              text: `Error deleting TSIG key "${key}": ${error.message}`,
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
      key: z.string().describe('TSIG key name'),
      allowAxfr: z
        .boolean()
        .describe('Whether to allow AXFR zone transfers for this domain using this key'),
      allowDnsUpdate: z
        .boolean()
        .describe('Whether to allow RFC 2136 DNS updates for this domain using this key'),
    },
    async ({ domainName, key, allowAxfr, allowDnsUpdate }) => {
      try {
        const cleanDomain = normalizeDomain(domainName);
        await client.patchDomainTsig(cleanDomain, key, {
          allowAxfr,
          allowDnsUpdate,
        });
        return {
          content: [
            {
              type: 'text',
              text: `Successfully updated TSIG settings for "${key}" on domain "${cleanDomain}". (allowAxfr: ${allowAxfr}, allowDnsUpdate: ${allowDnsUpdate})`,
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
    'Remove a TSIG key or all TSIG keys from a domain.',
    {
      domainName: z.string().describe('Domain name (e.g. example.com)'),
      key: z
        .string()
        .optional()
        .describe(
          'Specific TSIG key name to remove from this domain. If omitted, removes all TSIG keys from the domain.'
        ),
    },
    async ({ domainName, key }) => {
      try {
        const cleanDomain = normalizeDomain(domainName);
        await client.deleteDomainTsig(cleanDomain, key);
        return {
          content: [
            {
              type: 'text',
              text: `Successfully removed ${key ? `TSIG key "${key}"` : 'all TSIG keys'} from domain "${cleanDomain}".`,
            },
          ],
        };
      } catch (err: unknown) {
        const error = err as Error;
        return {
          content: [
            {
              type: 'text',
              text: `Error removing TSIG from domain "${domainName}": ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
