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
    this.initialization = null;
  }

  async init() {
    if (this.initialization) return this.initialization;
    this._restoreIndex();

    try {
      this.worker = new Worker(new URL('./embedder-worker.js', import.meta.url), { type: 'module' });
    } catch {
      this.ready = false;
      return false;
    }

    this.initialization = new Promise((resolve) => {
      let settled = false;
      const settle = (ready) => {
        if (settled) return;
        settled = true;
        clearTimeout(readyTimeout);
        this.ready = ready;
        resolve(ready);
      };
      const readyTimeout = setTimeout(() => settle(false), 30000);

      this.worker.addEventListener('message', (event) => {
        const { type, id, payload } = event.data;
        if (type === 'ready' && id === 'init') {
          settle(true);
          return;
        }
        if (type === 'error' && id === 'init') {
          settle(false);
          return;
        }
        const p = this.pending.get(id);
        if (!p) return;
        if (type === 'embed_result') {
          this.pending.delete(id);
          p.resolve(payload);
        } else if (type === 'batch_progress') {
          p.progress?.(payload);
        } else if (type === 'error') {
          this.pending.delete(id);
          p.reject(new Error(payload));
        }
      });
      this.worker.addEventListener('error', () => settle(false));
      this.worker.postMessage({ type: 'init', id: 'init' });
    });
    return this.initialization;
  }

  _embed(texts) {
    if (!this.worker || !this.ready) {
      return Promise.reject(new Error('Semantic search is not ready'));
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
    } catch {}
  }

  _restoreIndex() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (!Array.isArray(data) || data.length === 0) return false;
      this.index = data;
      return true;
    } catch { return false; }
  }

  getStatus() {
    return {
      ready: this.ready,
      documentCount: this.index.length,
      cached: (() => {
        try { return localStorage.getItem(STORAGE_KEY) !== null; } catch { return false; }
      })()
    };
  }
}

export const semanticSearch = new SemanticSearch();
