import React, { useState } from "react";
import { Download, X } from "lucide-react";
import { api } from "./api";

export default function ResumeForm({ onClose }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    linkedin: "",
    github: "",
    college: "",
    branch: "",
    cgpa: "",
    graduationYear: "",
    experience: "",
    projects: "",
    skills: "",
    certifications: "",
    leadership: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api.generateResume(formData);
      const blob = new Blob([response], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${formData.fullName.replace(/\s+/g, "_")}_Resume.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to generate resume");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Generate Professional Resume</h2>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="resume-form">
          {step === 1 && (
            <>
              <h3 className="form-step-title">Contact Information</h3>
              <div className="form-row">
                <label>
                  Full Name *
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                    placeholder="John Doe"
                  />
                </label>
                <label>
                  Email *
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="john@example.com"
                  />
                </label>
              </div>

              <div className="form-row">
                <label>
                  Phone Number
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+91 9876543210"
                  />
                </label>
                <label>
                  LinkedIn URL
                  <input
                    type="url"
                    name="linkedin"
                    value={formData.linkedin}
                    onChange={handleChange}
                    placeholder="linkedin.com/in/yourprofile"
                  />
                </label>
              </div>

              <label>
                GitHub URL
                <input
                  type="url"
                  name="github"
                  value={formData.github}
                  onChange={handleChange}
                  placeholder="github.com/yourprofile"
                />
              </label>

              <div className="form-actions">
                <button type="button" className="secondary-button" onClick={onClose}>
                  Cancel
                </button>
                <button type="button" className="primary-button" onClick={() => setStep(2)}>
                  Next: Education
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h3 className="form-step-title">Education</h3>
              <label>
                College/University Name *
                <input
                  type="text"
                  name="college"
                  value={formData.college}
                  onChange={handleChange}
                  required
                  placeholder="University Name"
                />
              </label>

              <label>
                Branch/Degree *
                <input
                  type="text"
                  name="branch"
                  value={formData.branch}
                  onChange={handleChange}
                  required
                  placeholder="e.g. B.Tech Computer Science"
                />
              </label>

              <div className="form-row">
                <label>
                  CGPA (0-10) *
                  <input
                    type="number"
                    name="cgpa"
                    min="0"
                    max="10"
                    step="0.01"
                    value={formData.cgpa}
                    onChange={handleChange}
                    required
                    placeholder="8.5"
                  />
                </label>
                <label>
                  Graduation Year *
                  <input
                    type="number"
                    name="graduationYear"
                    min="2020"
                    max="2030"
                    value={formData.graduationYear}
                    onChange={handleChange}
                    required
                    placeholder="2024"
                  />
                </label>
              </div>

              <div className="form-actions">
                <button type="button" className="secondary-button" onClick={() => setStep(1)}>
                  Back
                </button>
                <button type="button" className="primary-button" onClick={() => setStep(3)}>
                  Next: Experience
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h3 className="form-step-title">Experience & Projects</h3>
              <label>
                Work Experience
                <textarea
                  name="experience"
                  value={formData.experience}
                  onChange={handleChange}
                  placeholder={`Role Title | Company Name | Start Date – End Date\n• Achievement-oriented bullet point\n• Key responsibility or project outcome\n\nRole Title | Company Name | Start Date – End Date\n• Achievement-oriented bullet point`}
                  rows={6}
                />
              </label>

              <label>
                Projects (with technologies and impact)
                <textarea
                  name="projects"
                  value={formData.projects}
                  onChange={handleChange}
                  placeholder={`Project Name | Technologies Used\n• Key feature or implementation\n• Quantified impact or achievement\n\nProject Name | Technologies Used\n• Key feature or implementation`}
                  rows={6}
                />
              </label>

              <div className="form-actions">
                <button type="button" className="secondary-button" onClick={() => setStep(2)}>
                  Back
                </button>
                <button type="button" className="primary-button" onClick={() => setStep(4)}>
                  Next: Skills
                </button>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <h3 className="form-step-title">Skills & Certifications</h3>
              <label>
                Technical Skills (categorized)
                <textarea
                  name="skills"
                  value={formData.skills}
                  onChange={handleChange}
                  placeholder={`Languages: Python, Java, JavaScript\nFrameworks: React, Node.js, Django\nDatabases: MySQL, MongoDB\nTools: Git, Docker, AWS\nConcepts: OOPS, Data Structures, System Design`}
                  rows={6}
                />
              </label>

              <label>
                Certifications (optional)
                <textarea
                  name="certifications"
                  value={formData.certifications}
                  onChange={handleChange}
                  placeholder={`AWS Certified Cloud Practitioner\nGoogle Cloud Associate Cloud Engineer\nHackerRank Problem Solving (5 stars)`}
                  rows={3}
                />
              </label>

              <div className="form-actions">
                <button type="button" className="secondary-button" onClick={() => setStep(3)}>
                  Back
                </button>
                <button type="button" className="primary-button" onClick={() => setStep(5)}>
                  Next: Leadership
                </button>
              </div>
            </>
          )}

          {step === 5 && (
            <>
              <h3 className="form-step-title">Leadership & Summary</h3>
              <label>
                Leadership & Volunteering (optional)
                <textarea
                  name="leadership"
                  value={formData.leadership}
                  onChange={handleChange}
                  placeholder={`Position/Role | Organization | Duration\n• Responsibility and impact\n• Key achievement\n\nPosition/Role | Organization | Duration\n• Responsibility and impact`}
                  rows={6}
                />
              </label>

              {error && <p className="error-text">{error}</p>}

              <div className="form-actions">
                <button type="button" className="secondary-button" onClick={() => setStep(4)}>
                  Back
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={loading}
                >
                  <Download size={18} />
                  {loading ? "Generating..." : "Generate & Download Resume"}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
