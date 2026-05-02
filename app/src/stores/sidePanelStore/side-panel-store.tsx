import type { ElementType, ReactElement } from 'react';
import { action, makeObservable, observable } from 'mobx';

import { getDevPreservedStore } from '../dev-preserved-store';

type SidePanelOptions = {
  contentId: string | null;
  isVisible: boolean;
  title: string | ReactElement;
  width: string;
  props: object;
};

const defaultSidePanelWidth = '31rem';

class SidePanelStore {
  panel: ElementType | ReactElement | null = null;
  options: SidePanelOptions = observable.object(
    {
      contentId: null,
      isVisible: false,
      title: '',
      width: defaultSidePanelWidth,
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
      setWidth: action,
      resetWidth: action,
      closePanel: action,
      reset: action,
    });
  }

  setPanelContent(PanelContent: ElementType, props = {}, title: string | ReactElement = '', show = true, contentId: string | null = null): void {
    this.panelVersion += 1;
    this.panel = <PanelContent key={`side-panel-${this.panelVersion}`} {...props} />;
    this.options = observable.object(
      {
        contentId,
        isVisible: show,
        title,
        width: this.options.width || defaultSidePanelWidth,
        props,
      },
      {},
      { deep: false },
    );
  }

  setWidth(width: string): void {
    this.options.width = width;
  }

  resetWidth(): void {
    this.options.width = defaultSidePanelWidth;
  }

  closePanel = (): void => {
    this.reset();
  };

  reset = (): void => {
    this.options.isVisible = false;
  };

  isPanelVisible(contentId: string): boolean {
    return this.options.isVisible && this.options.contentId === contentId;
  }
}

export const sidePanelStore = getDevPreservedStore('__conversetekSidePanelStore', () => new SidePanelStore(), SidePanelStore.prototype);

export { SidePanelStore };
