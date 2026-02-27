
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getUserDocuments, deleteDocumentFromGraph } from "@/lib/neo4j";
import { deleteDocumentVectors } from "@/lib/qdrant";

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const documents = await getUserDocuments(session.user.id);
        return NextResponse.json({ documents });
    } catch (error) {
        console.error("Documents list error:", error);
        return NextResponse.json(
            { error: "Failed to list documents" },
            { status: 500 }
        );
    }
}

export async function DELETE(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { documentId } = await req.json();
        if (!documentId) {
            return NextResponse.json({ error: "No documentId provided" }, { status: 400 });
        }

        const userId = session.user.id;

        // Delete from both Qdrant and Neo4j
        await Promise.all([
            deleteDocumentVectors(userId, documentId),
            deleteDocumentFromGraph(userId, documentId),
        ]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Document delete error:", error);
        return NextResponse.json(
            { error: "Failed to delete document" },
            { status: 500 }
        );
    }
}
