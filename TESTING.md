# Accuracy Testing

## Target metrics (per assessment)
- ≥75% accuracy on goals/BMPs/activities
- ≥75% accuracy on quantitative metrics
- Zero false positives for exact copied names

## Procedure
1. Prepare 3–5 gold PDFs (MS watershed plans) and a small JSON gold file per section.
2. Run a script to compute precision/recall for:
   - Goals (titles + key numbers)
   - BMPs (names + costs/sizes)
   - Activities / Monitoring metrics (targets, units)
3. Report summary accuracy and error cases.

_Note: script stub to be added in `/scripts/accuracy.js`._


## OCR Fallback Scenario
Set `OCR_ENABLED=true` and optionally `OCR_MIN_TEXT=500` to enable OCR for scanned PDFs. 
Add at least one scanned sample in `samples/` and verify that `npm run accuracy` prints higher F1 for OCR-heavy documents.
