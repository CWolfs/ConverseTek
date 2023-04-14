import { useContext } from 'react';

import { storeContext } from '../App';
import { NodeStore } from 'stores/nodeStore/node-store';
import { DataStore } from 'stores/dataStore/data-store';
import { ErrorStore } from 'stores/errorStore/error-store';
import { ModalStore } from 'stores/modalStore/modal-store';
import { DefStore } from 'stores/defStore/def-store';

export const useStore = <T extends DataStore | NodeStore | ModalStore | DefStore | ErrorStore>(storeType: string): T => {
  const store = useContext(storeContext);

  if (storeType === 'data') return store.dataStore as T;
  if (storeType === 'node') return store.nodeStore as T;
  if (storeType === 'modal') return store.modalStore as T;
  if (storeType === 'def') return store.defStore as T;
  if (storeType === 'error') return store.errorStore as T;

  throw new Error('useStore must be used with a valid store type');
};
