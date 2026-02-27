

let extractor = null;
let modelPromise = null;

if (process.env.VERCEL) {
  process.env.TRANSFORMERS_CACHE = '/tmp/model_cache';
} else {
  process.env.TRANSFORMERS_CACHE = './.model_cache';
}

async function getExtractor() {
  if (modelPromise) return modelPromise;
  
  modelPromise = (async () => {
    try {
      console.log('⏳ Dynamically loading transformers...');
      
      const { pipeline, env } = await import('@huggingface/transformers');
      
      if (process.env.VERCEL) {
        env.cacheDir = '/tmp/model_cache';
      }
      
      console.log('📥 Loading model...');
      const start = Date.now();
      
      const extractorInstance = await pipeline('feature-extraction', 'sentence-transformers/all-MiniLM-L6-v2', {
        quantized: true,
      });
      
      console.log(`✅ Model loaded in ${(Date.now() - start) / 1000}s`);
      return extractorInstance;
    } catch (error) {
      console.error('❌ Failed to load model:', error);
      modelPromise = null;
      throw error;
    }
  })();
  
  return modelPromise;
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
    console.error('Embedding error:', error);
    throw error;
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
    console.error('Batch embedding error:', error);
    throw error;
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