import { pipeline, env } from '@huggingface/transformers';

// Configure cache directory based on environment
if (process.env.VERCEL) {
    // Vercel: use /tmp which is writable
    env.cacheDir = '/tmp/model_cache';
    console.log('📁 Using Vercel /tmp cache');
} else {
    // Local: use .model_cache
    env.cacheDir = './.model_cache';
    console.log('📁 Using local .model_cache');
}

env.allowRemoteModels = true;
env.useCache = true; // Explicitly enable caching

let extractor = null;
let modelPromise = null; // For handling concurrent requests

async function getExtractor() {
    // If already loading, wait for it
    if (modelPromise) {
        return modelPromise;
    }
    
    // If already loaded, return it
    if (extractor) {
        return extractor;
    }
    
    // Load the model
    modelPromise = (async () => {
        try {
            console.log('⏳ Downloading/Loading model from Hugging Face...');
            const start = Date.now();

            // Check if model exists in cache
            const fs = await import('fs/promises');
            try {
                await fs.access(`${env.cacheDir}/models--sentence-transformers--all-MiniLM-L6-v2`);
                console.log('📦 Model found in cache');
            } catch {
                console.log('🌐 Model not in cache, downloading...');
            }

            extractor = await pipeline('feature-extraction', 'sentence-transformers/all-MiniLM-L6-v2', {
                quantized: true, // Important: uses smaller model
                revision: 'main',
                progress_callback: (progress) => {
                    if (progress.status === 'download') {
                        console.log(`📥 Downloading: ${Math.round(progress.progress * 100)}%`);
                    }
                }
            });

            console.log(`✅ Model loaded in ${(Date.now() - start) / 1000}s`);
            return extractor;
        } catch (error) {
            console.error('❌ Failed to load model:', error.message);
            modelPromise = null; // Reset so we can try again
            throw error;
        }
    })();
    
    return modelPromise;
}

export async function getEmbedding(text) {
    try {
        const start = Date.now();
        const extractor = await getExtractor();
        
        const output = await extractor([text], {
            pooling: 'mean',
            normalize: true
        });

        const result = output.tolist()[0];
        console.log(`⚡ Embedding generated in ${Date.now() - start}ms`);
        
        return result;
    } catch (error) {
        console.error('Embedding error details:', error);
        throw new Error(`Embedding error: ${error.message}`);
    }
}

export async function getEmbeddings(texts) {
    if (!Array.isArray(texts) || texts.length === 0) return [];

    try {
        const start = Date.now();
        const extractor = await getExtractor();
        
        const output = await extractor(texts, {
            pooling: 'mean',
            normalize: true
        });

        console.log(`⚡ Generated ${texts.length} embeddings in ${Date.now() - start}ms`);
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