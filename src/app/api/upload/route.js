
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getEmbeddings, chunkText } from "@/lib/embeddings";
import { upsertVectors } from "@/lib/qdrant";
import { storeDocumentMetadata } from "@/lib/neo4j";
import { v4 as uuidv4 } from "uuid";
import pdf from "pdf-parse";

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;
        const formData = await req.formData();
        const file = formData.get("file");

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        if (!file.name.endsWith(".pdf")) {
            return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
        }

        // Parse PDF
        const buffer = Buffer.from(await file.arrayBuffer());
        const pdfData = await pdf(buffer);
        const text = pdfData.text;

        if (!text || text.trim().length === 0) {
            return NextResponse.json({ error: "Could not extract text from PDF" }, { status: 400 });
        }

        // Chunk the text
        const chunks = chunkText(text, 1000, 200);
        const documentId = uuidv4();

        // Get embeddings in batches
        const batchSize = 10;
        const allPoints = [];

        for (let i = 0; i < chunks.length; i += batchSize) {
            const batch = chunks.slice(i, i + batchSize);
            const embeddings = await getEmbeddings(batch);

            for (let j = 0; j < batch.length; j++) {
                allPoints.push({
                    id: uuidv4(),
                    vector: embeddings[j],
                    payload: {
                        text: batch[j],
                        userId,
                        documentId,
                        fileName: file.name,
                        chunkIndex: i + j,
                        totalChunks: chunks.length,
                    },
                });
            }
        }

        // Upsert to Qdrant
        await upsertVectors(allPoints);

        // Store metadata in Neo4j
        await storeDocumentMetadata(userId, documentId, file.name, chunks.length);

        return NextResponse.json({
            success: true,
            documentId,
            fileName: file.name,
            chunks: chunks.length,
            pages: pdfData.numpages,
        });
    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json(
            { error: "Failed to process document: " + error.message },
            { status: 500 }
        );
    }
}
