"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";

export default function ChatPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const params = useParams();
    const documentId = params.documentId;

    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [documents, setDocuments] = useState([]);
    const [currentDoc, setCurrentDoc] = useState(null);
    const [webSearchEnabled, setWebSearchEnabled] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const fetchDocuments = useCallback(async () => {
        try {
            const res = await fetch("/api/documents");
            if (res.ok) {
                const data = await res.json();
                setDocuments(data.documents || []);
                const doc = data.documents?.find((d) => d.documentId === documentId);
                setCurrentDoc(doc || null);
            }
        } catch (error) {
            console.error("Error fetching documents:", error);
        }
    }, [documentId]);

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/auth/signin");
        }
        if (status === "authenticated") {
            fetchDocuments();
        }
    }, [status, router, fetchDocuments]);

    const sendMessage = async (e) => {
        e?.preventDefault();
        if (!input.trim() || loading) return;

        const userMessage = input.trim();
        setInput("");
        setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
        setLoading(true);

        // Reset textarea height
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
        }

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: userMessage,
                    documentId,
                    useWebSearch: webSearchEnabled,
                }),
            });

            const data = await res.json();

            if (res.ok) {
                setMessages((prev) => [
                    ...prev,
                    {
                        role: "assistant",
                        content: data.answer,
                        sources: data.sources,
                    },
                ]);
            } else {
                setMessages((prev) => [
                    ...prev,
                    {
                        role: "assistant",
                        content: `❌ Error: ${data.error}`,
                    },
                ]);
            }
        } catch (error) {
            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content: `❌ Failed to send message: ${error.message}`,
                },
            ]);
        }

        setLoading(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const handleTextareaChange = (e) => {
        setInput(e.target.value);
        // Auto resize
        e.target.style.height = "auto";
        e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
    };

    const handleSuggestion = (text) => {
        setInput(text);
        textareaRef.current?.focus();
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
            {/* Sidebar Overlay */}
            <div
                className={`sidebar-overlay ${sidebarOpen ? "visible" : ""}`}
                onClick={() => setSidebarOpen(false)}
            />

            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        <div className="sidebar-logo-icon">🧠</div>
                        <h2>RagSphere</h2>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    <button
                        className="nav-item"
                        onClick={() => router.push("/dashboard")}
                        id="nav-back-dashboard"
                    >
                        <span className="nav-item-icon">📊</span>
                        Dashboard
                    </button>
                </nav>

                <div className="sidebar-section-title">Documents</div>
                <div className="sidebar-documents">
                    {documents.map((doc) => (
                        <button
                            key={doc.documentId}
                            className={`doc-item ${doc.documentId === documentId ? "active" : ""}`}
                            onClick={() => {
                                router.push(`/chat/${doc.documentId}`);
                                setSidebarOpen(false);
                            }}
                            id={`sidebar-doc-${doc.documentId}`}
                        >
                            <span className="doc-item-icon">📄</span>
                            <span className="doc-item-name">{doc.fileName}</span>
                            {doc.documentId === documentId && (
                                <span className="doc-item-badge">active</span>
                            )}
                        </button>
                    ))}
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
                            <div
                                className="user-avatar"
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    background: "var(--gradient-primary)",
                                    fontSize: "14px",
                                    fontWeight: 700,
                                }}
                            >
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
                        >
                            ☰
                        </button>
                        💬 {currentDoc?.fileName || "Chat"}
                    </div>
                    <div className="topbar-actions">
                        {currentDoc && (
                            <div className="status-badge connected">
                                <span className="status-dot"></span>
                                {currentDoc.chunkCount} chunks indexed
                            </div>
                        )}
                    </div>
                </header>

                {/* Chat */}
                <div className="chat-container">
                    {/* Messages */}
                    <div className="chat-messages">
                        {messages.length === 0 ? (
                            <div className="chat-welcome">
                                <div className="chat-welcome-icon">💬</div>
                                <h2>Chat with your document</h2>
                                <p>
                                    {currentDoc
                                        ? `Ask anything about "${currentDoc.fileName}". I'll find the relevant information for you.`
                                        : "Select a document to start chatting."}
                                </p>
                                <div className="chat-suggestions">
                                    <button
                                        className="chat-suggestion"
                                        onClick={() => handleSuggestion("Summarize this document")}
                                    >
                                        📝 Summarize this document
                                    </button>
                                    <button
                                        className="chat-suggestion"
                                        onClick={() =>
                                            handleSuggestion("What are the key points?")
                                        }
                                    >
                                        🔑 Key points
                                    </button>
                                    <button
                                        className="chat-suggestion"
                                        onClick={() =>
                                            handleSuggestion("Explain the main concepts")
                                        }
                                    >
                                        💡 Main concepts
                                    </button>
                                </div>
                            </div>
                        ) : (
                            messages.map((msg, i) => (
                                <div key={i} className={`message ${msg.role}`}>
                                    <div className="message-avatar">
                                        {msg.role === "user" ? "👤" : "🧠"}
                                    </div>
                                    <div>
                                        <div className="message-content">
                                            {msg.role === "assistant" ? (
                                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                                            ) : (
                                                <p>{msg.content}</p>
                                            )}
                                        </div>
                                        {msg.sources && (
                                            <div className="message-sources">
                                                {msg.sources.hasDocumentContext && (
                                                    <span className="source-tag">📄 Document</span>
                                                )}
                                                {msg.sources.hasWebSearch && (
                                                    <span className="source-tag web">🌐 Web</span>
                                                )}
                                                {msg.sources.hasKnowledgeGraph && (
                                                    <span className="source-tag kg">🧠 Graph</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}

                        {loading && (
                            <div className="message assistant">
                                <div className="message-avatar">🧠</div>
                                <div className="message-content">
                                    <div className="typing-indicator">
                                        <div className="typing-dot"></div>
                                        <div className="typing-dot"></div>
                                        <div className="typing-dot"></div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="chat-input-container">
                        <form onSubmit={sendMessage} className="chat-input-wrapper">
                            <div className="chat-input-box">
                                <textarea
                                    ref={textareaRef}
                                    className="chat-input"
                                    value={input}
                                    onChange={handleTextareaChange}
                                    onKeyDown={handleKeyDown}
                                    placeholder={
                                        currentDoc
                                            ? `Ask about ${currentDoc.fileName}...`
                                            : "Type your message..."
                                    }
                                    rows={1}
                                    disabled={loading}
                                    id="chat-input"
                                />
                                <div className="chat-input-actions">
                                    <button
                                        type="button"
                                        className={`web-search-toggle ${webSearchEnabled ? "active" : ""}`}
                                        onClick={() => setWebSearchEnabled(!webSearchEnabled)}
                                        title="Toggle web search"
                                        id="web-search-toggle"
                                    >
                                        🌐 {webSearchEnabled ? "On" : "Off"}
                                    </button>
                                </div>
                            </div>
                            <button
                                type="submit"
                                className="send-btn"
                                disabled={!input.trim() || loading}
                                id="send-btn"
                            >
                                {loading ? (
                                    <div className="spinner" style={{ width: 18, height: 18 }}></div>
                                ) : (
                                    "➤"
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </main>
        </div>
    );
}
