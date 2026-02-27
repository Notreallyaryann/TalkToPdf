import { pipeline, env } from '@huggingface/transformers';

env.cacheDir = './.model_cache';

env.allowRemoteModels = true;

let extractor = null;

async function getExtractor() {
    if (!extractor) {
        try {
            console.log('⏳ Downloading/Loading model from Hugging Face...');

            extractor = await pipeline('feature-extraction', 'sentence-transformers/all-MiniLM-L6-v2', {
                quantized: true,
                revision: 'main',
            });

            console.log('✅ Embedding model loaded successfully');
        } catch (error) {
            console.error('❌ Failed to load model:', error.message);
            throw error;
        }
    }
    return extractor;
}

export async function getEmbedding(text) {
    try {
        const extractor = await getExtractor();
        const output = await extractor([text], {
            pooling: 'mean',
            normalize: true
        });

        return output.tolist()[0];
    } catch (error) {
        console.error('Embedding error details:', error);
        throw new Error(`Embedding error: ${error.message}`);
    }
}

export async function getEmbeddings(texts) {
    if (!Array.isArray(texts) || texts.length === 0) return [];

    try {
        const extractor = await getExtractor();
        const output = await extractor(texts, {
            pooling: 'mean',
            normalize: true
        });

        return output.tolist();
    } catch (error) {
        console.error('Batch embedding error details:', error);
        throw new Error(`Embedding error: ${error.message}`);
    }
}

export function chunkText(text, chunkSize = 1000, overlap = 200) {
    const chunks = [];
    let start = 0;

    if (!text) return [];

    while (start < text.length) {
        const end = Math.min(start + chunkSize, text.length);
        chunks.push(text.slice(start, end));
        start += chunkSize - overlap;
    }
    return chunks;
}