
import neo4j from "neo4j-driver";

let driver = null;

export function getNeo4jDriver() {
    if (!driver) {
        const uri = process.env.NEO4J_URI;
        const user = process.env.NEO4J_USER;
        const password = process.env.NEO4J_PASSWORD;

        if (!uri || !user || !password) {
            console.warn("⚠️ Neo4j credentials not configured");
            return null;
        }

        try {
            driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
        } catch (error) {
            console.error("❌ Neo4j connection error:", error.message);
            return null;
        }
    }
    return driver;
}

// Initialize schema constraints
export async function initNeo4jSchema() {
    const d = getNeo4jDriver();
    if (!d) return;

    const session = d.session();
    try {
        await session.run(
            "CREATE CONSTRAINT IF NOT EXISTS FOR (u:User) REQUIRE u.userId IS UNIQUE"
        );
        await session.run(
            "CREATE CONSTRAINT IF NOT EXISTS FOR (d:Document) REQUIRE d.documentId IS UNIQUE"
        );
        await session.run(
            "CREATE INDEX IF NOT EXISTS FOR (c:Conversation) ON (c.timestamp)"
        );
        await session.run(
            "CREATE INDEX IF NOT EXISTS FOR (e:Entity) ON (e.name)"
        );
    } catch (error) {
        console.error("Neo4j schema init error:", error.message);
    } finally {
        await session.close();
    }
}


export async function storeConversation(userId, documentId, userMessage, assistantMessage, entities = []) {
    const d = getNeo4jDriver();
    if (!d) return null;

    const session = d.session();
    try {
        // Create conversation node
        const result = await session.run(
            `MERGE (u:User {userId: $userId})
       MERGE (d:Document {documentId: $documentId})
       MERGE (u)-[:OWNS]->(d)
       CREATE (c:Conversation {
         timestamp: datetime(),
         userMessage: $userMessage,
         assistantMessage: $assistantMessage,
         userId: $userId,
         documentId: $documentId
       })
       MERGE (u)-[:HAD]->(c)
       MERGE (c)-[:ABOUT]->(d)
       RETURN elementId(c) as convId`,
            { userId, documentId, userMessage, assistantMessage }
        );

        const convId = result.records[0]?.get("convId");

        // Store entities
        for (const entity of entities) {
            await session.run(
                `MATCH (c) WHERE elementId(c) = $convId
         MERGE (e:Entity {name: $name, type: $type})
         CREATE (c)-[:MENTIONS]->(e)`,
                { convId, name: entity.name, type: entity.type }
            );
        }

        return convId;
    } catch (error) {
        console.error("Error storing conversation:", error.message);
        return null;
    } finally {
        await session.close();
    }
}

// Get conversation history for a document
export async function getConversationHistory(userId, documentId, limit = 10) {
    const d = getNeo4jDriver();
    if (!d) return [];

    const session = d.session();
    try {
        const result = await session.run(
            `MATCH (u:User {userId: $userId})-[:HAD]->(c:Conversation)-[:ABOUT]->(d:Document {documentId: $documentId})
       RETURN c.userMessage as userMessage, c.assistantMessage as assistantMessage, c.timestamp as timestamp
       ORDER BY c.timestamp DESC
       LIMIT $limit`,
            { userId, documentId, limit: neo4j.int(limit) }
        );

        return result.records.map((r) => ({
            userMessage: r.get("userMessage"),
            assistantMessage: r.get("assistantMessage"),
            timestamp: r.get("timestamp")?.toString(),
        })).reverse();
    } catch (error) {
        console.error("Error getting conversation history:", error.message);
        return [];
    } finally {
        await session.close();
    }
}

// Store document metadata
export async function storeDocumentMetadata(userId, documentId, fileName, chunkCount) {
    const d = getNeo4jDriver();
    if (!d) return;

    const session = d.session();
    try {
        await session.run(
            `MERGE (u:User {userId: $userId})
       MERGE (d:Document {documentId: $documentId})
       SET d.fileName = $fileName, d.chunkCount = $chunkCount, d.uploadedAt = datetime()
       MERGE (u)-[:OWNS]->(d)`,
            { userId, documentId, fileName, chunkCount: neo4j.int(chunkCount) }
        );
    } catch (error) {
        console.error("Error storing document metadata:", error.message);
    } finally {
        await session.close();
    }
}

// Get user's documents from the graph
export async function getUserDocuments(userId) {
    const d = getNeo4jDriver();
    if (!d) return [];

    const session = d.session();
    try {
        const result = await session.run(
            `MATCH (u:User {userId: $userId})-[:OWNS]->(d:Document)
       OPTIONAL MATCH (d)<-[:ABOUT]-(c:Conversation)
       WITH d, count(c) as chatCount
       RETURN d.documentId as documentId, d.fileName as fileName, d.chunkCount as chunkCount, 
              d.uploadedAt as uploadedAt, chatCount
       ORDER BY d.uploadedAt DESC`,
            { userId }
        );

        return result.records.map((r) => ({
            documentId: r.get("documentId"),
            fileName: r.get("fileName"),
            chunkCount: r.get("chunkCount")?.toNumber?.() || 0,
            uploadedAt: r.get("uploadedAt")?.toString(),
            chatCount: r.get("chatCount")?.toNumber?.() || 0,
        }));
    } catch (error) {
        console.error("Error getting user documents:", error.message);
        return [];
    } finally {
        await session.close();
    }
}

// Delete a document and its conversations from graph
export async function deleteDocumentFromGraph(userId, documentId) {
    const d = getNeo4jDriver();
    if (!d) return;

    const session = d.session();
    try {
        await session.run(
            `MATCH (u:User {userId: $userId})-[:OWNS]->(d:Document {documentId: $documentId})
       OPTIONAL MATCH (d)<-[:ABOUT]-(c:Conversation)
       OPTIONAL MATCH (c)-[:MENTIONS]->(e:Entity)
       DETACH DELETE c, d`,
            { userId, documentId }
        );
    } catch (error) {
        console.error("Error deleting document from graph:", error.message);
    } finally {
        await session.close();
    }
}

// Query knowledge graph for related entities
export async function queryKnowledgeGraph(userId, query) {
    const d = getNeo4jDriver();
    if (!d) return "Knowledge graph not configured.";

    const session = d.session();
    try {
        const result = await session.run(
            `MATCH (u:User {userId: $userId})-[:HAD]->(c:Conversation)-[:MENTIONS]->(e:Entity)
       WHERE toLower(e.name) CONTAINS toLower($query) OR toLower(c.userMessage) CONTAINS toLower($query)
       RETURN DISTINCT e.name as entity, e.type as type, c.userMessage as context
       LIMIT 10`,
            { userId, query }
        );

        if (result.records.length === 0) return "No related information found in knowledge graph.";

        return result.records
            .map((r) => `• ${r.get("entity")} (${r.get("type")}): ${r.get("context")?.substring(0, 200)}`)
            .join("\n");
    } catch (error) {
        console.error("Error querying knowledge graph:", error.message);
        return "Knowledge graph query failed.";
    } finally {
        await session.close();
    }
}
