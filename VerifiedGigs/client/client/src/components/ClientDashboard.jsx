import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import "./StudentDashboard.css";

export default function ClientDashboard() {
  const navigate = useNavigate();
  const { user, logout, token } = useAuth();
  const [stats, setStats] = useState(null);
  const [gigs, setGigs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch(`${import.meta.env.VITE_API_URL}/client/dashboard/stats`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${import.meta.env.VITE_API_URL}/client/gigs`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${import.meta.env.VITE_API_URL}/client/applications`, { headers: { Authorization: `Bearer ${token}` } }),
    ]).then(async ([statsResponse, gigsResponse, applicationsResponse]) => {
      const bodies = await Promise.all([statsResponse.json(), gigsResponse.json(), applicationsResponse.json()]);
      if (!statsResponse.ok || !gigsResponse.ok || !applicationsResponse.ok) throw new Error(bodies.find((body) => body.message)?.message || "Failed to load client dashboard");
      setStats(bodies[0].stats);
      setGigs(bodies[1].gigs || []);
      setApplications(bodies[2].applications || []);
    }).catch(setError).finally(() => setLoading(false));
  }, [token]);

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  return (
    <div className="student-dashboard-wrapper">
      {/* Client Logged-in Header */}
      <header className="sd-header">
        <div className="sd-header-left">
          <button className="logo" onClick={() => navigate("/")} title="Go to home">
            <span className="logo-mark">V</span>
            <span>
              Verified<span>Gigs</span>
            </span>
          </button>
          <span
            className="sd-role-pill"
            style={{ background: "#fef3c7", color: "#b45309" }}
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
              style={{ color: "var(--blue)", fontWeight: 700 }}
              onClick={() => navigate("/client/dashboard")}
            >
              Dashboard
            </button>
            <button className="text-btn" onClick={() => navigate("/client/gigs")}>
              My Gigs
            </button>
            <button className="text-btn" onClick={() => navigate("/client/applications")}>
              Applications
            </button>
            <button className="text-btn" onClick={() => navigate("/client/projects")}>
              Projects
            </button>
          </nav>
        </div>

        <div className="sd-header-right">
          <div className="sd-user-chip">
            <div
              className="sd-user-avatar"
              style={{ background: "linear-gradient(135deg, #d97706, #fbbf24)" }}
            >
              {(user?.name || "C").charAt(0).toUpperCase()}
            </div>
            <div className="sd-user-info">
              <span className="sd-user-name">{user?.name || "Client"}</span>
              <span className="sd-user-sub">{user?.email}</span>
            </div>
          </div>

          <button className="sd-btn sd-btn-danger" onClick={handleLogout} title="Sign out">
            Log out
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="sd-main">
        {/* Hero Card */}
        <section className="sd-hero-card">
          <div className="sd-hero-left">
            <p className="eyebrow" style={{ margin: "0 0 8px" }}>
              <span className="eyebrow-dot" /> Client Management Portal
            </p>
            <h1>
              Welcome back, <span>{user?.name || "Client"}</span>!
            </h1>
            <p className="sd-hero-subtitle">
              Manage your posted gigs, review student applications, and collaborate with verified student talent.
            </p>

            <div className="sd-badge-row">
              <span className="sd-badge sd-badge-verified">✓ Active Client Account</span>
              <span className="sd-badge sd-badge-available">● Hiring Open</span>
              <span className="sd-badge sd-badge-neutral">💼 Role: CLIENT</span>
            </div>
          </div>

          <div className="sd-hero-right">
            <button className="sd-btn sd-btn-primary" onClick={() => navigate("/client/gigs/new")}>
              + Post a Gig ↗
            </button>
          </div>
        </section>

        {/* Client Stats Overview */}
        <div className="sd-section-title">
          <span>Hiring & Gigs Overview</span>
        </div>

        <div className="sd-stats-grid">
          <div className="sd-stat-card">
            <div className="sd-stat-header">
              <span className="sd-stat-label">Posted Gigs</span>
              <span className="sd-stat-icon icon-blue">📋</span>
            </div>
            <div className="sd-stat-value">{loading ? "..." : stats?.totalGigs ?? 0}</div>
            <span className="sd-stat-subtext">Active project listings</span>
          </div>

          <div className="sd-stat-card">
            <div className="sd-stat-header">
              <span className="sd-stat-label">Applications Received</span>
              <span className="sd-stat-icon icon-amber">📬</span>
            </div>
            <div className="sd-stat-value">{loading ? "..." : stats?.applications ?? 0}</div>
            <span className="sd-stat-subtext">Proposals submitted</span>
          </div>

          <div className="sd-stat-card">
            <div className="sd-stat-header">
              <span className="sd-stat-label">Hired Students</span>
              <span className="sd-stat-icon icon-green">🎓</span>
            </div>
            <div className="sd-stat-value">{loading ? "..." : stats?.activeProjects ?? 0}</div>
            <span className="sd-stat-subtext">Active contracts</span>
          </div>

          <div className="sd-stat-card">
            <div className="sd-stat-header">
              <span className="sd-stat-label">Completed Projects</span>
              <span className="sd-stat-icon icon-purple">✓</span>
            </div>
            <div className="sd-stat-value">{loading ? "..." : stats?.completedProjects ?? 0}</div>
            <span className="sd-stat-subtext">Successfully delivered</span>
          </div>
        </div>

        {/* Content Panels */}
        <div className="sd-content-grid">
          <section className="sd-panel">
            <div className="sd-panel-head">
              <h2 className="sd-panel-title">
                <span>Recent Gig Postings</span>
                <span className="sd-panel-badge">{gigs.length}</span>
              </h2>
            </div>
            {error ? <div className="sd-error-box"><h3 className="sd-error-title">Unable to load client data</h3><p className="sd-error-desc">{error.message}</p></div> : gigs.length === 0 ? <div className="sd-empty-box">
              <div className="sd-empty-icon">📢</div>
              <h3 className="sd-empty-title">No Active Gigs Posted</h3>
              <p className="sd-empty-desc">
                You haven't posted any gigs yet. Create your first gig listing to receive bids from top student talent.
              </p>
            </div> : <div className="sd-app-list">{gigs.slice(0, 5).map((gig) => <article className="sd-app-card" key={gig.gig_id}><div className="sd-card-top"><h3 className="sd-card-title">{gig.title}</h3><span className="sd-app-status status-in-progress">{gig.status}</span></div><p>{gig.category_name || "Gig"} · Deadline {gig.deadline || "Not specified"}</p></article>)}</div>}
          </section>

          <section className="sd-panel">
            <div className="sd-panel-head">
              <h2 className="sd-panel-title">
                <span>Incoming Proposals</span>
                <span className="sd-panel-badge">{applications.length}</span>
              </h2>
            </div>
            {error ? <div className="sd-error-box"><h3 className="sd-error-title">Unable to load applications</h3><p className="sd-error-desc">{error.message}</p></div> : applications.length === 0 ? <div className="sd-empty-box">
              <div className="sd-empty-icon">📝</div>
              <h3 className="sd-empty-title">No Pending Proposals</h3>
              <p className="sd-empty-desc">
                When students apply to your open gigs, their bids and cover letters will appear here for review.
              </p>
            </div> : <div className="sd-app-list">{applications.slice(0, 5).map((application) => <article className="sd-app-card" key={application.application_id}><div className="sd-card-top"><h3 className="sd-card-title">{application.gig_title}</h3><span className="sd-app-status status-pending">{application.application_status}</span></div><p>{application.student_name} · Bid ₹{application.proposed_price}</p></article>)}</div>}
          </section>
        </div>
      </main>
    </div>
  );
}
