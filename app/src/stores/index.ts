import { dataStore } from './dataStore';
import { nodeStore } from './nodeStore';
import { modalStore } from './modalStore';
import { sidePanelStore } from './sidePanelStore';
import { defStore } from './defStore';
import { errorStore } from './errorStore';

// TODO: Add StoreTypes
const stores = {
  dataStore,
  nodeStore,
  modalStore,
  sidePanelStore,
  defStore,
  errorStore,
};

export * from './dataStore';
export * from './nodeStore';
export * from './modalStore';
export * from './sidePanelStore';
export * from './defStore';
export * from './errorStore';

export default stores;
