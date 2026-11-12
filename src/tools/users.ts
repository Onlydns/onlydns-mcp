import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { OnlyDNSClient } from '@onlydns/sdk';

export function registerUserTools(server: McpServer, client: OnlyDNSClient): void {
  server.tool(
    'list_users',
    'List all portal users and their assigned permission scopes under the OnlyDNS account.',
    {},
    async () => {
      try {
        const users = await client.listUsers();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(users, null, 2),
            },
          ],
        };
      } catch (err: unknown) {
        const error = err as Error;
        return {
          content: [
            {
              type: 'text',
              text: `Error listing users: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'get_user',
    'Get details and permissions for a specific portal user.',
    {
      userId: z.string().describe('User ID to inspect'),
    },
    async ({ userId }) => {
      try {
        const user = await client.getUser(userId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(user, null, 2),
            },
          ],
        };
      } catch (err: unknown) {
        const error = err as Error;
        return {
          content: [
            {
              type: 'text',
              text: `Error getting user "${userId}": ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'invite_user',
    'Invite / create a new portal user with specific functional scopes and optional domain restrictions.',
    {
      email: z.string().email().describe('Email address of the user to invite'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      phone: z.string().optional().describe('Optional contact phone number'),
      scopes: z.array(z.string()).optional().default(['admin']).describe('Assigned permission scopes (e.g. ["read", "records:write"])'),
      allowedZones: z.array(z.string()).optional().describe('Optional list of restricted domains (empty permits all domains)'),
    },
    async ({ email, firstName, lastName, phone, scopes, allowedZones }) => {
      try {
        const user = await client.createUser({
          email,
          firstName,
          lastName,
          phone,
          scopes,
          allowed_zones: allowedZones,
        });
        return {
          content: [
            {
              type: 'text',
              text: `Successfully invited user "${user.userName}" with ID: ${user.userId}. Scopes: [${(user.scopes || []).join(', ')}]`,
            },
          ],
        };
      } catch (err: unknown) {
        const error = err as Error;
        return {
          content: [
            {
              type: 'text',
              text: `Error inviting user "${email}": ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'deactivate_user',
    'Deactivate a portal user.',
    {
      userId: z.string().describe('User ID to deactivate'),
    },
    async ({ userId }) => {
      try {
        await client.deleteUser(userId);
        return {
          content: [
            {
              type: 'text',
              text: `Successfully deactivated user "${userId}".`,
            },
          ],
        };
      } catch (err: unknown) {
        const error = err as Error;
        return {
          content: [
            {
              type: 'text',
              text: `Error deactivating user "${userId}": ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
