// src/utils/fieldAnchors.js
const anchors = {
  goals: "Project goals, objectives, targets, measurable outcomes, timelines.",
  bmps: "Best Management Practices (BMPs), structural and non-structural measures, locations.",
  pollutants: "Pollutants and parameters (e.g., nitrogen, phosphorus, TSS, sediment), units, baselines and targets.",
  implementation: "Implementation activities, schedules, budgets, responsible parties.",
  monitoring: "Monitoring metrics, methods, frequency, baseline, target thresholds.",
  outreachActivities: "Outreach and education activities, audiences, workshops, engagement.",
  geographicAreas: "Geographic areas, subwatersheds, coverage in acres / km^2, named reaches."
};
function anchorFor(key){ return anchors[key] || ""; }
module.exports = { anchorFor };
