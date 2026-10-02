import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import "./AdminPortal.css";

const API = import.meta.env.VITE_API_URL;

async function request(path, token, options = {}) {
    const response = await fetch(`${API}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            ...(options.headers || {})
        }
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(body.message || "Request failed");
    }

    return body;
}

const date = (value) =>
    value
        ? new Date(value).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric"
          })
        : "Not specified";

const money = (value) =>
    value === null || value === undefined || value === ""
        ? "Not specified"
        : `₹${Number(value).toLocaleString("en-IN")}`;

const errorText = (error) =>
    error?.message || "Something went wrong. Please try again.";

function State({ loading, error, empty, children }) {
    if (loading) {
        return (
            <div className="admin-state">
                <span className="admin-spinner" />
                Loading...
            </div>
        );
    }

    if (error) {
        return (
            <div className="admin-state error">
                <strong>Could not load this page</strong>
                <span>{errorText(error)}</span>
            </div>
        );
    }

    if (empty) {
        return (
            <div className="admin-state">
                <strong>Nothing here yet</strong>
                <span>{empty}</span>
            </div>
        );
    }

    return children;
}

function Notice({ children, error = false }) {
    return children ? (
        <div className={`admin-notice${error ? " error" : ""}`}>
            {children}
        </div>
    ) : null;
}

function Shell({ title, children }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const links = [
        ["/admin/dashboard", "Dashboard"],
        ["/admin/users", "Users"],
        ["/admin/gigs", "Gigs"],
        ["/admin/verifications", "Verifications"],
        ["/admin/reports", "Reports"],
        ["/admin/catalog", "Categories & Skills"],
        ["/admin/profile", "Profile"]
    ];

    return (
        <div className="admin-portal">
            <header className="admin-header">

                <Link className="admin-logo" to="/admin/dashboard">
                    <span className="logo-mark">V</span>

                    <span>
                        Verified<span>Gigs</span>
                    </span>
                </Link>

                <nav>
                    {links.map(([to, label]) => (
                        <Link
                            key={to}
                            className={location.pathname === to ? "active" : ""}
                            to={to}
                        >
                            {label}
                        </Link>
                    ))}
                </nav>

                <div className="admin-user">
                    <span>
                        {user?.name || user?.email || "Administrator"}
                    </span>

                    <button
                        onClick={() => {
                            logout();
                            navigate("/");
                        }}
                    >
                        Log out
                    </button>
                </div>

            </header>

            <main className="admin-main">
                <div className="admin-heading">
                    <div>
                        <p className="eyebrow">
                            <span className="eyebrow-dot" />
                            Platform Administration
                        </p>

                        <h1>{title}</h1>
                    </div>
                </div>

                {children}
            </main>
        </div>
    );
}


/* =========================================================
   ADMIN DASHBOARD
========================================================= */

export function AdminDashboardLive() {
    const { token } = useAuth();

    const [stats, setStats] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        request("/admin/dashboard/stats", token)
            .then((body) => {
                setStats(
                    body.stats || {
                        totalStudents: 0,
                        totalClients: 0,
                        openGigs: 0,
                        activeProjects: 0,
                        pendingVerifications: 0,
                        openReports: 0
                    }
                );
            })
            .catch(setError);
    }, [token]);

    return (
        <Shell title="Admin dashboard">
            <State loading={!stats && !error} error={error}>
                <div className="admin-stats">

                    {[
                        ["totalStudents", "Total students"],
                        ["totalClients", "Total clients"],
                        ["openGigs", "Open gigs"],
                        ["activeProjects", "Active projects"],
                        ["pendingVerifications", "Pending verifications"],
                        ["openReports", "Open reports"]
                    ].map(([key, label]) => (
                        <div key={key}>
                            <strong>{stats?.[key] ?? 0}</strong>
                            <span>{label}</span>
                            <small>Live database count</small>
                        </div>
                    ))}

                </div>

                <div className="admin-grid">

                    <Link
                        className="admin-card shortcut"
                        to="/admin/users"
                    >
                        <h2>User management</h2>
                        <p>
                            Search users and update account status.
                        </p>
                    </Link>

                    <Link
                        className="admin-card shortcut"
                        to="/admin/projects"
                    >
                        <h2>Project monitoring</h2>
                        <p>
                            Review platform projects and participants.
                        </p>
                    </Link>

                    <Link
                        className="admin-card shortcut"
                        to="/admin/payments"
                    >
                        <h2>Payment monitoring</h2>
                        <p>
                            View platform payment records.
                        </p>
                    </Link>

                </div>
            </State>
        </Shell>
    );
}


/* =========================================================
   ADMIN USERS
========================================================= */

export function AdminUsersLive() {
    const { token } = useAuth();

    const [users, setUsers] = useState([]);
    const [query, setQuery] = useState("");
    const [role, setRole] = useState("ALL");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const load = () => {
        setLoading(true);
        setError(null);

        request(
            role === "ALL"
                ? "/admin/users"
                : `/admin/users?role=${role}`,
            token
        )
            .then((body) => {
                setUsers(body.users || []);
            })
            .catch(setError)
            .finally(() => setLoading(false));
    };

    useEffect(load, [token, role]);

    const visible = users.filter((user) =>
        `${user.name} ${user.email} ${user.role} ${user.account_status}`
            .toLowerCase()
            .includes(query.toLowerCase())
    );

    const update = async (id, status) => {
        try {
            setError(null);

            await request(
                `/admin/users/${id}/status`,
                token,
                {
                    method: "PUT",
                    body: JSON.stringify({ status })
                }
            );

            load();
        } catch (err) {
            setError(err);
        }
    };

    return (
        <Shell title="Users">

            <div className="admin-toolbar">

                <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search users"
                />

                <select
                    value={role}
                    onChange={(event) => setRole(event.target.value)}
                >
                    <option>ALL</option>
                    <option>STUDENT</option>
                    <option>CLIENT</option>
                </select>

            </div>

            <State
                loading={loading}
                error={error}
                empty={
                    visible.length === 0
                        ? "No users match this filter."
                        : null
                }
            >

                <div className="stack">

                    {visible.map((user) => (
                        <article
                            className="admin-card report-row"
                            key={user.user_id}
                        >

                            <div>

                                <div className="admin-kicker">
                                    {user.role}
                                    <span>{user.account_status}</span>
                                </div>

                                <h2>{user.name}</h2>

                                <p>
                                    {user.email} · Joined{" "}
                                    {date(user.created_at)}
                                </p>

                                <small>
                                    {user.company_name ||
                                        user.college_name ||
                                        "No profile detail"}
                                </small>

                            </div>

                            <div className="admin-actions">

                                <select
                                    value={user.account_status}
                                    disabled={user.role === "ADMIN"}
                                    onChange={(event) =>
                                        update(
                                            user.user_id,
                                            event.target.value
                                        )
                                    }
                                >
                                    <option>ACTIVE</option>
                                    <option>INACTIVE</option>
                                    <option>SUSPENDED</option>
                                </select>

                            </div>

                        </article>
                    ))}

                </div>

            </State>

        </Shell>
    );
}


/* =========================================================
   ADMIN PROJECTS
========================================================= */

export function AdminProjectsLive() {
    const { token } = useAuth();

    const [items, setItems] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        request("/admin/projects", token)
            .then((body) => setItems(body.projects || []))
            .catch(setError);
    }, [token]);

    return (
        <Shell title="Project monitoring">

            <State
                loading={!items.length && !error}
                error={error}
                empty={!items.length ? "No projects found." : null}
            >

                <div className="admin-grid">

                    {items.map((item) => (
                        <article
                            className="admin-card"
                            key={item.project_id}
                        >

                            <div className="admin-kicker">
                                {item.project_status}
                                <span>{item.project_id}</span>
                            </div>

                            <h2>{item.project_title}</h2>

                            <p>
                                Client: {item.client_name} · Student:{" "}
                                {item.student_name}
                            </p>

                            <div className="admin-meta">
                                <span>
                                    {date(item.start_date)} -{" "}
                                    {date(item.expected_end_date)}
                                </span>

                                <strong>
                                    {money(item.agreed_amount)}
                                </strong>
                            </div>

                        </article>
                    ))}

                </div>

            </State>

        </Shell>
    );
}


/* =========================================================
   ADMIN PAYMENTS
========================================================= */

export function AdminPaymentsLive() {
    const { token } = useAuth();

    const [items, setItems] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        request("/admin/payments", token)
            .then((body) => setItems(body.payments || []))
            .catch(setError);
    }, [token]);

    return (
        <Shell title="Payment monitoring">

            <State
                loading={!items.length && !error}
                error={error}
                empty={!items.length ? "No payments found." : null}
            >

                <div className="stack">

                    {items.map((item) => (
                        <article
                            className="admin-card report-row"
                            key={item.payment_id}
                        >

                            <div>

                                <div className="admin-kicker">
                                    {item.payment_status}
                                    <span>
                                        {date(item.payment_date)}
                                    </span>
                                </div>

                                <h2>{money(item.amount)}</h2>

                                <p>
                                    {item.project_title} · Client{" "}
                                    {item.client_name} · Student{" "}
                                    {item.student_name}
                                </p>

                            </div>

                            <small>
                                {item.payment_method ||
                                    "No payment method"}
                            </small>

                        </article>
                    ))}

                </div>

            </State>

        </Shell>
    );
}


/* =========================================================
   ADMIN PROFILE
========================================================= */

export function AdminProfileLive() {
    const { token } = useAuth();

    const [form, setForm] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [notice, setNotice] = useState("");

    useEffect(() => {
        request("/admin/profile", token)
            .then((body) => setForm(body.profile))
            .catch(setError)
            .finally(() => setLoading(false));
    }, [token]);

    const save = async (event) => {
        event.preventDefault();

        try {
            setError(null);

            await request("/admin/profile", token, {
                method: "PUT",
                body: JSON.stringify({
                    name: form.name,
                    phone: form.phone,
                    profilePicture: form.profile_picture
                })
            });

            setNotice("Profile updated successfully.");
        } catch (err) {
            setError(err);
        }
    };

    return (
        <Shell title="Admin profile">

            <State
                loading={loading}
                error={error}
            >

                <div className="admin-card form-card">

                    {notice && <Notice>{notice}</Notice>}

                    <form onSubmit={save}>

                        <label>
                            Name
                            <input
                                required
                                value={form.name || ""}
                                onChange={(event) =>
                                    setForm({
                                        ...form,
                                        name: event.target.value
                                    })
                                }
                            />
                        </label>

                        <label>
                            Email
                            <input
                                disabled
                                value={form.email || ""}
                            />
                        </label>

                        <label>
                            Phone
                            <input
                                value={form.phone || ""}
                                onChange={(event) =>
                                    setForm({
                                        ...form,
                                        phone: event.target.value
                                    })
                                }
                            />
                        </label>

                        <button className="admin-button">
                            Save profile
                        </button>

                    </form>

                </div>

            </State>

        </Shell>
    );
}


/* =========================================================
   ADMIN GIGS
========================================================= */

export function AdminGigs() {
    const { token } = useAuth();

    const [gigs, setGigs] = useState([]);
    const [query, setQuery] = useState("");
    const [status, setStatus] = useState("ALL");

    const [loading, setLoading] = useState(true);

    // Error while loading the page
    const [error, setError] = useState(null);

    // Error while performing an action such as DELETE
    const [actionError, setActionError] = useState("");

    const [notice, setNotice] = useState("");

    const load = () => {
        setLoading(true);
        setError(null);

        request("/admin/gigs", token)
            .then((body) => {
                setGigs(body.gigs || []);
            })
            .catch(setError)
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        load();
    }, [token]);

    const remove = async (gigId) => {
        if (!window.confirm("Delete this gig? This cannot be undone.")) {
            return;
        }

        // Clear old messages before attempting deletion
        setActionError("");
        setNotice("");

        try {
            await request(
                `/admin/gigs/${gigId}`,
                token,
                {
                    method: "DELETE"
                }
            );

            // Successful deletion
            setNotice("Gig deleted successfully.");

            // Reload the gig list
            load();

        } catch (err) {

            console.error("Delete gig error:", err);

            /*
             * IMPORTANT:
             * Do NOT call setError(err) here.
             *
             * setError is used by State for page-loading errors.
             * If we use it here, the entire page shows
             * "Could not load this page".
             *
             * actionError is only for the delete operation.
             */
            setActionError(errorText(err));
        }
    };

    const visible = gigs.filter(
        (gig) =>
            (status === "ALL" || gig.status === status) &&
            `${gig.title} ${gig.description} ${gig.company_name} ${gig.category_name}`
                .toLowerCase()
                .includes(query.toLowerCase())
    );

    return (
        <Shell title="Gigs">

            <div className="admin-toolbar">

                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search all gigs"
                />

                <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                >
                    <option value="ALL">All statuses</option>
                    <option>OPEN</option>
                    <option>IN_PROGRESS</option>
                    <option>COMPLETED</option>
                    <option>CANCELLED</option>
                    <option>CLOSED</option>
                </select>

                <span>
                    {visible.length} gig
                    {visible.length === 1 ? "" : "s"}
                </span>

            </div>

            {notice && (
                <Notice>
                    {notice}
                </Notice>
            )}

            {actionError && (
                <Notice error>
                    {actionError}
                </Notice>
            )}

            <State
                loading={loading}
                error={error}
                empty={
                    visible.length === 0
                        ? "No gigs match this filter."
                        : null
                }
            >

                <div className="admin-grid">

                    {visible.map((gig) => (
                        <article
                            className="admin-card"
                            key={gig.gig_id}
                        >

                            <div className="admin-kicker">
                                {gig.status}
                                <span>{gig.category_name}</span>
                            </div>

                            <h2>{gig.title}</h2>

                            <p>{gig.description}</p>

                            <div className="admin-meta">

                                <span>
                                    {gig.company_name}
                                </span>

                                <strong>
                                    {money(gig.budget_min)} -{" "}
                                    {money(gig.budget_max)}
                                </strong>

                            </div>

                            <small>
                                Deadline {date(gig.deadline)}
                            </small>

                            <div className="admin-actions">

                                <button
                                    className="admin-button danger"
                                    onClick={() =>
                                        remove(gig.gig_id)
                                    }
                                >
                                    Delete
                                </button>

                            </div>

                        </article>
                    ))}

                </div>

            </State>

        </Shell>
    );
}


/* =========================================================
   ADMIN VERIFICATIONS
========================================================= */

export function AdminVerifications() {
    const { token } = useAuth();

    const [documents, setDocuments] = useState([]);
    const [filter, setFilter] = useState("PENDING");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [notice, setNotice] = useState("");

    const load = () => {
        setLoading(true);
        setError(null);

        request("/verification-documents", token)
            .then((body) => {
                setDocuments(body.documents || []);
            })
            .catch(setError)
            .finally(() => setLoading(false));
    };

    useEffect(load, [token]);

    const update = async (id, status) => {
        try {
            setError(null);

            const path =
                status === "VERIFIED"
                    ? `/verification-documents/${id}/approve`
                    : `/verification-documents/${id}/reject`;

            const body =
                status === "VERIFIED"
                    ? {}
                    : {
                          rejectionReason:
                              window.prompt(
                                  "Enter rejection reason"
                              ) || "No reason provided"
                      };

            await request(path, token, {
                method: "PUT",
                body: JSON.stringify(body)
            });

            setNotice(`Document ${status.toLowerCase()}.`);

            load();

        } catch (err) {
            setError(err);
        }
    };

    const visible = documents.filter(
        (item) =>
            filter === "ALL" ||
            item.verification_status === filter
    );

    return (
        <Shell title="Verification queue">

            <div className="tabs">

                {["PENDING", "VERIFIED", "REJECTED", "ALL"].map(
                    (item) => (
                        <button
                            className={
                                filter === item
                                    ? "active"
                                    : ""
                            }
                            key={item}
                            onClick={() => setFilter(item)}
                        >
                            {item[0] +
                                item
                                    .slice(1)
                                    .toLowerCase()}
                        </button>
                    )
                )}

            </div>

            {notice && <Notice>{notice}</Notice>}

            <State
                loading={loading}
                error={error}
                empty={
                    visible.length === 0
                        ? "No verification documents match this filter."
                        : null
                }
            >

                <div className="stack">

                    {visible.map((item) => (
                        <article
                            className="admin-card document-row"
                            key={item.document_id}
                        >

                            <div>

                                <div className="admin-kicker">
                                    {item.verification_status}
                                    <span>
                                        {date(item.uploaded_at)}
                                    </span>
                                </div>

                                <h2>{item.document_type}</h2>

                                <p>
                                    Student ID: {item.student_id}
                                </p>

                                <a
                                    href={item.document_url}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    Open document
                                </a>

                            </div>

                            <div className="admin-actions">

                                {item.verification_status ===
                                    "PENDING" && (
                                    <>
                                        <button
                                            className="admin-button"
                                            onClick={() =>
                                                update(
                                                    item.document_id,
                                                    "VERIFIED"
                                                )
                                            }
                                        >
                                            Approve
                                        </button>

                                        <button
                                            className="admin-button danger"
                                            onClick={() =>
                                                update(
                                                    item.document_id,
                                                    "REJECTED"
                                                )
                                            }
                                        >
                                            Reject
                                        </button>
                                    </>
                                )}

                            </div>

                        </article>
                    ))}

                </div>

            </State>

        </Shell>
    );
}


/* =========================================================
   ADMIN REPORTS
========================================================= */

export function AdminReports() {
    const { token } = useAuth();

    const [reports, setReports] = useState([]);
    const [filter, setFilter] = useState("ALL");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [notice, setNotice] = useState("");

    const load = () => {
        setLoading(true);
        setError(null);

        request("/reports", token)
            .then((body) => {
                setReports(body.reports || []);
            })
            .catch(setError)
            .finally(() => setLoading(false));
    };

    useEffect(load, [token]);

    const update = async (id, status) => {
        try {
            setError(null);

            await request(
                `/reports/${id}/status`,
                token,
                {
                    method: "PUT",
                    body: JSON.stringify({ status })
                }
            );

            setNotice(
                `Report marked ${status
                    .toLowerCase()
                    .replace("_", " ")}.`
            );

            load();

        } catch (err) {
            setError(err);
        }
    };

    const visible =
        filter === "ALL"
            ? reports
            : reports.filter(
                  (item) =>
                      item.report_status === filter
              );

    return (
        <Shell title="Reports">

            <div className="tabs">

                {[
                    "ALL",
                    "PENDING",
                    "UNDER_REVIEW",
                    "RESOLVED",
                    "REJECTED"
                ].map((item) => (
                    <button
                        className={
                            filter === item
                                ? "active"
                                : ""
                        }
                        key={item}
                        onClick={() => setFilter(item)}
                    >
                        {item === "ALL"
                            ? "All"
                            : item.replace("_", " ")}
                    </button>
                ))}

            </div>

            {notice && <Notice>{notice}</Notice>}

            <State
                loading={loading}
                error={error}
                empty={
                    visible.length === 0
                        ? "No reports match this filter."
                        : null
                }
            >

                <div className="stack">

                    {visible.map((item) => (
                        <article
                            className="admin-card report-row"
                            key={item.report_id}
                        >

                            <div>

                                <div className="admin-kicker">
                                    {item.report_status}
                                    <span>
                                        {date(item.reported_at)}
                                    </span>
                                </div>

                                <h2>{item.reason}</h2>

                                <p>
                                    {item.description ||
                                        "No additional description."}
                                </p>

                                <small>
                                    Reporter:{" "}
                                    {item.reporter_name ||
                                        item.reporter_id}{" "}
                                    · Target:{" "}
                                    {item.reported_user_name ||
                                        item.reported_user_id ||
                                        `Gig ${
                                            item.gig_id ||
                                            "not specified"
                                        }`}
                                </small>

                            </div>

                            <div className="admin-actions">

                                <select
                                    value={item.report_status}
                                    onChange={(e) =>
                                        update(
                                            item.report_id,
                                            e.target.value
                                        )
                                    }
                                >
                                    <option>PENDING</option>
                                    <option>
                                        UNDER_REVIEW
                                    </option>
                                    <option>RESOLVED</option>
                                    <option>REJECTED</option>
                                </select>

                            </div>

                        </article>
                    ))}

                </div>

            </State>

        </Shell>
    );
}


/* =========================================================
   ADMIN CATALOG
========================================================= */

export function AdminCatalog() {
    const { token } = useAuth();

    const [categories, setCategories] = useState([]);
    const [skills, setSkills] = useState([]);

    const [form, setForm] = useState({
        categoryName: "",
        categoryDescription: "",
        skillName: "",
        skillCategory: "",
        skillDescription: ""
    });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [notice, setNotice] = useState("");

    const load = () => {
        setLoading(true);
        setError(null);

        Promise.all([
            request("/categories", token),
            request("/skills", token)
        ])
            .then(([categoryBody, skillBody]) => {
                setCategories(
                    categoryBody.categories || []
                );

                setSkills(skillBody.skills || []);
            })
            .catch(setError)
            .finally(() => setLoading(false));
    };

    useEffect(load, [token]);

    const create = async (type, event) => {
        event.preventDefault();

        try {
            setError(null);

            if (type === "category") {
                await request("/categories", token, {
                    method: "POST",
                    body: JSON.stringify({
                        categoryName:
                            form.categoryName,
                        description:
                            form.categoryDescription
                    })
                });
            } else {
                await request("/skills", token, {
                    method: "POST",
                    body: JSON.stringify({
                        skillName:
                            form.skillName,
                        category:
                            form.skillCategory,
                        description:
                            form.skillDescription
                    })
                });
            }

            setNotice(
                `${type[0].toUpperCase() +
                    type.slice(1)} created successfully.`
            );

            load();

        } catch (err) {
            setError(err);
        }
    };

    return (
        <Shell title="Categories and skills">

            <State loading={loading} error={error}>

                {notice && <Notice>{notice}</Notice>}

                {error && (
                    <Notice error>
                        {errorText(error)}
                    </Notice>
                )}

                <div className="catalog-grid">

                    <section className="admin-card">

                        <h2>Categories</h2>

                        <div className="catalog-list">

                            {categories.length ? (
                                categories.map((item) => (
                                    <div
                                        key={item.category_id}
                                    >
                                        <strong>
                                            {
                                                item.category_name
                                            }
                                        </strong>

                                        <small>
                                            {item.description ||
                                                "No description"}
                                        </small>
                                    </div>
                                ))
                            ) : (
                                <p className="muted">
                                    No categories found.
                                </p>
                            )}

                        </div>

                        <form
                            onSubmit={(e) =>
                                create(
                                    "category",
                                    e
                                )
                            }
                        >

                            <label>
                                Name

                                <input
                                    required
                                    value={
                                        form.categoryName
                                    }
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            categoryName:
                                                e.target.value
                                        })
                                    }
                                />
                            </label>

                            <label>
                                Description

                                <textarea
                                    value={
                                        form.categoryDescription
                                    }
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            categoryDescription:
                                                e.target.value
                                        })
                                    }
                                />
                            </label>

                            <button className="admin-button">
                                Add category
                            </button>

                        </form>

                    </section>


                    <section className="admin-card">

                        <h2>Skills</h2>

                        <div className="catalog-list">

                            {skills.length ? (
                                skills.map((item) => (
                                    <div
                                        key={item.skill_id}
                                    >
                                        <strong>
                                            {item.skill_name}
                                        </strong>

                                        <small>
                                            {item.category ||
                                                "Uncategorized"}
                                        </small>
                                    </div>
                                ))
                            ) : (
                                <p className="muted">
                                    No skills found.
                                </p>
                            )}

                        </div>

                        <form
                            onSubmit={(e) =>
                                create(
                                    "skill",
                                    e
                                )
                            }
                        >

                            <label>
                                Name

                                <input
                                    required
                                    value={
                                        form.skillName
                                    }
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            skillName:
                                                e.target.value
                                        })
                                    }
                                />
                            </label>

                            <label>
                                Category

                                <input
                                    value={
                                        form.skillCategory
                                    }
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            skillCategory:
                                                e.target.value
                                        })
                                    }
                                />
                            </label>

                            <label>
                                Description

                                <textarea
                                    value={
                                        form.skillDescription
                                    }
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            skillDescription:
                                                e.target.value
                                        })
                                    }
                                />
                            </label>

                            <button className="admin-button">
                                Add skill
                            </button>

                        </form>

                    </section>

                </div>

                <Notice>
                    Existing APIs support listing and creation only.
                    Edit and delete APIs are unavailable.
                </Notice>

            </State>

        </Shell>
    );
}
