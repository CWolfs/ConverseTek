import { dataStore } from './dataStore';
import { nodeStore } from './nodeStore';
import { modalStore } from './modalStore';
import { defStore } from './defStore';
import { errorStore } from './errorStore';

// TODO: Add StoreTypes
const stores = {
  dataStore,
  nodeStore,
  modalStore,
  defStore,
  errorStore,
};

export * from './dataStore';
export * from './nodeStore';
export * from './modalStore';
export * from './defStore';
export * from './errorStore';

export default stores;
