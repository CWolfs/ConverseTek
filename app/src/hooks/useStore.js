import { useContext } from 'react';

import { storeContext } from '../App';

export const useStore = (storeType) => {
  const store = useContext(storeContext);

  if (!store) {
    // this is especially useful in TypeScript so you don't need to be checking for null all the time
    throw new Error('useStore must be used within a StoreProvider.');
  }

  if (storeType === 'data') return store.dataStore;
  if (storeType === 'node') return store.nodeStore;
  if (storeType === 'modal') return store.modalStore;
  if (storeType === 'def') return store.def;
  if (storeType === 'error') return store.errorStore;

  throw new Error('useStore must be used with a valid store type');
};
