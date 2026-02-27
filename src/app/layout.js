import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata = {
    title: "RagSphere - AI Document Intelligence",
    description:
        "Upload PDFs, chat with your documents using AI. Powered by Cerebras, Qdrant, Neo4j, and HuggingFace.",
    keywords: "RAG, AI, PDF, document, chat, vector search, knowledge graph",
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
