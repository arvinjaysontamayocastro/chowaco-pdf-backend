// src/utils/fieldAnchors.js
// Provide per-field query hints to steer retrieval toward relevant sections.
const anchors = {
  goals: "Project goals, objectives, targets, timelines in the plan",
  bmps: "Best Management Practices, structural or non-structural measures",
  pollutants: "Pollutants and parameters like nitrogen, phosphorus, TSS, sediment, units and targets",
  implementation: "Implementation activities, schedules, responsible parties, budgets",
  monitoring: "Monitoring metrics, methods, frequency, baselines and targets",
  outreach: "Outreach and education activities, audiences, workshops",
  geographicAreas: "Geographic areas, subwatersheds, coverage in acres or km^2"
};

function anchorFor(key) {
  return anchors[key] || '';
}

module.exports = { anchorFor };
