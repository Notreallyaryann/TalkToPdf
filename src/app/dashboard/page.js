"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useRef } from "react";

export default function Dashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [documents, setDocuments] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState("");
    const [dragActive, setDragActive] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [toasts, setToasts] = useState([]);
    const fileInputRef = useRef(null);

    const addToast = useCallback((message, type = "info") => {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 4000);
    }, []);

    const fetchDocuments = useCallback(async () => {
        try {
            const res = await fetch("/api/documents");
            if (res.ok) {
                const data = await res.json();
                setDocuments(data.documents || []);
            }
        } catch (error) {
            console.error("Error fetching documents:", error);
        }
    }, []);

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/auth/signin");
        }
        if (status === "authenticated") {
            fetchDocuments();
        }
    }, [status, router, fetchDocuments]);

    const handleUpload = async (files) => {
        if (!files || files.length === 0) return;

        for (const file of files) {
            if (!file.name.endsWith(".pdf")) {
                addToast(`${file.name} is not a PDF file`, "error");
                continue;
            }

            setUploading(true);
            setUploadProgress(`Processing ${file.name}...`);

            try {
                const formData = new FormData();
                formData.append("file", file);

                const res = await fetch("/api/upload", {
                    method: "POST",
                    body: formData,
                });

                const data = await res.json();

                if (res.ok) {
                    addToast(`✅ ${file.name} uploaded (${data.chunks} chunks)`, "success");
                    fetchDocuments();
                } else {
                    addToast(`❌ ${data.error}`, "error");
                }
            } catch (error) {
                addToast(`❌ Upload failed: ${error.message}`, "error");
            }
        }

        setUploading(false);
        setUploadProgress("");
    };

    const handleDelete = async (documentId, fileName) => {
        if (!confirm(`Delete "${fileName}"? This cannot be undone.`)) return;

        try {
            const res = await fetch("/api/documents", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ documentId }),
            });

            if (res.ok) {
                addToast(`🗑️ ${fileName} deleted`, "success");
                fetchDocuments();
            } else {
                addToast("Failed to delete document", "error");
            }
        } catch (error) {
            addToast(`Delete failed: ${error.message}`, "error");
        }
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        handleUpload(e.dataTransfer.files);
    };

    if (status === "loading") {
        return (
            <div className="page-loader">
                <div className="spinner"></div>
                <span>Loading...</span>
            </div>
        );
    }

    if (!session) return null;

    return (
        <div className="app-layout">
            {/* Sidebar Overlay (mobile) */}
            <div
                className={`sidebar-overlay ${sidebarOpen ? "visible" : ""}`}
                onClick={() => setSidebarOpen(false)}
            />

            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
                <div className="sidebar-header">
                    <div className="sidebar-logo">

                        <h2>RagSphere</h2>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    <button className="nav-item active" id="nav-dashboard">
                        <span className="nav-item-icon">📊</span>
                        Dashboard
                    </button>
                </nav>

                <div className="sidebar-section-title">Your Documents</div>
                <div className="sidebar-documents">
                    {documents.length === 0 ? (
                        <p style={{ padding: "12px", fontSize: "13px", color: "var(--text-muted)" }}>
                            No documents yet. Upload a PDF to get started.
                        </p>
                    ) : (
                        documents.map((doc) => (
                            <button
                                key={doc.documentId}
                                className="doc-item"
                                onClick={() => router.push(`/chat/${doc.documentId}`)}
                                id={`doc-${doc.documentId}`}
                            >
                                <span className="doc-item-icon">📄</span>
                                <span className="doc-item-name">{doc.fileName}</span>
                                <span className="doc-item-badge">{doc.chunkCount}</span>
                            </button>
                        ))
                    )}
                </div>

                <div className="sidebar-footer">
                    <div className="user-card">
                        {session.user.image ? (
                            <img
                                src={session.user.image}
                                alt={session.user.name}
                                className="user-avatar"
                            />
                        ) : (
                            <div className="user-avatar" style={{
                                display: "flex", alignItems: "center", justifyContent: "center",
                                background: "var(--gradient-primary)", fontSize: "14px", fontWeight: 700
                            }}>
                                {session.user.name?.[0] || "U"}
                            </div>
                        )}
                        <div className="user-info">
                            <div className="user-name">{session.user.name}</div>
                            <div className="user-email">{session.user.email}</div>
                        </div>
                        <button
                            className="btn btn-ghost"
                            onClick={() => signOut({ callbackUrl: "/auth/signin" })}
                            title="Sign out"
                            id="signout-btn"
                            style={{ fontSize: "16px", padding: "6px" }}
                        >
                            🚪
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="main-content">
                {/* Top Bar */}
                <header className="topbar">
                    <div className="topbar-title">
                        <button
                            className="btn btn-ghost mobile-menu-btn"
                            onClick={() => setSidebarOpen(true)}
                            style={{ display: "none" }}
                            id="mobile-menu"
                        >
                            ☰
                        </button>
                        📊 Dashboard
                    </div>
                    <div className="topbar-actions">
                        <div className="status-badge connected">
                            <span className="status-dot"></span>
                            Connected
                        </div>
                    </div>
                </header>

                {/* Dashboard Content */}
                <div className="dashboard-content">
                    {/* Welcome */}
                    <div className="dashboard-welcome">
                        <h1>Welcome back, {session.user.name?.split(" ")[0]} 👋</h1>
                        <p>Upload documents and ask questions to get intelligent answers.</p>
                    </div>

                    {/* Stats */}
                    <div className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-icon">📄</div>
                            <div className="stat-value">{documents.length}</div>
                            <div className="stat-label">Documents</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">🧩</div>
                            <div className="stat-value">
                                {documents.reduce((sum, d) => sum + (d.chunkCount || 0), 0)}
                            </div>
                            <div className="stat-label">Total Chunks</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">💬</div>
                            <div className="stat-value">
                                {documents.reduce((sum, d) => sum + (d.chatCount || 0), 0)}
                            </div>
                            <div className="stat-label">Conversations</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">⚡</div>
                            <div className="stat-value">AI</div>
                            <div className="stat-label">Integrated</div>
                        </div>
                    </div>

                    {/* Upload Zone */}
                    <div className="upload-section">
                        <h2>📤 Upload Document</h2>
                        <div
                            className={`upload-zone ${dragActive ? "active" : ""}`}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            id="upload-zone"
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf"
                                multiple
                                style={{ display: "none" }}
                                onChange={(e) => handleUpload(e.target.files)}
                                id="file-input"
                            />
                            <div className="upload-icon">
                                {uploading ? "⏳" : "📄"}
                            </div>
                            <div className="upload-text">
                                {uploading
                                    ? "Processing..."
                                    : dragActive
                                        ? "Drop your PDF here!"
                                        : "Drag & drop your PDF here, or click to browse"}
                            </div>
                            <div className="upload-subtext">
                                Supports PDF files up to 50MB
                            </div>
                            {uploading && (
                                <div className="upload-progress">
                                    <div className="progress-bar-container">
                                        <div
                                            className="progress-bar"
                                            style={{ width: "60%" }}
                                        ></div>
                                    </div>
                                    <div className="upload-status">{uploadProgress}</div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Documents */}
                    <div className="documents-section">
                        <h2>📚 Your Documents</h2>
                        {documents.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-state-icon">📭</div>
                                <h3>No documents yet</h3>
                                <p>Upload your first PDF to start chatting with it using AI.</p>
                            </div>
                        ) : (
                            <div className="documents-grid">
                                {documents.map((doc) => (
                                    <div key={doc.documentId} className="document-card" id={`card-${doc.documentId}`}>
                                        <div className="document-card-header">
                                            <div className="document-card-icon">📄</div>
                                            <div className="document-card-info">
                                                <div className="document-card-name">{doc.fileName}</div>
                                                <div className="document-card-meta">
                                                    {doc.chunkCount} chunks · {doc.chatCount || 0} chats
                                                </div>
                                            </div>
                                        </div>
                                        <div className="document-card-actions">
                                            <button
                                                className="btn btn-primary"
                                                onClick={() => router.push(`/chat/${doc.documentId}`)}
                                                id={`chat-btn-${doc.documentId}`}
                                            >
                                                💬 Chat
                                            </button>
                                            <button
                                                className="btn btn-danger"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDelete(doc.documentId, doc.fileName);
                                                }}
                                                id={`delete-btn-${doc.documentId}`}
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Toast Notifications */}
            <div className="toast-container">
                {toasts.map((toast) => (
                    <div key={toast.id} className={`toast ${toast.type}`}>
                        {toast.message}
                    </div>
                ))}
            </div>
        </div>
    );
}
