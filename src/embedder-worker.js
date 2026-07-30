import { pipeline } from '@huggingface/transformers';

let extractor = null;

async function getExtractor() {
  if (!extractor) {
    extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      dtype: 'q8',
      progress_callback: (p) => {
        self.postMessage({ type: 'progress', payload: p });
      }
    });
  }
  return extractor;
}

self.addEventListener('message', async (event) => {
  const { type, id, payload } = event.data;
  try {
    const ext = await getExtractor();
    if (type === 'init') {
      self.postMessage({ type: 'ready', id });
    } else if (type === 'embed') {
      const output = await ext(payload.texts, { pooling: 'mean', normalize: true });
      self.postMessage({ type: 'embed_result', id, payload: output.tolist() });
    } else if (type === 'embed_batch') {
      const allVectors = [];
      for (let i = 0; i < payload.texts.length; i += payload.batchSize || 10) {
        const batch = payload.texts.slice(i, i + (payload.batchSize || 10));
        const output = await ext(batch, { pooling: 'mean', normalize: true });
        allVectors.push(...output.tolist());
        self.postMessage({ type: 'batch_progress', id, payload: { done: allVectors.length, total: payload.texts.length } });
      }
      self.postMessage({ type: 'embed_result', id, payload: allVectors });
    }
  } catch (err) {
    self.postMessage({ type: 'error', id, payload: err.message });
  }
});
