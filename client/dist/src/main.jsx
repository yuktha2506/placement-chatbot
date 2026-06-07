import React, { Component, StrictMode } from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error(error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <main className="auth-shell">
          <section className="auth-panel" aria-labelledby="app-error-title">
            <div className="brand-mark">!</div>
            <h1 id="app-error-title">The app could not load</h1>
            <p>{this.state.error.message || "An unexpected browser error occurred."}</p>
            <button className="primary-button" onClick={() => {
              localStorage.removeItem("placement_token");
              localStorage.removeItem("placement_user");
              window.location.reload();
            }}>
              Reset and Reload
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
