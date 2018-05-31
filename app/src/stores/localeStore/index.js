import { decorate, observable, computed, action } from 'mobx';

import { LocaleStore } from 'mobx-react-intl';
import { addLocaleData } from 'react-intl';
import enLocaleReact from 'react-intl/locale-data/en';
import deLocaleReact from 'react-intl/locale-data/de';
import enGBLocale from '../../locales/en-GB';
import deDELocale from '../../locales/de-DE';

class AppLocaleStore {
  @observable localeStore;
  @observable localeKey = 'en-GB';

  constructor(store) {
    this.store = store;
    addLocaleData([...deLocaleReact, ...enLocaleReact]);
    this.setTranslations();

    // Internationalization
    this.localeStore = new LocaleStore(this.localeKey, this.translations);
  }

  setTranslations() {
    if (this.localeKey === 'en-GB') {
      this.translations = { 'en-GB': enGBLocale };
    } else if (this.localeKey === 'de-DE') {
      this.translations = { 'de-DE': deDELocale };
    }
  }

  @computed get locale() {
    return this.localeStore;
  }

  @action changeLocale(localeKey) {
    this.localeKey = localeKey;
    this.setTranslations();
    this.localeStore = new LocaleStore(localeKey, this.translations);
  }
}

const localeStore = new AppLocaleStore();

export default localeStore;
export { AppLocaleStore };
