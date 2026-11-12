import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { OnlyDNSClient } from '@onlydns/sdk';

export function registerAccountTools(server: McpServer, client: OnlyDNSClient): void {
  server.tool(
    'get_account',
    'Retrieve account metadata, contact details (company name, name, postal address), and current billing package feature entitlements.',
    {},
    async () => {
      try {
        const account = await client.getAccount();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(account, null, 2),
            },
          ],
        };
      } catch (err: unknown) {
        const error = err as Error;
        return {
          content: [
            {
              type: 'text',
              text: `Error retrieving account details: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'get_account_billing',
    'Retrieve account billing state, balances, past-due amounts, and non-payment suspension status.',
    {},
    async () => {
      try {
        const billing = await client.getAccountBilling();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(billing, null, 2),
            },
          ],
        };
      } catch (err: unknown) {
        const error = err as Error;
        return {
          content: [
            {
              type: 'text',
              text: `Error retrieving account billing: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'get_account_metrics',
    'Retrieve real-time account resource usage statistics (domains, records, queries, DNSSEC, TSIG keys, 24h changes, API RPM rate, active API tokens) alongside active package entitlements.',
    {},
    async () => {
      try {
        const metrics = await client.getAccountMetrics();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(metrics, null, 2),
            },
          ],
        };
      } catch (err: unknown) {
        const error = err as Error;
        return {
          content: [
            {
              type: 'text',
              text: `Error retrieving account metrics: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'get_account_oidc',
    'Retrieve custom OIDC Single Sign-On configuration, enforcement policy, and non-compliant users for the account.',
    {},
    async () => {
      try {
        const oidc = await client.getAccountOidc();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(oidc, null, 2),
            },
          ],
        };
      } catch (err: unknown) {
        const error = err as Error;
        return {
          content: [
            {
              type: 'text',
              text: `Error retrieving OIDC SSO configuration: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'save_account_oidc',
    'Create or update custom OIDC Single Sign-On configuration and enforcement settings.',
    {
      discoveryUrl: z.string().optional().describe('OpenID Connect discovery document URL (.well-known/openid-configuration)'),
      clientId: z.string().optional().describe('OIDC Client ID'),
      clientSecret: z.string().optional().describe('OIDC Client Secret'),
      enforceSso: z.boolean().optional().describe('Whether password login is prohibited for standard users'),
    },
    async ({ discoveryUrl, clientId, clientSecret, enforceSso }) => {
      try {
        const oidc = await client.saveAccountOidc({
          discoveryUrl,
          clientId,
          clientSecret,
          enforceSso,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  status: 'ok',
                  message: 'OIDC SSO configuration updated successfully.',
                  oidc,
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
              text: `Error saving OIDC SSO configuration: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'delete_account_oidc',
    'Remove custom OIDC Single Sign-On configuration from the account.',
    {},
    async () => {
      try {
        const result = await client.deleteAccountOidc();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (err: unknown) {
        const error = err as Error;
        return {
          content: [
            {
              type: 'text',
              text: `Error deleting OIDC SSO configuration: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'test_account_oidc',
    'Test OIDC discovery URL reachability and validate client credentials using client_credentials grant type.',
    {
      discoveryUrl: z.string().optional().describe('Optional OIDC Discovery URL to test (defaults to saved configuration if omitted)'),
      clientId: z.string().optional().describe('Optional OIDC Client ID to validate'),
      clientSecret: z.string().optional().describe('Optional OIDC Client Secret to validate'),
    },
    async ({ discoveryUrl, clientId, clientSecret }) => {
      try {
        const testOpts: { discoveryUrl?: string; clientId?: string; clientSecret?: string } = {};
        if (discoveryUrl) testOpts.discoveryUrl = discoveryUrl;
        if (clientId) testOpts.clientId = clientId;
        if (clientSecret) testOpts.clientSecret = clientSecret;

        const result = await client.testAccountOidc(Object.keys(testOpts).length ? testOpts : undefined);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (err: unknown) {
        const error = err as Error;
        return {
          content: [
            {
              type: 'text',
              text: `Error testing OIDC SSO configuration: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
