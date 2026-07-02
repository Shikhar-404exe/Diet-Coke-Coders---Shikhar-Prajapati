const STORAGE_KEY = 'semanticSearchIndex';
const STORAGE_VERSION_KEY = 'semanticSearchVersion';

function cosineSimilarity(vecA, vecB) {
  if (vecA.length !== vecB.length) return 0;
  let dot = 0;
  for (let i = 0; i < vecA.length; i++) dot += vecA[i] * vecB[i];
  return Math.max(-1, Math.min(1, dot));
}

function bm25Score(query, text) {
  const k1 = 1.5;
  const b = 0.75;
  const avgDocLen = 200;
  const queryTokens = query.toLowerCase().split(/\W+/).filter(Boolean);
  const docTokens = text.toLowerCase().split(/\W+/).filter(Boolean);
  const docLen = docTokens.length;
  const termFreq = {};
  docTokens.forEach(t => { termFreq[t] = (termFreq[t] || 0) + 1; });
  let score = 0;
  queryTokens.forEach(qt => {
    const tf = termFreq[qt] || 0;
    if (tf > 0) {
      const idf = Math.log(1 + (10000 - 1) / 1);
      score += idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + b * docLen / avgDocLen)));
    }
  });
  return score;
}

export class SemanticSearch {
  constructor() {
    this.worker = null;
    this.index = [];
    this.ready = false;
    this.pending = new Map();
    this.requestId = 0;
    this.hybridAlpha = 0.7;
  }

  async init() {
    const restored = this._restoreIndex();
    if (restored) {
      this.ready = true;
      return true;
    }
    this.worker = new Worker(new URL('./embedder-worker.js', import.meta.url), { type: 'module' });
    return new Promise((resolve) => {
      const readyTimeout = setTimeout(() => { this.ready = true; resolve(true); }, 30000);
      this.worker.addEventListener('message', (event) => {
        const { type, id, payload } = event.data;
        if (type === 'progress' && payload?.status === 'done') {
          clearTimeout(readyTimeout);
          this.ready = true;
          resolve(true);
        }
        const p = this.pending.get(id);
        if (!p) return;
        this.pending.delete(id);
        if (type === 'embed_result') p.resolve(payload);
        else if (type === 'batch_progress') p.progress?.(payload);
        else if (type === 'error') p.reject(new Error(payload));
      });
      this.worker.addEventListener('error', () => { clearTimeout(readyTimeout); this.ready = true; resolve(true); });
    });
  }

  _embed(texts) {
    if (!this.worker) {
      return Promise.reject(new Error('Worker not initialized'));
    }
    return new Promise((resolve, reject) => {
      const id = this.requestId++;
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage({ type: 'embed', id, payload: { texts: Array.isArray(texts) ? texts : [texts] } });
    });
  }

  async indexDocuments(docs) {
    const texts = docs.map(d => d.title + '. ' + d.content);
    const vectors = await this._embed(texts);
    this.index = docs.map((doc, i) => ({ ...doc, vector: vectors[i] }));
    this._persistIndex();
    return this;
  }

  async search(query, topK = 5) {
    if (this.index.length === 0) return [];
    const queryVectors = await this._embed([query]);
    const queryVector = queryVectors[0];
    const scored = this.index.map(doc => {
      const semantic = cosineSimilarity(queryVector, doc.vector);
      const sparse = bm25Score(query, doc.title + ' ' + doc.content);
      const hybrid = this.hybridAlpha * Math.max(0, semantic) + (1 - this.hybridAlpha) * Math.min(1, sparse / 10);
      return { doc, score: parseFloat(hybrid.toFixed(4)), semantic, sparse };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK).map(({ doc, score, semantic, sparse }) => ({
      id: doc.id,
      title: doc.title,
      content: doc.content,
      category: doc.category,
      tags: doc.tags,
      source: doc.source,
      lastUpdated: doc.lastUpdated,
      score,
      semanticScore: semantic,
      sparseScore: sparse
    }));
  }

  async addDocument(doc) {
    const texts = [doc.title + '. ' + doc.content];
    const vectors = await this._embed(texts);
    this.index.push({ ...doc, vector: vectors[0] });
    this._persistIndex();
  }

  removeDocument(docId) {
    this.index = this.index.filter(d => d.id !== docId);
    this._persistIndex();
  }

  _persistIndex() {
    try {
      const data = this.index.map(({ vector, ...rest }) => ({ ...rest, vector }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      localStorage.setItem(STORAGE_VERSION_KEY, Date.now().toString());
    } catch (e) {}
  }

  _restoreIndex() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (!Array.isArray(data) || data.length === 0) return false;
      this.index = data;
      this.ready = true;
      return true;
    } catch (e) { return false; }
  }

  getStatus() {
    return {
      ready: this.ready,
      documentCount: this.index.length,
      cached: localStorage.getItem(STORAGE_KEY) !== null
    };
  }
}

export const semanticSearch = new SemanticSearch();
