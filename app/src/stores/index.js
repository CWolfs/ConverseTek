import localeStore from './localeStore';
import dataStore from './dataStore';
import nodeStore from './nodeStore';
import modalStore from './modalStore';
import errorStore from './errorStore';

const stores = {
  locale: localeStore.localeStore,
  localeStore,
  dataStore,
  nodeStore,
  modalStore,
  errorStore,
};

export default stores;
