import dotenv from 'dotenv';
import type { OnlyDNSClientOptions } from '@onlydns/sdk';

dotenv.config();

const DEFAULT_BASE_URL = 'https://api.onlydns.com/v1';

export function loadConfig(
  overrides?: Partial<OnlyDNSClientOptions> & { token?: string }
): OnlyDNSClientOptions {
  const token =
    overrides?.apiToken ||
    overrides?.token ||
    process.env.ONLYDNS_API_TOKEN ||
    '';

  const baseUrl =
    overrides?.baseUrl ||
    process.env.ONLYDNS_API_BASE_URL ||
    process.env.ONLYDNS_BASE_URL ||
    DEFAULT_BASE_URL;

  return {
    apiToken: token,
    baseUrl,
    timeout: overrides?.timeout,
    fetch: overrides?.fetch,
  };
}
