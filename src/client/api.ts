import {
  DNSRecord,
  DNSSECStatus,
  OnlyDNSConfig,
  TSIGKey,
  DomainTSIGSetting,
  APIErrorResponse,
} from './types.js';

export class OnlyDNSError extends Error {
  public status?: number;
  public errorCode?: number;
  public details?: string[];

  constructor(message: string, status?: number, errorCode?: number, details?: string[]) {
    super(message);
    this.name = 'OnlyDNSError';
    this.status = status;
    this.errorCode = errorCode;
    this.details = details;
  }
}

export class OnlyDNSClient {
  private token: string;
  private baseUrl: string;
  private customFetch?: typeof fetch;

  constructor(config: OnlyDNSConfig, customFetch?: typeof fetch) {
    this.token = config.token.trim();
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.customFetch = customFetch;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const headers = new Headers(options.headers || {});

    if (!headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${this.token}`);
    }
    if (!headers.has('Accept')) {
      headers.set('Accept', 'application/json');
    }
    if (options.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const fetchFn = this.customFetch || fetch;
    const response = await fetchFn(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMessage = `OnlyDNS API error (${response.status} ${response.statusText})`;
      let errorCode: number | undefined;
      let details: string[] | undefined;

      try {
        const errorJson = (await response.json()) as APIErrorResponse;
        if (errorJson.title) {
          errorMessage = errorJson.title;
        } else if (errorJson.error) {
          errorMessage = errorJson.error;
        } else if (errorJson.message) {
          errorMessage = errorJson.message;
        }

        if (errorJson.errorCode !== undefined) {
          errorCode = errorJson.errorCode;
        }

        if (Array.isArray(errorJson.description)) {
          details = errorJson.description;
          if (details.length > 0) {
            errorMessage += `: ${details.join(', ')}`;
          }
        } else if (typeof errorJson.description === 'string') {
          details = [errorJson.description];
          errorMessage += `: ${errorJson.description}`;
        }
      } catch {
        try {
          const text = await response.text();
          if (text) {
            errorMessage = `${errorMessage}: ${text}`;
          }
        } catch {
          // ignore parsing error
        }
      }

      if (response.status === 401) {
        errorMessage = 'Unauthorized: Access token is missing or invalid. Please check ONLYDNS_API_TOKEN.';
      } else if (response.status === 404) {
        errorMessage = `Not Found: The requested domain or resource was not found on this account. (${url})`;
      }

      throw new OnlyDNSError(errorMessage, response.status, errorCode, details);
    }

    if (response.status === 204) {
      return undefined as unknown as T;
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return (await response.json()) as T;
    }

    const text = await response.text();
    if (!text || text.trim() === '') {
      return undefined as unknown as T;
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      return text as unknown as T;
    }
  }

  // --- Domain Methods ---

  async listDomains(limit: number = 200, offset: number = 0): Promise<string[]> {
    const params = new URLSearchParams();
    if (limit) params.set('limit', String(limit));
    if (offset) params.set('offset', String(offset));

    const query = params.toString();
    const endpoint = `/dns${query ? `?${query}` : ''}`;
    return this.request<string[]>(endpoint, { method: 'GET' });
  }

  async createDomain(domainName: string): Promise<void> {
    await this.request<void>('/dns', {
      method: 'POST',
      body: JSON.stringify({ domain: domainName }),
    });
  }

  // --- Record Methods ---

  async getRecords(domainName: string): Promise<DNSRecord[]> {
    return this.request<DNSRecord[]>(`/dns/${encodeURIComponent(domainName)}/records`, {
      method: 'GET',
    });
  }

  async replaceRecords(domainName: string, records: DNSRecord[]): Promise<void> {
    await this.request<void>(`/dns/${encodeURIComponent(domainName)}/records`, {
      method: 'PUT',
      body: JSON.stringify(records),
    });
  }

  // --- DNSSEC Methods ---

  async getDnssec(domainName: string): Promise<DNSSECStatus> {
    return this.request<DNSSECStatus>(`/dns/${encodeURIComponent(domainName)}/dnssec`, {
      method: 'GET',
    });
  }

  async enableDnssec(domainName: string): Promise<void> {
    await this.request<void>(`/dns/${encodeURIComponent(domainName)}/dnssec`, {
      method: 'POST',
    });
  }

  async updateDnssec(domainName: string, data: Record<string, unknown>): Promise<void> {
    await this.request<void>(`/dns/${encodeURIComponent(domainName)}/dnssec`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteDnssec(domainName: string): Promise<void> {
    await this.request<void>(`/dns/${encodeURIComponent(domainName)}/dnssec`, {
      method: 'DELETE',
    });
  }

  // --- TSIG Methods ---

  async getTsigKeys(): Promise<TSIGKey[]> {
    const response = await this.request<{ tsigKeys?: TSIGKey[] } | TSIGKey[]>('/dns/tsig', {
      method: 'GET',
    });
    if (Array.isArray(response)) {
      return response;
    }
    return response.tsigKeys || [];
  }

  async createTsigKey(algorithm?: string): Promise<TSIGKey> {
    const body = algorithm ? { algorithm } : {};
    return this.request<TSIGKey>('/dns/tsig', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async getTsigKey(key: string): Promise<TSIGKey> {
    return this.request<TSIGKey>(`/dns/tsig/${encodeURIComponent(key)}`, {
      method: 'GET',
    });
  }

  async deleteTsigKey(key: string): Promise<void> {
    await this.request<void>(`/dns/tsig/${encodeURIComponent(key)}`, {
      method: 'DELETE',
    });
  }

  async getDomainTsigKeys(domainName: string): Promise<DomainTSIGSetting[] | unknown> {
    return this.request<DomainTSIGSetting[] | unknown>(
      `/dns/${encodeURIComponent(domainName)}/tsig`,
      { method: 'GET' }
    );
  }

  async patchDomainTsig(
    domainName: string,
    key: string,
    options: { allowAxfr: boolean; allowDnsUpdate: boolean }
  ): Promise<void> {
    await this.request<void>(
      `/dns/${encodeURIComponent(domainName)}/tsig/${encodeURIComponent(key)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(options),
      }
    );
  }

  async deleteDomainTsig(domainName: string, key?: string): Promise<void> {
    const endpoint = key
      ? `/dns/${encodeURIComponent(domainName)}/tsig/${encodeURIComponent(key)}`
      : `/dns/${encodeURIComponent(domainName)}/tsig`;
    await this.request<void>(endpoint, {
      method: 'DELETE',
    });
  }
}
