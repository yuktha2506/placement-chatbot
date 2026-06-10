import cors from "cors";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import { authRouter } from "./routes/auth.js";
import { chatRouter } from "./routes/chat.js";
import { resumeRouter } from "./routes/resume.js";
import { sessionsRouter } from "./routes/sessions.js";

const app = express();

// Configure CORS to accept localhost on any port in development
const corsOptions = {
  credentials: true,
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // In development, allow all localhost origins
    if (env.nodeEnv === "development" && origin.includes("localhost")) {
      return callback(null, true);
    }
    
    // In production, use the configured client URL
    if (origin === env.clientUrl) {
      return callback(null, true);
    }
    
    callback(new Error("CORS not allowed"));
  }
};

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: "12mb" }));
app.use(rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false
}));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "placement-chatbot-server" });
});

app.use("/auth", authRouter);
app.use("/chat", chatRouter);
app.use("/resume", resumeRouter);
app.use("/sessions", sessionsRouter);

app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || "Something went wrong. Please try again."
  });
});

app.listen(env.port, () => {
  console.log(`Placement chatbot server running on http://localhost:${env.port}`);
});
