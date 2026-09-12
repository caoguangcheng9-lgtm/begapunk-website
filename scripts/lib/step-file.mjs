const requiredMarkers = Object.freeze([
  'ISO-10303-21;',
  'HEADER;',
  'DATA;',
  'END-ISO-10303-21;',
]);

export function validateStepFile(source) {
  const failures = [];
  const normalized = source.replaceAll('\r\n', '\n').replaceAll('\r', '\n');
  const trimmedLines = normalized.split('\n').map((line) => line.trim());

  if (normalized.includes('\0')) failures.push('contains a NUL byte');
  for (const marker of requiredMarkers) {
    if (trimmedLines.filter((line) => line === marker).length !== 1) failures.push(`expected exactly one ${marker} marker`);
  }
  if (!/FILE_SCHEMA\s*\(\s*\(\s*'[^']+'/u.test(normalized)) failures.push('missing FILE_SCHEMA declaration');

  const headerIndex = normalized.indexOf('HEADER;');
  const firstEndSection = normalized.indexOf('ENDSEC;', headerIndex);
  const dataIndex = normalized.indexOf('DATA;', firstEndSection);
  const secondEndSection = normalized.indexOf('ENDSEC;', dataIndex);
  const endIndex = normalized.indexOf('END-ISO-10303-21;', secondEndSection);
  if (!(headerIndex > 0
    && firstEndSection > headerIndex
    && dataIndex > firstEndSection
    && secondEndSection > dataIndex
    && endIndex > secondEndSection)) {
    failures.push('HEADER/DATA/ENDSEC sections are incomplete or out of order');
    return failures;
  }

  const data = normalized.slice(dataIndex + 'DATA;'.length, secondEndSection);
  const definitions = [...data.matchAll(/^\s*#(\d+)\s*=/gmu)].map((match) => match[1]);
  const defined = new Set(definitions);
  if (!definitions.length) failures.push('DATA section has no entity definitions');
  if (defined.size !== definitions.length) failures.push('DATA section contains duplicate entity identifiers');

  const terminatedDefinitions = [...data.matchAll(/^\s*#\d+\s*=.*?;\s*$/gmsu)].length;
  if (terminatedDefinitions !== definitions.length) {
    failures.push('one or more DATA entities are missing a complete semicolon-terminated definition');
  }

  const references = new Set([...data.matchAll(/#(\d+)/gu)].map((match) => match[1]));
  const unresolved = [...references].filter((identifier) => !defined.has(identifier));
  if (unresolved.length) failures.push(`contains unresolved entity references: ${unresolved.slice(0, 10).map((id) => `#${id}`).join(', ')}`);

  if (normalized.slice(endIndex + 'END-ISO-10303-21;'.length).trim()) {
    failures.push('contains trailing data after the final ISO marker');
  }

  return failures;
}
