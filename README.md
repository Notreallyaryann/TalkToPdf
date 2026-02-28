# RagSphere - Intelligent Document Q&A with RAG 

![RagSphere Architecture](https://github.com/Notreallyaryann/TalkToPdf/raw/main/Architecture.webp)

*RagSphere's core RAG pipeline - turning your documents into intelligent conversations*

RagSphere is a powerful **Retrieval-Augmented Generation (RAG)** platform that lets you upload PDF documents and have intelligent conversations about them. It combines vector search, web integration, and knowledge graphs to provide accurate, context-aware answers.

## ✨ Key Features

### 📄 **Smart Document Processing**
- Upload PDFs and automatically extract text
- Intelligent chunking with overlap for better context retention
- Generate embeddings for semantic search
- Store vectors in Qdrant for fast retrieval

### 💬 **Intelligent Chat Interface**
- Ask questions about your documents in natural language
- Get answers grounded in your uploaded content
- Conversation history maintained for context
- Optional web search integration for real-time information

### 🧠 **Knowledge Graph Integration**
- Automatically extract entities from conversations
- Build relationships between documents and concepts
- Query graph for enriched context
- Persistent storage in Neo4j

### 🔐 **Secure & Scalable**
- User authentication with NextAuth.js
- Complete data isolation between users
- Secure API endpoints with session validation
- Scalable architecture ready for production
