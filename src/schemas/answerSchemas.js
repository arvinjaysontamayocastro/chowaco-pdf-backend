// src/schemas/answerSchemas.js
const { z } = require('zod');

const Goal = z.object({
  id: z.number().int().positive().optional(),
  description: z.string().min(1),
  completionRate: z.string().optional(),
  category: z.string().optional(),
  targetDate: z.string().optional(),
  relatedPollutants: z.array(z.string()).optional(),
  successMetrics: z.array(z.string()).optional(),
});

const BMP = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  target: z.string().optional(),
  location: z.string().optional(),
});

const Pollutant = z.object({
  name: z.string().min(1),
  concentration: z.string().optional(),
  unit: z.string().optional(),
  target: z.string().optional(),
});

const ImplementationActivity = z.object({
  task: z.string().min(1),
  timeline: z.string().optional(),
  responsible: z.string().optional(),
});

const MonitoringMetric = z.object({
  metric: z.string().min(1),
  method: z.string().optional(),
  frequency: z.string().optional(),
  target: z.string().optional(),
});

const OutreachActivity = z.object({
  activity: z.string().min(1),
  audience: z.string().optional(),
  outcome: z.string().optional(),
});

const GeographicArea = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

const validators = {
  goals: z.array(Goal),
  bmps: z.array(BMP),
  pollutants: z.array(Pollutant),
  implementation: z.array(ImplementationActivity),
  monitoring: z.array(MonitoringMetric),
  outreach: z.array(OutreachActivity),
  geographicAreas: z.array(GeographicArea),
};

function validateSection(key, obj) {
  const schema = validators[key];
  if (!schema) return obj;
  const res = schema.safeParse(obj);
  if (res.success) return res.data;
  // coerce basic: drop null/empty items and try again
  if (Array.isArray(obj)) {
    const pruned = obj.filter(Boolean).map(x => {
      if (x && typeof x === 'object') {
        const y = { ...x };
        Object.keys(y).forEach(k => {
          if (y[k] == null || y[k] === '') delete y[k];
        });
        return y;
      }
      return x;
    });
    const res2 = schema.safeParse(pruned);
    if (res2.success) return res2.data;
  }
  return []; // last resort: empty set instead of bad shape
}

module.exports = { validateSection };
