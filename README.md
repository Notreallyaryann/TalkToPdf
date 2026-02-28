✨ Key Features

📄 PDF Upload & Processing
Extract text, intelligently chunk it with overlap, generate embeddings, and store vectors in Qdrant for semantic search.
💬 Context‑Aware Chat
Ask questions and receive answers grounded in your documents. The system retrieves relevant chunks, optionally adds web search results, and queries a Neo4j knowledge graph for related facts.
🌐 Optional Web Search
Integrates with Tavily to fetch up‑to‑date information when needed.
🧠 Knowledge Graph
Conversations and extracted entities are stored in Neo4j, enabling relationship‑based context over time.
🔐 Authentication
User‑specific data isolation via NextAuth.js – every user sees only their own documents and history.
⚡ Modern Stack
Built with Next.js, TypeScript, Tailwind CSS, and deployed on Vercel‑ready architecture.
🛠️ Tech Stack

Frontend & API: Next.js 
Auth: NextAuth.js
Vector Database: Qdrant
Graph Database: Neo4j
LLM Provider: Cerebras (llama-3.3-70b)
Embeddings: OpenAI / compatible (configurable)
Web Search: Tavily API
PDF Parsing: pdf-parse
🚀 How It Works

Upload a PDF – the file is chunked, embedded, and stored in Qdrant; metadata goes to Neo4j.
Chat – your question is used to retrieve relevant document chunks from Qdrant, optionally augmented with web search and knowledge graph data.
Generate – the combined context is sent to Cerebras, which produces a fluent, sourced answer.
Remember – every conversation is saved in Neo4j, building a knowledge graph over time.
