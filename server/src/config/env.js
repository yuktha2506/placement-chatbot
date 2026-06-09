import dotenv from "dotenv";

dotenv.config();

function cleanSecret(value, placeholders = []) {
  const secret = value?.trim() || "";
  return placeholders.includes(secret.toLowerCase()) ? "" : secret;
}

export const env = {
  port: Number(process.env.PORT || 5000),
  nodeEnv: process.env.NODE_ENV || "development",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  db: {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "placement_chatbot"
  },
  jwtSecret: process.env.JWT_SECRET || "dev_only_change_me",
  aiProvider: (process.env.AI_PROVIDER || "huggingface").toLowerCase(),
  openaiApiKey: cleanSecret(process.env.OPENAI_API_KEY, ["your_openai_api_key"]),
  openaiModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
  huggingFaceToken: cleanSecret(process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY, [
    "your_hugging_face_token",
    "your_huggingface_token",
    "your_huggingface_api_key"
  ]),
  huggingFaceModel: process.env.HF_MODEL || "openai/gpt-oss-120b:fastest",
  pythonPath: process.env.PYTHON_PATH || "C:\\Users\\Admin\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe"
};
