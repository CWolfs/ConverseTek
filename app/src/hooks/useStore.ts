import { useContext } from 'react';

import { storeContext } from 'stores/store-context';
import { NodeStore } from 'stores/nodeStore/node-store';
import { DataStore } from 'stores/dataStore/data-store';
import { ErrorStore } from 'stores/errorStore/error-store';
import { ModalStore } from 'stores/modalStore/modal-store';
import { SidePanelStore } from 'stores/sidePanelStore/side-panel-store';
import { DefStore } from 'stores/defStore/def-store';

export const useStore = <T extends DataStore | NodeStore | ModalStore | SidePanelStore | DefStore | ErrorStore>(storeType: string): T => {
  const store = useContext(storeContext);

  if (store == null) {
    throw new Error('useStore must be used inside storeContext.Provider');
  }

  if (storeType === 'data') return store.dataStore as T;
  if (storeType === 'node') return store.nodeStore as T;
  if (storeType === 'modal') return store.modalStore as T;
  if (storeType === 'sidePanel') return store.sidePanelStore as T;
  if (storeType === 'def') return store.defStore as T;
  if (storeType === 'error') return store.errorStore as T;

  throw new Error('useStore must be used with a valid store type');
};
