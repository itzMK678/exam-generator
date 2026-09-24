import "dotenv/config";

const requiredEnv = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "GEMINI_API_KEY",
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const env = {
  port: Number(process.env.PORT || 5000),

  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",

  supabaseUrl: process.env.SUPABASE_URL,

  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,

  pythonWorkerUrl:
    process.env.PYTHON_WORKER_URL || "http://127.0.0.1:8000",

  geminiApiKey: process.env.GEMINI_API_KEY,

  geminiEmbeddingModel:
    process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-2",

  geminiEmbeddingDimensions: Number(
    process.env.GEMINI_EMBEDDING_DIMENSIONS || 768
  ),

  geminiGenerationModel:
    process.env.GEMINI_GENERATION_MODEL || "gemini-3.8-flash",

  maxChunkWordCount: Number(process.env.MAX_CHUNK_WORD_COUNT || 500),

  chunkOverlap: Number(process.env.CHUNK_OVERLAP || 75),

  maxRAGWords: Number(process.env.MAX_RAG_WORDS || 35000),
};