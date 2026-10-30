const SECTION_FIELDS = [
  ['description', 'Description'],
  ['benefits', 'Benefits'],
  ['eligibility', 'Eligibility'],
  ['requiredDocuments', 'Required Documents'],
  ['applicationProcedure', 'Application Procedure'],
];

function asText(value) {
  if (Array.isArray(value)) return value.map(asText).filter(Boolean).join('\n');
  if (value && typeof value === 'object') {
    return Object.entries(value).map(([key, item]) => `${key}: ${asText(item)}`).join('\n');
  }
  return value == null ? '' : String(value).trim();
}

function splitSection(text, maxCharacters) {
  const paragraphs = text.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
  const chunks = [];
  let current = '';

  for (const paragraph of paragraphs) {
    if (paragraph.length > maxCharacters) {
      if (current) chunks.push(current);
      current = '';
      for (let offset = 0; offset < paragraph.length; offset += maxCharacters) {
        chunks.push(paragraph.slice(offset, offset + maxCharacters).trim());
      }
      continue;
    }

    if (current && current.length + paragraph.length + 2 > maxCharacters) {
      chunks.push(current);
      current = paragraph;
    } else {
      current = current ? `${current}\n\n${paragraph}` : paragraph;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

export function chunkScheme(scheme, { maxCharacters = 1200 } = {}) {
  if (!Number.isInteger(maxCharacters) || maxCharacters < 100) {
    throw new TypeError('maxCharacters must be an integer of at least 100');
  }

  const chunks = [];
  const seen = new Set();
  for (const [field, label] of SECTION_FIELDS) {
    const text = asText(scheme[field]);
    if (!text) continue;

    for (const sectionText of splitSection(text, maxCharacters)) {
      const chunkText = `${scheme.schemeName}\n${label}\n${sectionText}`;
      const dedupeKey = chunkText.replace(/\s+/g, ' ').trim().toLocaleLowerCase();
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      chunks.push({
        chunkText,
        metadata: {
          section: field,
          category: scheme.category,
          applicability: scheme.applicability,
          applicableStates: scheme.applicableStates,
          verificationStatus: scheme.verificationStatus,
          sourceUrl: scheme.officialSourceUrl,
          sourceOrganisation: scheme.officialSourceName,
          lastVerifiedAt: scheme.lastVerifiedAt,
        },
      });
    }
  }

  return chunks;
}
