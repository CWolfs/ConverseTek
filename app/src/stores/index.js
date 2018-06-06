import localeStore from './localeStore';
import dataStore from './dataStore';
import nodeStore from './nodeStore';
import errorStore from './errorStore';

const stores = {
  locale: localeStore.localeStore,
  localeStore,
  dataStore,
  nodeStore,
  errorStore,
};

export default stores;
