import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { OnlyDNSClient, type OnlyDNSClientOptions } from '@onlydns/sdk';
import { registerDomainTools } from './tools/domains.js';
import { registerRecordTools } from './tools/records.js';
import { registerDnssecTools } from './tools/dnssec.js';
import { registerTsigTools } from './tools/tsig.js';
import { registerUserTools } from './tools/users.js';
import { registerTokenTools } from './tools/tokens.js';
import { registerAccountTools } from './tools/account.js';

export function createOnlyDNSServer(
  options: OnlyDNSClientOptions
): { server: McpServer; client: OnlyDNSClient } {
  const server = new McpServer({
    name: '@onlydns/mcp',
    version: '1.0.7',
  });

  const client = new OnlyDNSClient(options);

  // Register all tool handlers
  registerDomainTools(server, client);
  registerRecordTools(server, client);
  registerDnssecTools(server, client);
  registerTsigTools(server, client);
  registerUserTools(server, client);
  registerTokenTools(server, client);
  registerAccountTools(server, client);

  return { server, client };
}
