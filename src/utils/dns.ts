import { DNSRecord, RecordType } from '@onlydns/sdk';

export function normalizeDomain(domain: string): string {
  return domain.trim().toLowerCase().replace(/\.+$/, '');
}

export function normalizeRecordName(name: string, domainName: string): string {
  const cleanDomain = normalizeDomain(domainName);
  let trimmedName = name.trim().toLowerCase();

  // Strip trailing dot
  trimmedName = trimmedName.replace(/\.+$/, '');

  if (trimmedName === '' || trimmedName === '@') {
    return cleanDomain;
  }

  if (trimmedName === cleanDomain || trimmedName.endsWith(`.${cleanDomain}`)) {
    return trimmedName;
  }

  return `${trimmedName}.${cleanDomain}`;
}

export function normalizeRecordType(type: string): RecordType {
  return type.trim().toUpperCase() as RecordType;
}

export function filterRecords(
  records: DNSRecord[],
  options?: { name?: string; type?: string; domainName?: string }
): DNSRecord[] {
  let filtered = [...records];

  if (options?.type) {
    const targetType = normalizeRecordType(options.type);
    filtered = filtered.filter((r) => normalizeRecordType(r.type) === targetType);
  }

  if (options?.name) {
    const targetName = options.domainName
      ? normalizeRecordName(options.name, options.domainName)
      : options.name.trim().toLowerCase().replace(/\.+$/, '');
    filtered = filtered.filter(
      (r) => r.name.toLowerCase().replace(/\.+$/, '') === targetName
    );
  }

  return filtered;
}
