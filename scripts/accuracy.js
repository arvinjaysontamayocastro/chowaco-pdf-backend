// scripts/accuracy.js
// Minimal accuracy harness. Usage:
//   node scripts/accuracy.js ./samples
// where ./samples contains pairs: {name}.pdf and {name}.gold.json
//
// Metrics: per-section precision/recall/F1 and overall.

const fs = require('fs');
const path = require('path');
const { getAnswerForGuid, processPDFAndStore, deleteDocumentsByGuid } = require('../src/services/documentService');

const KEYS = ['goals','bmps','implementation','monitoring','outreach','geographicAreas','pollutants'];

function f1(p, r){ return (p+r===0)?0:(2*p*r/(p+r)); }

function jaccardLike(a,b){
  const A = new Set(a.map(x => JSON.stringify(x)));
  const B = new Set(b.map(x => JSON.stringify(x)));
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  const precision = inter / (A.size || 1);
  const recall = inter / (B.size || 1);
  return { precision, recall, f1: f1(precision, recall) };
}

async function run(samplesDir){
  const files = fs.readdirSync(samplesDir).filter(f => f.endsWith('.pdf'));
  let overall = { precision:0, recall:0, f1:0, n:0 };
  for (const pdf of files){
    const name = pdf.replace(/\.pdf$/,''); 
    const goldPath = path.join(samplesDir, name + '.gold.json');
    if (!fs.existsSync(goldPath)) { console.warn('No gold for', name); continue; }
    const guid = name + '-' + Date.now();
    const pdfBuf = fs.readFileSync(path.join(samplesDir, pdf));
    await processPDFAndStore(guid, pdfBuf);
    let f1sum = 0; let count = 0;
    let confSum = 0;
    for (const k of KEYS){
      const { answer, confidence } = await getAnswerForGuid(guid, k);
      confSum += (confidence || 0);
      const gold = JSON.parse(fs.readFileSync(goldPath,'utf-8'))[k] || [];
      const { precision, recall, f1 } = jaccardLike(Array.isArray(answer)?answer:[], Array.isArray(gold)?gold:[]);
      console.log(`[${name}] ${k}: P=${precision.toFixed(2)} R=${recall.toFixed(2)} F1=${f1.toFixed(2)}`);
      f1sum += f1; count++;
    }
    const avgF1 = f1sum / (count || 1);
    const avgConf = confSum / (count || 1);
    console.log(`[${name}] AVG F1: ${avgF1.toFixed(2)} | AVG Confidence: ${avgConf.toFixed(2)}`);
    overall.f1 += avgF1; overall.n++;
    try { await deleteDocumentsByGuid(guid); } catch {}
  }
  if (overall.n>0){ overall.f1 /= overall.n; }
  console.log(`Overall Average F1 across samples: ${overall.f1.toFixed(2)}`);
}

if (require.main === module){
  const dir = process.argv[2] || './samples';
  run(dir).catch(e => { console.error(e); process.exit(1); });
}
