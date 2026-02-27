
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getEmbedding } from "@/lib/embeddings";
import { searchVectors } from "@/lib/qdrant";
import { chatWithCerebras, extractEntities } from "@/lib/cerebras";
import { webSearch } from "@/lib/tavily";
import {
    storeConversation,
    getConversationHistory,
    queryKnowledgeGraph,
} from "@/lib/neo4j";

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;
        const { message, documentId, useWebSearch } = await req.json();

        if (!message) {
            return NextResponse.json({ error: "No message provided" }, { status: 400 });
        }

        //  Get RAG context from Qdrant
        let ragContext = "";
        if (documentId) {
            try {
                const queryEmbedding = await getEmbedding(message);
                const results = await searchVectors(queryEmbedding, userId, documentId, 5);
                if (results && results.length > 0) {
                    ragContext = results
                        .map((r) => r.payload.text)
                        .join("\n\n---\n\n");
                }
            } catch (error) {
                console.error("RAG retrieval error:", error.message);
            }
        }

        //  Web search if requested
        let webContext = "";
        let webResults = [];
        if (useWebSearch) {
            try {
                const searchData = await webSearch(message);
                if (searchData.answer) {
                    webContext = `Web Search Answer: ${searchData.answer}`;
                }
                webResults = searchData.results || [];
                if (webResults.length > 0 && !webContext) {
                    webContext = webResults
                        .map((r, i) => `${i + 1}. ${r.title}: ${r.content}`)
                        .join("\n\n");
                }
            } catch (error) {
                console.error("Web search error:", error.message);
            }
        }

        //  Knowledge graph context
        let kgContext = "";
        try {
            kgContext = await queryKnowledgeGraph(userId, message);
            if (kgContext === "Knowledge graph not configured." || kgContext === "No related information found in knowledge graph.") {
                kgContext = "";
            }
        } catch (error) {
            console.error("Knowledge graph error:", error.message);
        }

        //Get conversation history from Neo4j
        let history = [];
        if (documentId) {
            try {
                history = await getConversationHistory(userId, documentId, 5);
            } catch (error) {
                console.error("History retrieval error:", error.message);
            }
        }

        //  Build messages for Cerebras
        let systemContent = `You are RagSphere AI, an intelligent assistant that helps users understand their documents.
You answer questions accurately based on the provided context. If the context doesn't contain enough information, say so honestly.
Format your responses using Markdown for better readability.`;

        if (ragContext) {
            systemContent += `\n\n📄 DOCUMENT CONTEXT:\n${ragContext}`;
        }

        if (webContext) {
            systemContent += `\n\n🌐 WEB SEARCH RESULTS:\n${webContext}`;
        }

        if (kgContext) {
            systemContent += `\n\n KNOWLEDGE GRAPH CONTEXT:\n${kgContext}`;
        }

        const messages = [{ role: "system", content: systemContent }];

        // Add conversation history
        for (const h of history) {
            messages.push({ role: "user", content: h.userMessage });
            messages.push({ role: "assistant", content: h.assistantMessage });
        }

        messages.push({ role: "user", content: message });

        //  Get response from Cerebras
        const answer = await chatWithCerebras(messages);

        //  Store conversation in Neo4j (async, don't await)
        if (documentId) {
            const entities = await extractEntities(message + " " + answer);
            storeConversation(userId, documentId, message, answer, entities).catch(
                (err) => console.error("Store conversation error:", err.message)
            );
        }

        return NextResponse.json({
            answer,
            sources: {
                hasDocumentContext: !!ragContext,
                hasWebSearch: !!webContext,
                webResults,
                hasKnowledgeGraph: !!kgContext,
            },
        });
    } catch (error) {
        console.error("Chat error:", error);
        return NextResponse.json(
            { error: "Failed to generate response: " + error.message },
            { status: 500 }
        );
    }
}
