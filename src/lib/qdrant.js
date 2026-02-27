
import { QdrantClient } from "@qdrant/js-client-rest";

const COLLECTION_NAME = "ragsphere_documents";
const VECTOR_SIZE = 384;

let qdrantClient = null;

export function getQdrantClient() {
    if (!qdrantClient) {
        qdrantClient = new QdrantClient({
            url: process.env.QDRANT_URL,
            apiKey: process.env.QDRANT_API_KEY || undefined,
        });
    }
    return qdrantClient;
}

export async function ensureCollection() {
    const client = getQdrantClient();
    try {
        await client.getCollection(COLLECTION_NAME);
    } catch {
        await client.createCollection(COLLECTION_NAME, {
            vectors: {
                size: VECTOR_SIZE,
                distance: "Cosine",
            },
        });

        await client.createPayloadIndex(COLLECTION_NAME, {
            field_name: "userId",
            field_schema: "keyword",
        });
        await client.createPayloadIndex(COLLECTION_NAME, {
            field_name: "documentId",
            field_schema: "keyword",
        });
    }
}

export async function upsertVectors(points) {
    const client = getQdrantClient();
    await ensureCollection();
    await client.upsert(COLLECTION_NAME, {
        wait: true,
        points,
    });
}

export async function searchVectors(vector, userId, documentId = null, limit = 5) {
    const client = getQdrantClient();
    await ensureCollection();

    const filter = {
        must: [{ key: "userId", match: { value: userId } }],
    };

    if (documentId) {
        filter.must.push({ key: "documentId", match: { value: documentId } });
    }

    const results = await client.search(COLLECTION_NAME, {
        vector,
        limit,
        filter,
        with_payload: true,
    });

    return results;
}

export async function deleteDocumentVectors(userId, documentId) {
    const client = getQdrantClient();
    await client.delete(COLLECTION_NAME, {
        filter: {
            must: [
                { key: "userId", match: { value: userId } },
                { key: "documentId", match: { value: documentId } },
            ],
        },
    });
}

export async function getDocumentCount(userId) {
    const client = getQdrantClient();
    try {
        const result = await client.count(COLLECTION_NAME, {
            filter: {
                must: [{ key: "userId", match: { value: userId } }],
            },
            exact: true,
        });
        return result.count;
    } catch {
        return 0;
    }
}

export { COLLECTION_NAME, VECTOR_SIZE };
