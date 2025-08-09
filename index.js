const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const pdfParse = require("pdf-parse");
const { getEmbeddings, searchChunks, askGPT } = require("./utils/rag");
const {
  questionQueries,
  getQuestionEmbedding,
} = require("./utils/extractText");
const { OpenAI } = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const app = express();
const upload = multer({ dest: "uploads/" });

app.use(cors());
app.use(express.json());

let documentChunks = [];
let documentEmbeddings = [];

app.post("/upload", upload.single("pdf"), async (req, res) => {
  const dataBuffer =
    req.file.buffer || require("fs").readFileSync(req.file.path);
  const pdfData = await pdfParse(dataBuffer);
  const rawText = pdfData.text;

  // Chunk and embed
  const { chunks, embeddings } = await getEmbeddings(rawText);

  documentChunks = chunks;
  documentEmbeddings = embeddings;

  res.json({
    message: "PDF processed successfully",
    chunks: chunks.length,
    documentEmbeddings: documentEmbeddings,
  });
});

app.post("/ask", async (req, res) => {
  const { key } = req.body; // key

  const questionEmbedding = await getQuestionEmbedding(key);

  const topChunks = searchChunks(
    questionEmbedding,
    documentEmbeddings,
    documentChunks
  );

  const answer = await askGPT(questionQueries[key], topChunks);

  res.json({ answer });
});

app.listen(5000, () => {
  console.log(`Server started...`);
});
