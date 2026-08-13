import React, { useMemo, useState } from "react";
import { Building2, Search, X } from "lucide-react";
import { api } from "../api";

const categories = ["All", "Service-based", "Product-based", "Core", "Startup"];

function initialForm() {
  return {
    cgpa: "",
    branch: "CSE",
    backlogs: "0",
    skills: "",
    preferredCompanyType: ""
  };
}

function summaryText(result) {
  if (!result) return "";
  const parts = Object.entries(result.summary.byCategory)
    .filter(([, count]) => count > 0)
    .map(([category, count]) => `${count} ${category}`);
  return `You are eligible for ${result.summary.totalEligible} companies${parts.length ? `: ${parts.join(", ")}` : ""}.`;
}

export default function EligibilityChecker({ onClose }) {
  const [form, setForm] = useState(initialForm());
  const [result, setResult] = useState(null);
  const [filter, setFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("Eligible");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const visibleCompanies = useMemo(() => {
    if (!result) return [];
    return result.companies
      .filter((company) => filter === "All" || company.category === filter)
      .filter((company) => statusFilter === "All" || (statusFilter === "Eligible" ? company.eligible : !company.eligible))
      .sort((a, b) => Number(b.eligible) - Number(a.eligible) || a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  }, [result, filter, statusFilter]);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await api.checkCompanyEligibility({
        cgpa: Number(form.cgpa),
        branch: form.branch,
        backlogs: Number(form.backlogs),
        skills: form.skills,
        preferredCompanyType: form.preferredCompanyType
      });
      setResult(response);
      setFilter(form.preferredCompanyType || "All");
      setStatusFilter("Eligible");
    } catch (err) {
      setError(err.message || "Unable to check company eligibility.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay eligibility-shell">
      <div className="modal-content eligibility-modal">
        <div className="modal-header">
          <div>
            <h2>Company Eligibility Checker</h2>
            <p className="eligibility-note">Uses sample/demo eligibility criteria. Verify official campus notices before applying.</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close eligibility checker">
            <X size={20} />
          </button>
        </div>

        <form className="eligibility-form" onSubmit={submit}>
          <label>
            CGPA
            <input type="number" min="0" max="10" step="0.01" value={form.cgpa} onChange={(event) => setForm({ ...form, cgpa: event.target.value })} required />
          </label>
          <label>
            Branch/Department
            <select value={form.branch} onChange={(event) => setForm({ ...form, branch: event.target.value })}>
              {["CSE", "ISE", "IT", "ECE", "EEE", "ME", "Civil"].map((branch) => <option key={branch}>{branch}</option>)}
            </select>
          </label>
          <label>
            Backlogs
            <input type="number" min="0" step="1" value={form.backlogs} onChange={(event) => setForm({ ...form, backlogs: event.target.value })} required />
          </label>
          <label>
            Preferred company type
            <select value={form.preferredCompanyType} onChange={(event) => setForm({ ...form, preferredCompanyType: event.target.value })}>
              <option value="">All categories</option>
              {categories.slice(1).map((category) => <option key={category}>{category}</option>)}
            </select>
          </label>
          <label className="eligibility-skills">
            Technical/Programming skills
            <textarea value={form.skills} onChange={(event) => setForm({ ...form, skills: event.target.value })} placeholder="Example: Java, Python, SQL, DSA, React" required />
          </label>
          <button className="primary-button" type="submit" disabled={loading}>
            <Search size={16} />
            {loading ? "Checking..." : "Check Eligibility"}
          </button>
        </form>

        {error && <p className="error-text eligibility-error">{error}</p>}

        {result && (
          <section className="eligibility-results">
            <div className="eligibility-summary">
              <strong>{summaryText(result)}</strong>
              <span>{result.datasetNote}</span>
            </div>

            <div className="eligibility-filter-row" aria-label="Filter companies">
              {categories.map((category) => (
                <button type="button" key={category} className={filter === category ? "active" : ""} onClick={() => setFilter(category)}>
                  {category}
                </button>
              ))}
              {["Eligible", "Not eligible", "All"].map((status) => (
                <button type="button" key={status} className={statusFilter === status ? "active" : ""} onClick={() => setStatusFilter(status)}>
                  {status}
                </button>
              ))}
            </div>

            <div className="eligibility-card-grid">
              {visibleCompanies.length ? visibleCompanies.map((company) => (
                <article key={company.id} className={`eligibility-card ${company.eligible ? "eligible" : "not-eligible"}`}>
                  <header>
                    <div>
                      <h3>{company.name}</h3>
                      <span>{company.category} - {company.role}</span>
                    </div>
                    <strong>{company.eligible ? "Eligible" : "Not eligible"}</strong>
                  </header>
                  <dl>
                    <div><dt>Min CGPA</dt><dd>{company.minCgpa}</dd></div>
                    <div><dt>Branches</dt><dd>{company.eligibleBranches.join(", ")}</dd></div>
                    <div><dt>Backlogs</dt><dd>Max {company.maxBacklogs}</dd></div>
                    <div><dt>Matching skills</dt><dd>{company.matchingSkills.length ? company.matchingSkills.join(", ") : "None yet"}</dd></div>
                  </dl>
                  {company.eligible ? (
                    <p className="eligibility-ok"><Building2 size={15} /> You meet the sample criteria.</p>
                  ) : (
                    <ul>
                      {company.reasons.map((reason) => <li key={reason}>{reason}</li>)}
                    </ul>
                  )}
                  <small>{company.notes}</small>
                </article>
              )) : (
                <p className="mock-muted">No companies match the current filters.</p>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
