import localeStore from './localeStore';
import dataStore from './dataStore';
import errorStore from './errorStore';

const stores = {
  locale: localeStore.localeStore,
  localeStore,
  dataStore,
  errorStore,
};

export default stores;
