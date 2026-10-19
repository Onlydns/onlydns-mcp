#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createOnlyDNSServer } from './server.js';
import { loadConfig } from './utils/config.js';

function parseArgs(args: string[]): {
  token?: string;
  baseUrl?: string;
  showHelp: boolean;
  showVersion: boolean;
} {
  let token: string | undefined;
  let baseUrl: string | undefined;
  let showHelp = false;
  let showVersion = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      showHelp = true;
    } else if (arg === '--version' || arg === '-v') {
      showVersion = true;
    } else if (arg === '--token' || arg === '-t') {
      token = args[++i];
    } else if (arg === '--base-url' || arg === '-u') {
      baseUrl = args[++i];
    }
  }

  return { token, baseUrl, showHelp, showVersion };
}

function printHelp(): void {
  process.stderr.write(`
OnlyDNS Model Context Protocol (MCP) Server

Usage:
  npx @onlydns/mcp [options]
  onlydns-mcp [options]

Environment Variables:
  ONLYDNS_API_TOKEN       Your OnlyDNS API Bearer Token (Required)
  ONLYDNS_API_BASE_URL    API Base URL (Default: https://api.onlydns.com/v1)

Options:
  -t, --token <token>     Specify API token directly
  -u, --base-url <url>    Specify custom API base URL
  -v, --version           Show version information
  -h, --help              Show this help message

For MCP client configurations (e.g., Claude Desktop, Cursor), provide the ONLYDNS_API_TOKEN
in the environment variables block.
\n`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const parsed = parseArgs(args);

  if (parsed.showHelp) {
    printHelp();
    process.exit(0);
  }

  if (parsed.showVersion) {
    process.stdout.write('@onlydns/mcp v1.0.0\n');
    process.exit(0);
  }

  const config = loadConfig({
    apiToken: parsed.token,
    baseUrl: parsed.baseUrl,
  });

  if (!config.apiToken) {
    process.stderr.write(
      '[@onlydns/mcp] Warning: ONLYDNS_API_TOKEN is not set. Tools requiring authentication will return unauthorized errors until a valid token is provided.\n'
    );
  }

  const { server } = createOnlyDNSServer(config);
  const transport = new StdioServerTransport();

  process.stderr.write(`[@onlydns/mcp] Starting OnlyDNS MCP server (API: ${config.baseUrl})...\n`);

  await server.connect(transport);
}

main().catch((err: unknown) => {
  const error = err as Error;
  process.stderr.write(`[@onlydns/mcp] Fatal error: ${error.message}\n`);
  process.exit(1);
});
