// Quick harness: compare extraction vs gold answers
import fs from "fs";
import { doAsk } from "../services/askService.js";

const [,, pdfPath, question] = process.argv;

async function run() {
  console.log("Testing", pdfPath, "Q:", question);
  const answer = await doAsk("local-file", question);
  console.log("LLM Answer:", answer);
  try {
    const gold = JSON.parse(fs.readFileSync(pdfPath + ".gold.json", "utf8"));
    console.log("Gold:", gold.answer);
  } catch {
    console.log("No gold file found, skipping comparison");
  }
}
run();
