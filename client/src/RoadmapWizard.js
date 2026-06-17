import React, { useState } from "react";
import { X, Compass, Calendar, Building2 } from "lucide-react";
import { api } from "./api";

export default function RoadmapWizard({ onClose, onRoadmapGenerated, activeSessionId }) {
  const [companyType, setCompanyType] = useState("");
  const [timeline, setTimeline] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!companyType || !timeline) {
      setError("Please select both company target objective and target preparation timeline.");
      return;
    }
    setError("");
    setLoading(false);
    setLoading(true);

    try {
      const result = await api.generateRoadmap({
        sessionId: activeSessionId,
        companyType,
        timeline
      });
      
      onRoadmapGenerated(result);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to generate roadmap infographics. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Compass className="text-primary" size={20} style={{ color: "var(--primary)" }} />
            <h2>Placement Preparation Roadmap Wizard</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="resume-form">
          <h3 className="form-step-title">Configure Target Goals</h3>
          
          <label style={{ marginBottom: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
              <Building2 size={16} /> <span>Target Company Profile *</span>
            </div>
            <select 
              value={companyType} 
              onChange={(e) => setCompanyType(e.target.value)}
              style={{ padding: "10px", borderRadius: "6px", background: "var(--panel-strong)", color: "var(--text)", border: "1px solid var(--line)" }}
              required
            >
              <option value="">-- Choose Company Class --</option>
              <option value="product">Product-Based Companies (FAANG, Tier-1 Startups, Unicorns)</option>
              <option value="service">Service-Based Companies (TCS, Infosys, Wipro, Cognizant)</option>
            </select>
          </label>

          <label style={{ marginBottom: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
              <Calendar size={16} /> <span>Preparation Timeline Window *</span>
            </div>
            <select 
              value={timeline} 
              onChange={(e) => setTimeline(e.target.value)}
              style={{ padding: "10px", borderRadius: "6px", background: "var(--panel-strong)", color: "var(--text)", border: "1px solid var(--line)" }}
              required
            >
              <option value="">-- Select Timeframe Horizon --</option>
              <option value="1_month">1 Month Crash Sprint (High Intensity)</option>
              <option value="3_months">3 Months Core Runway (Optimal Strategy)</option>
              <option value="6_months">6 Months Complete Transformation Profile</option>
            </select>
          </label>

          {error && <p className="error-text">{error}</p>}

          <div className="form-actions">
            <button type="button" className="secondary-button" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={loading}>
              {loading ? "Generating Roadmap Infographics..." : "Forge Roadmap Assets"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
