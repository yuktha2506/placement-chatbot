import Joi from "joi";
import { Router } from "express";
import { v4 as uuid } from "uuid";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { generateSessionTitle } from "../utils/title.js";
import { generateRoadmap, generateRoadmapImage } from "../services/roadmapService.js";

export const roadmapRouter = Router();

const roadmapSchema = Joi.object({
  sessionId: Joi.string().guid({ version: "uuidv4" }).allow(null),
  companyType: Joi.string().valid("product", "service").required(),
  timeline: Joi.string().valid("1_month", "3_months", "6_months").required()
});

roadmapRouter.post(
  "/generate",
  requireAuth,
  validate(roadmapSchema),
  asyncHandler(async (req, res) => {
    const { companyType, timeline } = req.body;
    let { sessionId } = req.body;

    if (!sessionId) {
      sessionId = uuid();
      try {
        await pool.execute(
          "INSERT INTO sessions (id, user_id, title) VALUES (?, ?, ?)",
          [
            sessionId,
            req.user.id,
            generateSessionTitle(
              `${companyType === "product" ? "Product" : "Service"} Company ${timeline.replace("_", " ")} Roadmap`
            )
          ]
        );
      } catch (error) {
        console.error("Failed to create session:", {
          error: error.message,
          userId: req.user.id
        });
        return res.status(500).json({ message: "Failed to create session." });
      }
    } else {
      try {
        const [sessions] = await pool.execute(
          "SELECT id FROM sessions WHERE id = ? AND user_id = ?",
          [sessionId, req.user.id]
        );

        if (!sessions.length) {
          return res.status(404).json({ message: "Session not found." });
        }
      } catch (error) {
        console.error("Failed to validate session:", {
          error: error.message,
          sessionId
        });
        return res.status(500).json({ message: "Failed to validate session." });
      }
    }

    try {
      console.info("[roadmap] Generating roadmap content", { companyType, timeline });
      const roadmapContent = generateRoadmap({ companyType, timeline });

      if (!roadmapContent) {
        return res.status(400).json({ message: "Invalid roadmap configuration." });
      }

      // Generate DALL-E image 
      console.info("[roadmap] Starting DALL-E image generation", { companyType, timeline });
      const infographicUrl = await generateRoadmapImage({ companyType, timeline });
      
      if (infographicUrl) {
        console.info("[roadmap] Image generation completed successfully", { imageUrl: infographicUrl?.substring(0, 50) });
      } else {
        console.warn("[roadmap] Image generation returned null. Check if OPENAI_API_KEY is configured.", { companyType, timeline });
      }

      // Store the roadmap in messages for history
      const userId = uuid();
      const assistantId = uuid();
      
      await pool.execute(
        "INSERT INTO messages (id, session_id, role, content) VALUES (?, ?, 'user', ?)",
        [
          userId,
          sessionId,
          `Generated a personalized roadmap strategy for ${
            companyType === "product" ? "Product-Based" : "Service-Based"
          } companies scheduled on a ${timeline.replace(/_/g, " ")} timeline tracking loop.`
        ]
      );

      await pool.execute(
        "INSERT INTO messages (id, session_id, role, content) VALUES (?, ?, 'assistant', ?)",
        [assistantId, sessionId, roadmapContent.answer]
      );

      const response = {
        sessionId,
        meta: {
          companyType,
          timeline
        },
        answer: roadmapContent.answer,
        infographicUrl: infographicUrl || undefined
      };

      console.info("[roadmap] Returning roadmap response", { 
        hasImage: !!infographicUrl, 
        sessionId,
        companyType,
        timeline
      });

      res.json(response);
    } catch (error) {
      console.error("[roadmap] Failed to generate roadmap:", {
        error: error.message,
        stack: error.stack,
        companyType,
        timeline,
        sessionId
      });
      res.status(500).json({ message: "Failed to generate roadmap. Please try again." });
    }
  })
);
