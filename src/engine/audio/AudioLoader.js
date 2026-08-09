// Fetches and decodes audio files into AudioBuffers, and caches the
// result by URL — the only place in the engine that ever fetches or
// decodes audio. A buffer is decoded at most once no matter how many
// templates/sounds reference the same URL or how many times play() is
// called for it; playing it many times simultaneously just means many
// AudioPlayer "voices" reading the same shared, already-decoded buffer
// (see AudioPlayer/AudioManager) — never duplicated decode work or
// duplicated network requests.
export default class AudioLoader {
  constructor(context) {
    this.context = context;

    // url -> Promise<AudioBuffer>. Caching the in-flight PROMISE (not
    // just the eventual result) is what makes concurrent load() calls
    // for the same URL share one fetch/decode instead of racing.
    this.cache = new Map();
  }

  load(url) {
    if (this.cache.has(url)) return this.cache.get(url);

    const promise = fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`AudioLoader: failed to fetch "${url}" (${response.status})`);
        }

        return response.arrayBuffer();
      })
      .then((data) => this.context.decodeAudioData(data))
      .catch((error) => {
        // A failed load must not poison the cache — the next load()
        // call for this URL should retry, not replay the same failure
        // forever.
        this.cache.delete(url);
        throw error;
      });

    this.cache.set(url, promise);

    return promise;
  }

  preload(urls) {
    return Promise.all(urls.map((url) => this.load(url)));
  }

  has(url) {
    return this.cache.has(url);
  }

  dispose() {
    this.cache.clear();
  }
}
