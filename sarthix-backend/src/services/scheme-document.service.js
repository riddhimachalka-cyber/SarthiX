import { HttpError } from '../utils/http-error.js';

const FIELD_ALIASES = new Map([
  ['scheme name', 'schemeName'],
  ['name', 'schemeName'],
  ['category', 'category'],
  ['description', 'description'],
  ['benefits', 'benefits'],
  ['eligibility', 'eligibility'],
  ['eligibility criteria', 'eligibility'],
  ['required documents', 'requiredDocuments'],
  ['documents', 'requiredDocuments'],
  ['application procedure', 'applicationProcedure'],
  ['application steps', 'applicationProcedure'],
  ['applicability', 'applicability'],
  ['applicable states', 'applicableStates'],
  ['official source url', 'officialSourceUrl'],
  ['source url', 'officialSourceUrl'],
  ['source organisation', 'officialSourceName'],
  ['source organization', 'officialSourceName'],
  ['official source name', 'officialSourceName'],
  ['last verified date', 'lastVerifiedAt'],
  ['last verified at', 'lastVerifiedAt'],
  ['verification status', 'verificationStatus'],
]);

function parseStructuredText(content) {
  const result = {};
  let activeField = null;
  const lines = content.replace(/\r\n?/g, '\n').split('\n');

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line === '---') continue;

    const heading = line.match(/^#{1,6}\s+(.+)$/);
    const keyValue = line.match(/^(?:[-*]\s*)?([^:#]+):\s*(.*)$/);
    const candidate = heading?.[1] ?? keyValue?.[1];
    const field = candidate && FIELD_ALIASES.get(candidate.trim().toLocaleLowerCase());
    if (field) {
      activeField = field;
      const value = heading ? '' : keyValue[2].trim();
      if (value) result[field] = fieldValue(field, value);
      else if (result[field] == null) result[field] = '';
      continue;
    }

    const sectionHeading = heading?.[1]?.trim();
    if (sectionHeading) {
      activeField = null;
      if (!result.schemeName) result.schemeName = sectionHeading;
      continue;
    }

    if (activeField) {
      const value = line.replace(/^[-*]\s+/, '').trim();
      if (value) {
        const existing = result[activeField];
        result[activeField] = existing ? `${existing}\n${value}` : value;
      }
    }
  }

  return result;
}

function fieldValue(field, value) {
  if (field === 'applicableStates' || field === 'requiredDocuments' || field === 'applicationProcedure') {
    return value.split(/[;,|]/).map((entry) => entry.trim()).filter(Boolean);
  }
  return value;
}

function requiredString(value, field) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new HttpError(400, `${field} is required`);
  }
  return value.trim();
}

function validateSourceUrl(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new HttpError(400, 'officialSourceUrl must be a valid HTTPS URL');
  }
  if (parsed.protocol !== 'https:') {
    throw new HttpError(400, 'officialSourceUrl must be a valid HTTPS URL');
  }
  return parsed.toString();
}

function normalizeTextList(value, field) {
  if (value == null || value === '') return [];
  const values = Array.isArray(value) ? value : String(value).split(/[\n;,|]/);
  if (values.some((item) => typeof item !== 'string' || !item.trim())) {
    throw new HttpError(400, `${field} must contain non-empty strings`);
  }
  return values.map((item) => item.trim());
}

export function normalizeScheme(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new HttpError(400, 'Scheme document must contain a JSON object');
  }

  const schemeName = requiredString(input.schemeName, 'schemeName');
  const category = requiredString(input.category, 'category');
  const officialSourceName = requiredString(input.officialSourceName, 'officialSourceName');
  const officialSourceUrl = validateSourceUrl(requiredString(input.officialSourceUrl, 'officialSourceUrl'));
  const applicability = input.applicability;
  if (!['central', 'state', 'both'].includes(applicability)) {
    throw new HttpError(400, 'applicability must be explicitly set to central, state, or both');
  }

  const applicableStates = normalizeTextList(input.applicableStates, 'applicableStates');
  if (['state', 'both'].includes(applicability) && applicableStates.length === 0) {
    throw new HttpError(400, 'applicableStates is required for state or both applicability');
  }

  let lastVerifiedAt = null;
  if (input.lastVerifiedAt != null && input.lastVerifiedAt !== '') {
    const date = new Date(input.lastVerifiedAt);
    if (Number.isNaN(date.getTime()) || date.getTime() > Date.now()) {
      throw new HttpError(400, 'lastVerifiedAt must be a valid date no later than today');
    }
    lastVerifiedAt = date.toISOString();
  }

  const verificationStatus = input.verificationStatus === 'verified' && lastVerifiedAt ? 'verified' : 'unverified';
  const description = input.description ?? '';
  if (typeof description !== 'string') throw new HttpError(400, 'description must be a string');
  const hasContent = Boolean(description.trim())
    || [input.benefits, input.eligibility].some((value) => Array.isArray(value) ? value.length > 0 : Boolean(value))
    || input.requiredDocuments?.length > 0
    || input.applicationProcedure?.length > 0;
  if (!hasContent) throw new HttpError(400, 'At least one scheme content section is required');
  return {
    schemeName,
    category,
    description: description.trim(),
    benefits: input.benefits ?? [],
    eligibility: input.eligibility ?? [],
    requiredDocuments: normalizeTextList(input.requiredDocuments, 'requiredDocuments'),
    applicationProcedure: normalizeTextList(input.applicationProcedure, 'applicationProcedure'),
    applicability,
    applicableStates,
    officialSourceUrl,
    officialSourceName,
    lastVerifiedAt,
    verificationStatus,
  };
}

export function parseSchemeDocument(filename, content) {
  if (typeof filename !== 'string' || typeof content !== 'string' || !content.trim()) {
    throw new HttpError(400, 'A non-empty filename and document content are required');
  }

  const extension = filename.split('.').pop()?.toLocaleLowerCase();
  let input;
  if (extension === 'json') {
    try {
      input = JSON.parse(content);
    } catch {
      throw new HttpError(400, 'JSON document is not valid JSON');
    }
  } else if (extension === 'txt' || extension === 'md' || extension === 'markdown') {
    input = parseStructuredText(content);
  } else {
    throw new HttpError(400, 'Only JSON, TXT, and Markdown documents are supported');
  }

  return normalizeScheme(input);
}
