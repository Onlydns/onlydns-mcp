export type RecordType =
  | 'A'
  | 'AAAA'
  | 'CNAME'
  | 'MX'
  | 'TXT'
  | 'SRV'
  | 'CAA'
  | 'CERT'
  | 'HTTPS'
  | 'LOC'
  | 'NAPTR'
  | 'NS'
  | 'SMIMEA'
  | 'SSHFP'
  | 'SVCB'
  | 'TLSA'
  | 'URL'
  | 'PROXY'
  | string;

export interface DNSRecord {
  name: string;
  type: RecordType;
  ttl: number;
  records: string[];
}

export interface DNSSECDsKey {
  keyTag?: number;
  algorithm?: number;
  digestType?: number;
  digest?: string;
  [key: string]: unknown;
}

export interface DNSSECStatus {
  enabled?: boolean;
  dnssec?: boolean;
  nsec3param?: string | null;
  keys?: DNSSECDsKey[];
  [key: string]: unknown;
}

export type TsigAlgorithm =
  | 'mac-md5'
  | 'hmac-sha1'
  | 'hmac-sha224'
  | 'hmac-sha256'
  | 'hmac-sha384'
  | 'hmac-sha512';

export interface TSIGKey {
  name: string;
  algorithm: TsigAlgorithm | string;
  key?: string;
}

export interface DomainTSIGSetting {
  key: string;
  allowAxfr: boolean;
  allowDnsUpdate: boolean;
}

export interface OnlyDNSConfig {
  token: string;
  baseUrl: string;
}

export interface APIErrorResponse {
  lang?: string;
  errorCode?: number;
  title?: string;
  description?: string[] | string;
  error?: string;
  message?: string;
}
