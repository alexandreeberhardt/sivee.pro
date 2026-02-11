import '@testing-library/jest-dom'

// jsdom does not implement window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})

// jsdom 28+ uses a Storage class that some code doesn't handle well.
// Provide a simple in-memory localStorage polyfill for tests.
const storage = new Map<string, string>()
const localStorageMock: Storage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => { storage.set(key, value) },
  removeItem: (key: string) => { storage.delete(key) },
  clear: () => { storage.clear() },
  get length() { return storage.size },
  key: (index: number) => [...storage.keys()][index] ?? null,
}
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })
