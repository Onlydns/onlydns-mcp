import {
  DNSRecord,
  RecordType,
  normalizeDomain,
  normalizeRecordName,
  normalizeRecordType,
} from '@onlydns/sdk';

export { normalizeDomain, normalizeRecordName, normalizeRecordType };

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
    const cleanDomain = options.domainName ? normalizeDomain(options.domainName) : undefined;
    const targetFqdn = cleanDomain
      ? normalizeRecordName(options.name, cleanDomain)
      : (options.name.trim().toLowerCase().replace(/^\.+/, '').replace(/\.+$/, '') + '.');
    const targetClean = targetFqdn.replace(/\.+$/, '');

    filtered = filtered.filter((r) => {
      const rFqdn = cleanDomain
        ? normalizeRecordName(r.name, cleanDomain)
        : (r.name.trim().toLowerCase().replace(/^\.+/, '').replace(/\.+$/, '') + '.');
      const rClean = r.name.trim().toLowerCase().replace(/^\.+/, '').replace(/\.+$/, '');
      return rFqdn === targetFqdn || rClean === targetClean;
    });
  }

  return filtered;
}
