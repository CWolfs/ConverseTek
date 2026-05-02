import type { ElementType, ReactElement } from 'react';
import { action, makeObservable, observable } from 'mobx';

import { getDevPreservedStore } from '../dev-preserved-store';

type SidePanelOptions = {
  isVisible: boolean;
  title: string | ReactElement;
  width: string;
  props: object;
};

class SidePanelStore {
  panel: ElementType | ReactElement | null = null;
  options: SidePanelOptions = observable.object(
    {
      isVisible: false,
      title: '',
      width: '31rem',
      props: {},
    },
    {},
    { deep: false },
  );
  private panelVersion = 0;

  constructor() {
    makeObservable(this, {
      panel: observable.ref,
      options: observable.shallow,

      setPanelContent: action,
      closePanel: action,
      reset: action,
    });
  }

  setPanelContent(PanelContent: ElementType, props = {}, title: string | ReactElement = '', show = true): void {
    this.panelVersion += 1;
    this.panel = <PanelContent key={`side-panel-${this.panelVersion}`} {...props} />;
    this.options = observable.object(
      {
        isVisible: show,
        title,
        width: '31rem',
        props,
      },
      {},
      { deep: false },
    );
  }

  closePanel = (): void => {
    this.reset();
  };

  reset = (): void => {
    this.options.isVisible = false;
  };
}

export const sidePanelStore = getDevPreservedStore('__conversetekSidePanelStore', () => new SidePanelStore(), SidePanelStore.prototype);

export { SidePanelStore };
