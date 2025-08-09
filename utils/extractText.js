const { OpenAI } = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

let questionsEmbed = {
  goals: "",
  bmps: "",
  implementation: "",
  monitoring: "",
  outreach: "",
  geographicAreas: "",
  summary: "",
};
let questionQueries = {
  goals:
    " goals: Goal[]; // List of goals related to the plan \n\n " +
    "    interface Goal { \n\n " +
    "        id: number; // Identifier for the goal \n\n " +
    "        description: string; // Description of the goal \n\n " +
    "        completionRate: number; // Completion ratre of the goal \n\n " +
    "    }",
  bmps:
    " bmps: BMP[];  // List of best management practices from Cost Estimate table \n\n " +
    "        interface BMP { \n\n " +
    "        name: string; // Name of the BMP \n\n " +
    "        sizeAmount: number; // Amount or size indicator for the BMP \n\n " +
    "        sizeUnits: string; // Unit of size (e.g., each, tns, ac, ft, cuyd, cu yd) \n\n " +
    "        estimatedCost: number; // Estimated cost for the BMP \n\n " +
    "        estimatedCurrency: string; // Currency of the estimated cost \n\n " +
    "   }",
  implementation:
    " implementation: ImplementationActivity[]; // Activities planned for implementation \n\n " +
    "        interface ImplementationActivity { \n\n " +
    "        id: number; // Identifier for the implementation activity \n\n " +
    "        description: string; // Description of the activity \n\n " +
    "        timeline: string; // Proposed timeline for the activity \n\n " +
    "    }",
  monitoring:
    " monitoring: MonitoringMetric[]; // Metrics defined for monitoring water quality \n\n " +
    "    interface MonitoringMetric { \n\n " +
    "        parameter: string; // The water quality parameter to be monitored \n\n " +
    "        threshold: string; // The compliance threshold \n\n " +
    "    }",
  outreach:
    " outreach: OutreachActivity[]; // Activities planned for outreach and education \n\n " +
    "    interface OutreachActivity { \n\n " +
    "        id: number; // Identifier for the outreach activity \n\n " +
    "        description: string; // Description of the activity \n\n " +
    "       intendedAudience: string; // The audience for the outreach activity \n\n " +
    "    }",
  geographicAreas:
    " geographicAreas: GeographicArea[]; // Geographic areas involved in the plan \n\n " +
    "    interface GeographicArea { \n\n " +
    "        name: string; // Name of the geographic area \n\n " +
    "        size: number; // Size of the area in acres or relevant units \n\n " +
    "    }",
  summary:
    " summary: { \n\n " +
    "    totalGoals: number; // Total number of goals identified in the watershed plan \n\n " +
    "    totalBMPs: number; // Total number of BMPs proposed \n\n " +
    "    completionRate: number; // Estimated completion rate of projects as a percentage \n\n " +
    "    }",
};

const getQuestionEmbedding = async (key) => {
  if (
    questionsEmbed[key] === "" ||
    questionsEmbed[key] === null ||
    questionsEmbed[key] === undefined
  ) {
    const qEmbed = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: questionQueries[key],
    });

    questionsEmbed[key] = qEmbed.data[0].embedding;
  }

  return questionsEmbed[key];
};

module.exports = { getQuestionEmbedding, questionQueries };
