import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { OnlyDNSClient } from './client/api.js';
import { OnlyDNSConfig } from './client/types.js';
import { registerDomainTools } from './tools/domains.js';
import { registerRecordTools } from './tools/records.js';
import { registerDnssecTools } from './tools/dnssec.js';
import { registerTsigTools } from './tools/tsig.js';

export function createOnlyDNSServer(
  config: OnlyDNSConfig,
  customFetch?: typeof fetch
): { server: McpServer; client: OnlyDNSClient } {
  const server = new McpServer({
    name: 'onlydns-mcp',
    version: '1.0.0',
  });

  const client = new OnlyDNSClient(config, customFetch);

  // Register all tool handlers
  registerDomainTools(server, client);
  registerRecordTools(server, client);
  registerDnssecTools(server, client);
  registerTsigTools(server, client);

  return { server, client };
}
