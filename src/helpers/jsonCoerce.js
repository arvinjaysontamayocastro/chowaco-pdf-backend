/**
 * Normalize a property name: lowercase, strip spaces/_/-/. and collapse words.
 */
function normalizeKeyName(s = '') {
  return String(s)
    .toLowerCase()
    .replace(/[\s_\-./()]+/g, '')
    .trim();
}

/**
 * Canonical keys expected by your UI:
 *  - identity
 *  - pollutants
 *  - goals
 *  - bmps
 *  - implementationActivities
 *  - monitoringMetrics
 *  - outreachActivities
 *  - geographicAreas
 *  - summary
 */
const ALIASES = {
  identity: [
    'identity',
    'reportidentity',
    'planidentity',
    'metadata',
    'reportmeta',
    'planmeta',
    'id',
    'identityinfo',
  ],

  pollutants: [
    'pollutants',
    'pollutant',
    'contaminants',
    'impairments',
    'parameters',
    'pollution',
    'pollutantloads',
    'pollutantlist',
    'waterqualityparameters',
  ],

  goals: [
    'goals',
    'goal',
    'objectives',
    'objective',
    'targets',
    'target',
    'milestones',
    'milestone',
    'outcomes',
    'outcome',
    'goalstatements',
  ],

  bmps: [
    'bmps',
    'bmp',
    'bestmanagementpractices',
    'managementpractices',
    'practices',
    'measures',
    'controlmeasures',
    'structuralbmps',
    'nonstructuralbmps',
    'bestmgmtpractices',
    'bestmgtpractices',
  ],

  implementationActivities: [
    'implementationactivities',
    'implementationactivity',
    'implementation',
    'actions',
    'action',
    'activities',
    'activity',
    'implementationactions',
    'implementationmeasures',
    'workplan',
    'workitems',
    'tasks',
    'task',
  ],

  monitoringMetrics: [
    'monitoringmetrics',
    'monitoringmetric',
    'monitoring',
    'metrics',
    'metric',
    'monitoringparameters',
    'wqmonitoring',
    'monitoringplan',
    'waterqualitymetrics',
    'indicators',
    'kpis',
    'kpi',
  ],

  outreachActivities: [
    'outreachactivities',
    'outreachactivity',
    'outreach',
    'education',
    'publicoutreach',
    'awareness',
    'awarenessactivities',
    'stakeholderengagement',
    'communication',
    'training',
    'participation',
    'communityengagement',
  ],

  geographicAreas: [
    'geographicareas',
    'geographicarea',
    'geography',
    'areas',
    'area',
    'watershed',
    'watersheds',
    'subwatershed',
    'subwatersheds',
    'huc',
    'huc12',
    'locations',
    'location',
    'scopearea',
    'projectarea',
  ],

  summary: [
    'summary',
    'summaries',
    'overview',
    'executivesummary',
    'abstract',
    'synopsis',
  ],
};

/**
 * Build a fast lookup { normalizedAlias: canonicalKey }
 */
const ALIAS_TO_CANON = (() => {
  const map = new Map();
  for (const [canon, aliasList] of Object.entries(ALIASES)) {
    for (const a of aliasList) map.set(normalizeKeyName(a), canon);
  }
  return map;
})();

/**
 * Return aliases for a canonical key as normalized strings.
 */
function aliasesFor(canonical) {
  const arr = ALIASES[canonical] || [];
  return arr.map(normalizeKeyName);
}

/**
 * Try to find value for `canonicalKey` in a (possibly messy) parsed JSON object.
 * - Searches root keys (with alias matching).
 * - If not found, shallow-searches one nested object level.
 */
function findValueByAlias(obj, canonicalKey) {
  if (!obj || typeof obj !== 'object') return undefined;

  const wantAliases = new Set(aliasesFor(canonicalKey));

  // 1) direct props
  for (const [k, v] of Object.entries(obj)) {
    const nk = normalizeKeyName(k);
    if (wantAliases.has(nk)) return v;
  }
  // 2) shallow nested objects
  for (const v of Object.values(obj)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      for (const [k2, v2] of Object.entries(v)) {
        const nk2 = normalizeKeyName(k2);
        if (wantAliases.has(nk2)) return v2;
      }
    }
  }
  return undefined;
}

/**
 * Shape coercion: ensure arrays where the UI expects arrays.
 */
function coerceToExpectedShape(canonicalKey, value) {
  const expectArray = new Set([
    'pollutants',
    'goals',
    'bmps',
    'implementationActivities',
    'monitoringMetrics',
    'outreachActivities',
    'geographicAreas',
  ]);

  if (expectArray.has(canonicalKey)) {
    if (Array.isArray(value)) return value;
    if (value == null) return [];
    // Single item? wrap
    return [value];
  }
  // identity / summary may be object or string-ish
  if (canonicalKey === 'identity') {
    if (value && typeof value === 'object') return value;
    return {}; // empty identity object
  }
  if (canonicalKey === 'summary') {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object')
      return value.text ?? JSON.stringify(value);
    return '';
  }
  return value;
}

/**
 * Coerce any raw model output to: { [canonicalKey]: <expected shape> }
 * - Tolerates prose around the JSON
 * - Accepts bare arrays
 * - Applies alias mapping for wrong keys
 */
function coerceStrictJSON(raw, canonicalKey) {
  // 1) If the model returned a bare array matching an array-type key, wrap it.
  try {
    const maybe = JSON.parse(raw);
    if (Array.isArray(maybe)) {
      return JSON.stringify({
        [canonicalKey]: coerceToExpectedShape(canonicalKey, maybe),
      });
    }
    if (maybe && typeof maybe === 'object') {
      // direct hit?
      let val = findValueByAlias(maybe, canonicalKey);
      if (typeof val === 'undefined') {
        // Accept "goal" → goals, etc., via ALIAS_TO_CANON on each prop
        for (const [k, v] of Object.entries(maybe)) {
          const canon = ALIAS_TO_CANON.get(normalizeKeyName(k));
          if (canon === canonicalKey) {
            val = v;
            break;
          }
        }
      }
      const coerced = coerceToExpectedShape(canonicalKey, val);
      return JSON.stringify({ [canonicalKey]: coerced });
    }
  } catch (_) {
    // fall through to brace-slice attempt
  }

  // 2) Brace-slice fallback for prose-wrapped JSON
  const s = raw.indexOf('{');
  const e = raw.lastIndexOf('}');
  if (s >= 0 && e > s) {
    try {
      const sliced = JSON.parse(raw.slice(s, e + 1));
      const val = findValueByAlias(sliced, canonicalKey);
      const coerced = coerceToExpectedShape(canonicalKey, val);
      return JSON.stringify({ [canonicalKey]: coerced });
    } catch (_) {}
  }

  // 3) Nothing parsable — return empty of the right shape
  return JSON.stringify({
    [canonicalKey]: coerceToExpectedShape(canonicalKey, undefined),
  });
}

module.exports = {
  coerceStrictJSON,
  normalizeKeyName,
  ALIASES,
  ALIAS_TO_CANON,
};
