import Joi from "joi";
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { companyCategories, evaluateCompanies, getCompanyDataset } from "../services/companyEligibilityService.js";

export const eligibilityRouter = Router();

eligibilityRouter.use(requireAuth);

const checkSchema = Joi.object({
  cgpa: Joi.number().min(0).max(10).required(),
  branch: Joi.string().min(1).max(80).required(),
  backlogs: Joi.number().integer().min(0).required(),
  skills: Joi.alternatives().try(
    Joi.string().min(1).max(1000),
    Joi.array().items(Joi.string().max(80)).min(1)
  ).required(),
  preferredCompanyType: Joi.string().valid("", ...companyCategories).allow("").default("")
});

eligibilityRouter.get("/companies", asyncHandler(async (_req, res) => {
  const companies = await getCompanyDataset();
  res.json({ companies, categories: companyCategories });
}));

eligibilityRouter.post("/check", validate(checkSchema), asyncHandler(async (req, res) => {
  const companies = await getCompanyDataset();
  const result = evaluateCompanies(req.body, companies);
  res.json({
    ...result,
    categories: companyCategories,
    datasetNote: "Sample/demo eligibility criteria. Verify official campus notification before applying."
  });
}));
