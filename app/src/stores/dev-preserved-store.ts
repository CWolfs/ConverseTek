type DevStoreGlobals = typeof globalThis & Record<string, unknown>;

export function getDevPreservedStore<TStore extends object>(key: string, createStore: () => TStore, prototype: object): TStore {
  if (!import.meta.env.DEV) return createStore();

  const storeGlobals = globalThis as DevStoreGlobals;
  const existingStore = storeGlobals[key];

  if (existingStore != null && typeof existingStore === 'object') {
    Object.setPrototypeOf(existingStore, prototype);
    return existingStore as TStore;
  }

  const store = createStore();
  storeGlobals[key] = store;
  return store;
}
