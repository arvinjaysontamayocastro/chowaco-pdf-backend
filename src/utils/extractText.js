const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const {
  getCachedEmbedding,
  setCachedEmbedding,
} = require('../adapters/embeddingCache');
const MODEL = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';

// Strongly-typed section keys your frontend calls in /ask
// (must match PDFReport.tsx keys)

let questionsEmbed = {
  identity: '',
  pollutants: '',

  goals: '',
  bmps: '',
  implementation: '',
  monitoring: '',
  outreach: '',
  geographicAreas: '',
  // summary: '', // this will be computed in the code instead
};

// High-accuracy "tiny contracts" tuned for the 51 watershed PDFs
// Key conventions applied to EVERY section below:
// - Output VALID JSON ONLY that matches the interface.
// - Use ONLY evidence in the provided context; DO NOT GUESS.
// - Normalize numbers by stripping $ and commas when clearly numeric; if ambiguous, keep the original string.
// - Prefer values from tables ("Action Plan", "Cost Estimate/Practices", "Monitoring", "Implementation") and figure/table captions.
// - Attach citations: add a top-level _citations array for the section or one _citations per item when applicable,
//   each entry shaped as { field?: string, index?: number, pdfId: string, pageStart: number, pageEnd: number }.

let questionQueries = {
  identity:
    ' identity: ReportIdentity; // Plan identity and metadata (extract ONLY if explicit; do not infer)\n\n' +
    ' interface ReportIdentity {\n\n' +
    '  huc: string; // Prefer 12-digit HUC (strip spaces/hyphens). Accept 8/10/12 if that is all that appears. Look in title/intro, Study Area text, tables, figure captions, and map labels. \n\n' +
    '  mwsId?: string; // Optional Mississippi Watershed/internal ID if explicitly named \n\n' +
    '  basinGroup?: string; // Basin group/name if explicitly stated \n\n' +
    '  subbasin?: string; // Sub-basin name/code if explicitly stated \n\n' +
    '  planYear?: number; // Final/approved/revised year (YYYY). Prefer explicit labels: "Final", "Approved", "Revised", "Issued" \n\n' +
    "  planType?: string; // e.g., '9-Element', 'Nine-Element', 'Section 319', or 'Watershed Plan' (use the exact phrase appearing in text) \n\n" +
    '}\n\n' +
    ' Rules: JSON only. Omit absent fields. Add _citations for each populated field.',

  pollutants:
    ' pollutants: Pollutant[]; // Pollutants with loads/targets if provided. Prefer tables listing parameters and loads/limits.\n\n' +
    ' interface Pollutant {\n\n' +
    "  name: string; // Examples: 'Sediment', 'TN' (Total Nitrogen), 'TP' (Total Phosphorus), 'TSS', 'E. coli', 'Bacteria' \n\n" +
    '  currentLoad?: number | string; // If a clean number is present, return number; else keep exact string (e.g., ranges, text) \n\n' +
    '  targetLoad?: number | string; // Same rule as currentLoad \n\n' +
    "  unit?: string; // Units as shown (e.g., 'tons/yr', 'mg/L', 'cfu/100 mL') \n\n" +
    '}\n\n' +
    ' Notes: Accept synonyms (e.g., Bacteria/E. coli; TP/PO4; TN/NO3 when explicitly mapped). Preserve units. Attach _citations per item.',

  goals:
    ' goals: Goal[]; // Most often in "Action Plan", "Goals/Objectives", or strategy tables.\n\n' +
    ' interface Goal {\n\n' +
    '  id: number; // If no explicit ID, use row index starting at 1 \n\n' +
    '  description: string; // Copy the goal text plainly; remove decorative bullets \n\n' +
    '  completionRate: string; // %, or qualitative (e.g., "Ongoing", "Complete", "In progress") exactly as stated \n\n' +
    "  category?: string; // Optional: thematic bucket like 'Sediment', 'Education', 'Riparian' if explicitly present \n\n" +
    '  targetDate?: string; // If a date or period is explicitly given \n\n' +
    '  relatedPollutants?: string[]; // Only if explicitly linked \n\n' +
    '  successMetrics?: string[]; // KPIs/metrics if listed \n\n' +
    '}\n\n' +
    ' Rules: Prefer table rows. If only prose/bullets exist, extract consistently. Add _citations per item (index points to row).',

  bmps:
    ' bmps: BMP[]; // Typically in "Cost Estimate", "Practices", or BMP tables. Use row-by-row extraction.\n\n' +
    ' interface BMP {\n\n' +
    "  name: string; // BMP name as in the table (e.g., 'Fencing', 'Grade Stabilization Structure') \n\n" +
    '  sizeAmount: number; // Numeric quantity if clearly numeric; else omit and keep info in name/notes if needed \n\n' +
    "  sizeUnits: string; // e.g., 'ea', 'ft', 'sq ft', 'ac' \n\n" +
    '  estimatedCost: number; // Strip $ and commas if clearly numeric; if a range or not numeric, omit \n\n' +
    "  estimatedCurrency: string; // Usually 'USD' unless explicitly different \n\n" +
    '  bmptype?: string; // Optional: Structural/Non-structural, etc., if column provided \n\n' +
    '  location?: { lat: number; lng: number } | string; // Include only if explicitly stated \n\n' +
    '  expectedLoadReduction?: { pollutant: string; amount: number; unit: string }[]; // If provided in table/notes \n\n' +
    '  unitCost?: number; // Only if unit cost column exists or can be unambiguously derived \n\n' +
    '  lifecycleYears?: number; // If lifespan stated \n\n' +
    '  oAndM?: string; // Ops & maintenance notes if listed \n\n' +
    '}\n\n' +
    ' Rules: Prioritize the official cost/practices table. Do not invent quantities. Add _citations per item.',

  implementation:
    ' implementation: ImplementationActivity[]; // Planned actions & timing; often in an implementation schedule table.\n\n' +
    ' interface ImplementationActivity {\n\n' +
    '  id: number; // Row index if no explicit ID \n\n' +
    '  description: string; // Plain action description \n\n' +
    '  timeline: string; // Narrative/phase window (e.g., "Years 1–3") \n\n' +
    "  phase?: string; // e.g., 'Phase 1', if present \n\n" +
    '  start?: string; // Date string if explicit \n\n' +
    '  end?: string; // Date string if explicit \n\n' +
    '  responsibleParties?: string[]; // Agencies/partners as listed \n\n' +
    '  dependencies?: number[]; // ID references if the schedule refers to them \n\n' +
    '}\n\n' +
    ' Notes: Prefer schedule tables. Keep date text as shown. Add _citations per item.',

  monitoring:
    ' monitoring: MonitoringMetric[]; // Parameters, thresholds/criteria, frequency, and methods. Look for monitoring tables/sections.\n\n' +
    ' interface MonitoringMetric {\n\n' +
    "  parameter: string; // e.g., 'TSS', 'DO', 'Turbidity', 'E. coli', 'TN', 'TP' \n\n" +
    '  threshold: string; // Numeric or narrative criterion exactly as stated \n\n' +
    '  method?: string; // Sampling/analysis method if listed \n\n' +
    "  frequency?: string; // e.g., 'monthly', 'quarterly' \n\n" +
    '  location?: { lat: number; lng: number } | string; // Station/description if explicit \n\n' +
    '  baseline?: number; // If clearly numeric and labeled \n\n' +
    '  target?: number; // If clearly numeric and labeled \n\n' +
    '  unit?: string; // Units for numeric fields \n\n' +
    '}\n\n' +
    ' Rules: Keep units; when not clearly numeric, keep values as strings in threshold. Add _citations per item.',

  outreach:
    ' outreach: OutreachActivity[]; // Outreach/education actions. Often a separate table or bullets.\n\n' +
    ' interface OutreachActivity {\n\n' +
    '  id: number; // Row index if no explicit ID \n\n' +
    '  description: string; // Outreach description \n\n' +
    "  intendedAudience: string; // e.g., 'landowners', 'K–12', 'producers' \n\n" +
    '  date?: string; // Date or window if given \n\n' +
    '  location?: string; // Venue/area \n\n' +
    '  budget?: number; // Strip $/commas if numeric \n\n' +
    '  materials?: string[]; // Materials/media if listed \n\n' +
    '  partners?: string[]; // Partner orgs if listed \n\n' +
    '}\n\n' +
    ' Notes: Prefer the outreach/education table if present. Add _citations per item.',

  geographicAreas:
    ' geographicAreas: GeographicArea[]; // Named areas & sizes; look for HUC-12 names, reaches, subwatersheds, and maps/tables.\n\n' +
    ' interface GeographicArea {\n\n' +
    '  name: string; // Area name (HUC-12 name, creek reach, subwatershed) \n\n' +
    '  size: number; // Numeric size if clearly numeric \n\n' +
    '  huc?: string; // 8/10/12-digit HUC if listed for the area \n\n' +
    '  ecoregionLevel3?: string; // If explicitly mentioned \n\n' +
    '  ecoregionLevel4?: string; // If explicitly mentioned \n\n' +
    '  county?: string; // County name(s) if specified \n\n' +
    '  centroid?: { lat: number; lng: number }; // Only if coordinates are given \n\n' +
    "  areaUnits?: string; // Units for size ('acres', 'sq mi', 'ha') \n\n" +
    '}\n\n' +
    ' Rules: Pull from area/summary tables and figure captions. If size is a range or ~approximate, keep as string in name/notes instead of forcing a number. Add _citations per item.',
};

// Optional tiny in-process cache to avoid duplicate round-trips within a single instance lifetime.
// This is useful if we plan to use this on a server instead of serverless
const localCache = new Map(); // key -> Float32Array|number[]

async function getQuestionEmbedding(key) {
  const localKey = `${key}::${MODEL}`;
  if (localCache.has(localKey)) return localCache.get(localKey);

  // 1) Check Supabase cache
  const cached = await getCachedEmbedding(key, MODEL);
  if (cached && Array.isArray(cached) && cached.length) {
    localCache.set(localKey, cached);
    return cached;
  }

  // 2) Compute via OpenAI then persist
  const input = questionQueries[key] || key; // fall back to key name if somehow missing
  const r = await openai.embeddings.create({ model: MODEL, input });
  const embedding = r.data[0].embedding;

  // Persist (fire-and-forget is acceptable, but await ensures durability before returning)
  await setCachedEmbedding(key, MODEL, embedding);

  localCache.set(localKey, embedding);
  return embedding;
}

module.exports = {
  questionQueries,
  getQuestionEmbedding,
};
