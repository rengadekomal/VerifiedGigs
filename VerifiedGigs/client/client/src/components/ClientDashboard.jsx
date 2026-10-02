import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import "./StudentDashboard.css";

const API = import.meta.env.VITE_API_URL?.replace(/\/$/, "");

const fetchJSON = async (path, token) => {
  const response = await fetch(`${API}${path}`, {
    method: "GET",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "Cache-Control": "no-cache",
    },
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      body.message || `Request failed: ${response.status}`
    );
  }

  return body;
};

const formatDate = (value) => {
  if (!value) return "Not specified";

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "Not specified";
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatMoney = (value) => {
  if (value === null || value === undefined || value === "") {
    return "Not specified";
  }

  return `₹${Number(value).toLocaleString("en-IN")}`;
};

export default function ClientDashboard() {
  const navigate = useNavigate();
  const { user, logout, token } = useAuth();

  const [stats, setStats] = useState({
    totalGigs: 0,
    applications: 0,
    activeProjects: 0,
    completedProjects: 0,
  });

  const [gigs, setGigs] = useState([]);
  const [applications, setApplications] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token || !API) {
      setError(
        new Error("API URL or authentication token is missing.")
      );
      setLoading(false);
      return;
    }

    let cancelled = false;
    let loadingRequest = false;

    const loadDashboard = async (showLoader = false) => {
      if (loadingRequest) return;

      loadingRequest = true;

      if (showLoader) {
        setLoading(true);
      }

      try {
        /*
         * Fetch all three endpoints.
         *
         * /client/gigs
         * /client/applications
         * /client/dashboard/stats
         */
        const [statsBody, gigsBody, applicationsBody] =
          await Promise.all([
            fetchJSON("/client/dashboard/stats", token),
            fetchJSON("/client/gigs", token),
            fetchJSON("/client/applications", token),
          ]);

        if (cancelled) return;

        const freshGigs = Array.isArray(gigsBody.gigs)
          ? gigsBody.gigs
          : [];

        const freshApplications = Array.isArray(
          applicationsBody.applications
        )
          ? applicationsBody.applications
          : [];

        const backendStats = statsBody.stats || {};

        /*
         * IMPORTANT:
         *
         * Use the freshly fetched arrays for:
         *
         * Posted Gigs
         * Applications Received
         *
         * This prevents the dashboard from showing an old
         * value if the stats endpoint has stale data.
         */
        setStats({
          totalGigs: freshGigs.length,

          applications: freshApplications.length,

          activeProjects: Number(
            backendStats.activeProjects ?? 0
          ),

          completedProjects: Number(
            backendStats.completedProjects ?? 0
          ),
        });

        setGigs(freshGigs);
        setApplications(freshApplications);

        setError(null);

        console.log("CLIENT DASHBOARD UPDATED", {
          api: API,
          gigs: freshGigs.length,
          applications: freshApplications.length,
          backendStats,
          time: new Date().toISOString(),
        });
      } catch (err) {
        console.error("Client dashboard error:", err);

        if (!cancelled) {
          setError(err);
        }
      } finally {
        loadingRequest = false;

        if (!cancelled && showLoader) {
          setLoading(false);
        }
      }
    };

    /*
     * Initial load
     */
    loadDashboard(true);

    /*
     * Refresh every 5 seconds.
     *
     * This means if another page creates a gig,
     * the dashboard should update automatically.
     */
    const refreshInterval = window.setInterval(() => {
      if (!document.hidden) {
        loadDashboard(false);
      }
    }, 5000);

    /*
     * Refresh immediately when user comes back
     * to the browser tab.
     */
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadDashboard(false);
      }
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      cancelled = true;

      window.clearInterval(refreshInterval);

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, [token]);

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  return (
    <div className="student-dashboard-wrapper">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="sd-header">
        <div className="sd-header-left">
          <button
            className="logo"
            onClick={() => navigate("/")}
            title="Go to home"
          >
            <span className="logo-mark">V</span>

            <span>
              Verified<span>Gigs</span>
            </span>
          </button>

          <span
            className="sd-role-pill"
            style={{
              background: "#fef3c7",
              color: "#b45309",
            }}
          >
            Client Portal
          </span>

          <nav
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              marginLeft: "12px",
            }}
          >
            <button
              className="text-btn"
              style={{
                color: "var(--blue)",
                fontWeight: 700,
              }}
              onClick={() =>
                navigate("/client/dashboard")
              }
            >
              Dashboard
            </button>

            <button
              className="text-btn"
              onClick={() =>
                navigate("/client/gigs")
              }
            >
              My Gigs
            </button>

            <button
              className="text-btn"
              onClick={() =>
                navigate("/client/applications")
              }
            >
              Applications
            </button>

            <button
              className="text-btn"
              onClick={() =>
                navigate("/client/projects")
              }
            >
              Projects
            </button>
          </nav>
        </div>

        <div className="sd-header-right">
          <div className="sd-user-chip">
            <div
              className="sd-user-avatar"
              style={{
                background:
                  "linear-gradient(135deg, #d97706, #fbbf24)",
              }}
            >
              {(user?.name || "C")
                .charAt(0)
                .toUpperCase()}
            </div>

            <div className="sd-user-info">
              <span className="sd-user-name">
                {user?.name || "Client"}
              </span>

              <span className="sd-user-sub">
                {user?.email}
              </span>
            </div>
          </div>

          <button
            className="sd-btn sd-btn-danger"
            onClick={handleLogout}
            title="Sign out"
          >
            Log out
          </button>
        </div>
      </header>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <main className="sd-main">
        {/* =================================================
            HERO
        ================================================= */}

        <section className="sd-hero-card">
          <div className="sd-hero-left">
            <p
              className="eyebrow"
              style={{ margin: "0 0 8px" }}
            >
              <span className="eyebrow-dot" />

              Client Management Portal
            </p>

            <h1>
              Welcome back,{" "}
              <span>{user?.name || "Client"}!</span>
            </h1>

            <p className="sd-hero-subtitle">
              Manage your posted gigs, review student
              applications, and collaborate with verified
              student talent.
            </p>

            <div className="sd-badge-row">
              <span className="sd-badge sd-badge-verified">
                ✓ Active Client Account
              </span>

              <span className="sd-badge sd-badge-available">
                ● Hiring Open
              </span>

              <span className="sd-badge sd-badge-neutral">
                Role: CLIENT
              </span>
            </div>
          </div>

          <div className="sd-hero-right">
            <button
              className="sd-btn sd-btn-primary"
              onClick={() =>
                navigate("/client/gigs/new")
              }
            >
              + Post a Gig
            </button>
          </div>
        </section>

        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <div className="sd-error-box">
            <h3 className="sd-error-title">
              Unable to load client data
            </h3>

            <p className="sd-error-desc">
              {error.message}
            </p>
          </div>
        )}

        {/* =================================================
            STATS
        ================================================= */}

        <div className="sd-section-title">
          <span>Hiring & Gigs Overview</span>
        </div>

        <div className="sd-stats-grid">
          {/* POSTED GIGS */}

          <div className="sd-stat-card">
            <div className="sd-stat-header">
              <span className="sd-stat-label">
                Posted Gigs
              </span>

              <span className="sd-stat-icon icon-blue">
                📋
              </span>
            </div>

            <div className="sd-stat-value">
              {loading ? "..." : stats.totalGigs}
            </div>

            <span className="sd-stat-subtext">
              Total gigs posted
            </span>
          </div>

          {/* APPLICATIONS */}

          <div className="sd-stat-card">
            <div className="sd-stat-header">
              <span className="sd-stat-label">
                Applications Received
              </span>

              <span className="sd-stat-icon icon-amber">
                📬
              </span>
            </div>

            <div className="sd-stat-value">
              {loading ? "..." : stats.applications}
            </div>

            <span className="sd-stat-subtext">
              Student proposals
            </span>
          </div>

          {/* ACTIVE PROJECTS */}

          <div className="sd-stat-card">
            <div className="sd-stat-header">
              <span className="sd-stat-label">
                Hired Students
              </span>

              <span className="sd-stat-icon icon-green">
                🎓
              </span>
            </div>

            <div className="sd-stat-value">
              {loading
                ? "..."
                : stats.activeProjects}
            </div>

            <span className="sd-stat-subtext">
              Active contracts
            </span>
          </div>

          {/* COMPLETED PROJECTS */}

          <div className="sd-stat-card">
            <div className="sd-stat-header">
              <span className="sd-stat-label">
                Completed Projects
              </span>

              <span className="sd-stat-icon icon-purple">
                ✓
              </span>
            </div>

            <div className="sd-stat-value">
              {loading
                ? "..."
                : stats.completedProjects}
            </div>

            <span className="sd-stat-subtext">
              Successfully delivered
            </span>
          </div>
        </div>

        {/* =================================================
            CONTENT
        ================================================= */}

        <div className="sd-content-grid">
          {/* =================================================
              RECENT GIGS
          ================================================= */}

          <section className="sd-panel">
            <div className="sd-panel-head">
              <h2 className="sd-panel-title">
                <span>Recent Gig Postings</span>

                <span className="sd-panel-badge">
                  {gigs.length}
                </span>
              </h2>
            </div>

            {loading ? (
              <div className="sd-empty-box">
                <h3 className="sd-empty-title">
                  Loading gigs...
                </h3>
              </div>
            ) : gigs.length === 0 ? (
              <div className="sd-empty-box">
                <div className="sd-empty-icon">
                  📢
                </div>

                <h3 className="sd-empty-title">
                  No Gigs Posted
                </h3>

                <p className="sd-empty-desc">
                  You haven't posted any gigs yet.
                  Create your first gig listing to
                  receive proposals from students.
                </p>

                <button
                  className="sd-btn sd-btn-primary"
                  onClick={() =>
                    navigate("/client/gigs/new")
                  }
                >
                  Post Your First Gig
                </button>
              </div>
            ) : (
              <div className="sd-app-list">
                {gigs.slice(0, 5).map((gig) => (
                  <article
                    className="sd-app-card"
                    key={gig.gig_id}
                  >
                    <div className="sd-card-top">
                      <h3 className="sd-card-title">
                        {gig.title}
                      </h3>

                      <span className="sd-app-status status-in-progress">
                        {gig.status}
                      </span>
                    </div>

                    <p>
                      {gig.category_name ||
                        "Gig"}{" "}
                      · Deadline{" "}
                      {formatDate(gig.deadline)}
                    </p>

                    <p>
                      Budget:{" "}
                      {formatMoney(
                        gig.budget_min
                      )}{" "}
                      -{" "}
                      {formatMoney(
                        gig.budget_max
                      )}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* =================================================
              APPLICATIONS
          ================================================= */}

          <section className="sd-panel">
            <div className="sd-panel-head">
              <h2 className="sd-panel-title">
                <span>Incoming Proposals</span>

                <span className="sd-panel-badge">
                  {applications.length}
                </span>
              </h2>
            </div>

            {loading ? (
              <div className="sd-empty-box">
                <h3 className="sd-empty-title">
                  Loading applications...
                </h3>
              </div>
            ) : applications.length === 0 ? (
              <div className="sd-empty-box">
                <div className="sd-empty-icon">
                  📝
                </div>

                <h3 className="sd-empty-title">
                  No Pending Proposals
                </h3>

                <p className="sd-empty-desc">
                  When students apply to your open
                  gigs, their proposals will appear
                  here for review.
                </p>
              </div>
            ) : (
              <div className="sd-app-list">
                {applications
                  .slice(0, 5)
                  .map((application) => (
                    <article
                      className="sd-app-card"
                      key={
                        application.application_id
                      }
                    >
                      <div className="sd-card-top">
                        <h3 className="sd-card-title">
                          {application.gig_title ||
                            "Application"}
                        </h3>

                        <span className="sd-app-status status-pending">
                          {
                            application.application_status
                          }
                        </span>
                      </div>

                      <p>
                        {application.student_name ||
                          "Student"}{" "}
                        · Bid{" "}
                        {formatMoney(
                          application.proposed_price
                        )}
                      </p>
                    </article>
                  ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}