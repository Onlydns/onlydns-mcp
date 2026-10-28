# OnlyDNS MCP Server (`@onlydns/mcp`)

Official Model Context Protocol (MCP) server for [OnlyDNS](https://www.onlydns.com), built on the official TypeScript SDK (`@onlydns/sdk`). Enables AI agents (such as Claude Desktop, Cursor, Junie, Windsurf, and Claude Code) to inspect and manage DNS zones, DNS records, DNSSEC configuration, and TSIG keys directly with your OnlyDNS account.

---

## Features

- 🌐 **Domain Management**: List all managed domains and create new DNS zones.
- 📝 **DNS Record Operations**:
  - `list_records`: Query DNS records with optional filtering by type (A, AAAA, CNAME, MX, TXT, SRV, CAA, etc.) or hostname.
  - `add_record`: Create new records or append values to existing record sets with automatic domain normalization.
  - `update_record`: Modify existing DNS records and update TTLs.
  - `delete_record`: Delete specific record values or entire record sets.
  - `set_records`: Batch replace full zone record sets.
- 🔐 **DNSSEC Management**: Inspect DNSSEC status, fetch DS/DNSKEY records, enable, and disable DNSSEC signing.
- 🔑 **TSIG Keys**: Generate and manage TSIG keys for secondary DNS zone transfers (AXFR) and RFC 2136 dynamic updates.

---

## Installation & Quick Start

### 1. One-Click Desktop Installation (MCPB Bundle)

Download `onlydns-mcp.mcpb` directly from the [GitHub Releases](https://github.com/Onlydns/onlydns-mcp/releases) page. Compatible desktop clients (such as Claude Desktop) allow one-click installation and configure your `ONLYDNS_API_TOKEN` through a secure settings dialog.

### 2. Using `npx` (No installation needed)

You can run the server directly using `npx`:

```bash
export ONLYDNS_API_TOKEN="your_onlydns_api_token"
npx -y @onlydns/mcp
```

### 3. Global Installation

```bash
npm install -g @onlydns/mcp
```

---

## Configuration

The server requires an OnlyDNS API Bearer Token.

### Environment Variables

| Variable | Description | Default |
|---|---|---|
| `ONLYDNS_API_TOKEN` | Your OnlyDNS API Bearer Token (**Required**) | - |
| `ONLYDNS_API_BASE_URL` | OnlyDNS REST API base URL | `https://api.onlydns.com/v1` |

---

## Client Integration Examples

### Claude Desktop

Add the following to your `claude_desktop_config.json`:

#### macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
#### Windows: `%APPDATA%\Claude\claude_desktop_config.json`
#### Linux: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "onlydns": {
      "command": "npx",
      "args": ["-y", "@onlydns/mcp"],
      "env": {
        "ONLYDNS_API_TOKEN": "YOUR_ONLYDNS_BEARER_TOKEN"
      }
    }
  }
}
```

---

### Cursor (or Windsurf / Claude Code)

Add to your MCP settings or `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "onlydns": {
      "command": "npx",
      "args": ["-y", "@onlydns/mcp"],
      "env": {
        "ONLYDNS_API_TOKEN": "YOUR_ONLYDNS_BEARER_TOKEN"
      }
    }
  }
}
```

---

## Available MCP Tools

### 🌐 Domains
- `list_domains(limit?, offset?)`: Lists all domains in the account.
- `create_domain(domainName)`: Creates a new DNS zone for a domain.

### 📝 DNS Records
- `list_records(domainName, type?, name?)`: Lists DNS records for a domain, with optional filtering.
- `add_record(domainName, name, type, value, ttl?)`: Adds/appends a DNS record (e.g. `A`, `CNAME`, `MX`, `TXT`, `URL`, `PROXY`).
- `update_record(domainName, name, type, value, ttl?)`: Replaces values and/or TTL for a record type.
- `delete_record(domainName, name, type, value?)`: Deletes a record or specific value.
- `set_records(domainName, records)`: Batch replaces all records for a zone.

### 🔐 DNSSEC
- `get_dnssec(domainName)`: Fetches DNSSEC status and keys (DS, DNSKEY).
- `enable_dnssec(domainName)`: Enables DNSSEC signing for a zone.
- `disable_dnssec(domainName)`: Disables DNSSEC signing.

### 🔑 TSIG Keys
- `list_tsig_keys()`: Lists all account TSIG keys.
- `get_tsig_key(keyName)`: Retrieves TSIG key details.
- `create_tsig_key(algorithm?)`: Generates a new TSIG key (`hmac-sha256`, `hmac-sha512`, etc.).
- `get_domain_tsig(domainName)`: Retrieves TSIG keys and permissions configured on a domain.
- `configure_domain_tsig(domainName, keyName, allowAxfr, allowDnsUpdate, subdomains?)`: Configures AXFR, DDNS, and optional subdomain restriction permissions for a domain.
- `remove_domain_tsig(domainName)`: Removes all TSIG keys from a domain.

---

## Development & Testing

```bash
# Clone and install dependencies
git clone https://github.com/Onlydns/onlydns-mcp.git
cd onlydns-mcp
npm install

# Run unit tests
npm test

# Build TypeScript
npm run build

# Run locally in development
npm run dev
```

---

## License

[MIT](LICENSE) © 2026 OnlyDNS
