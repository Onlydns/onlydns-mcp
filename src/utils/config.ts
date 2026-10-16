import dotenv from 'dotenv';
import { OnlyDNSConfig } from '../client/types.js';

dotenv.config();

const DEFAULT_BASE_URL = 'https://api.onlydns.com/v1';

export function loadConfig(overrides?: Partial<OnlyDNSConfig>): OnlyDNSConfig {
  const token =
    overrides?.token ||
    process.env.ONLYDNS_API_TOKEN ||
    process.env.ONLYDNS_API_KEY ||
    process.env.ONLYDNS_AUTH_TOKEN ||
    '';

  const baseUrl =
    overrides?.baseUrl ||
    process.env.ONLYDNS_API_BASE_URL ||
    process.env.ONLYDNS_BASE_URL ||
    DEFAULT_BASE_URL;

  return {
    token,
    baseUrl,
  };
}
