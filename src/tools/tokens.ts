import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { OnlyDNSClient } from '@onlydns/sdk';

export function registerTokenTools(server: McpServer, client: OnlyDNSClient): void {
  server.tool(
    'list_tokens',
    'List all API access tokens for the OnlyDNS account.',
    {},
    async () => {
      try {
        const tokens = await client.listTokens();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(tokens, null, 2),
            },
          ],
        };
      } catch (err: unknown) {
        const error = err as Error;
        return {
          content: [
            {
              type: 'text',
              text: `Error listing tokens: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'create_token',
    'Provision a new API access token with specific permission scopes, allowed networks, and optional expiration lifetime.',
    {
      scopes: z.array(z.string()).optional().default(['records:write']).describe('Assigned scopes (e.g. ["records:write"], ["read"], ["admin"])'),
      allowedZones: z.array(z.string()).optional().describe('Optional list of restricted domains'),
      allowedNetworks: z.array(z.string()).optional().describe('Optional list of CIDR IP allowlists (e.g. ["192.0.2.1/32"])'),
      expiresAt: z.union([z.string(), z.number()]).optional().describe('Expiration timestamp (ISO 8601) or lifetime duration in seconds'),
    },
    async ({ scopes, allowedZones, allowedNetworks, expiresAt }) => {
      try {
        const token = await client.createToken({
          scopes,
          allowed_zones: allowedZones,
          allowed_network: allowedNetworks,
          expires_at: expiresAt,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  status: 'ok',
                  tokenId: token.tokenId,
                  token: token.token || token.authorization || '',
                  scopes: token.scopes,
                  expiresAt: token.expiresAt || 'Never',
                  notice: 'Please copy and store this API token securely. The secret token cannot be viewed again.',
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
              text: `Error creating API token: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'delete_token',
    'Revoke / deactivate an API access token.',
    {
      tokenId: z.string().describe('Token ID to revoke'),
    },
    async ({ tokenId }) => {
      try {
        await client.deleteToken(tokenId);
        return {
          content: [
            {
              type: 'text',
              text: `Successfully revoked API token "${tokenId}".`,
            },
          ],
        };
      } catch (err: unknown) {
        const error = err as Error;
        return {
          content: [
            {
              type: 'text',
              text: `Error revoking API token "${tokenId}": ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
