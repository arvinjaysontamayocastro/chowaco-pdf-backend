const pdfParse = require('pdf-parse');

async function parsePDF(input) {
  if (!Buffer.isBuffer(input)) {
    throw new Error('parsePDF expects a Buffer (got non-buffer).');
  }
  const data = await pdfParse(input);
  return data.text;
}

module.exports = { parsePDF };
