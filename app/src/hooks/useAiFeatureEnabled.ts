import { useEffect, useState } from 'react';

import { AI_SETTINGS_UPDATED_EVENT, getAiSettings } from 'services/api';
import { AiSettingsType } from 'types';

export function useAiFeatureEnabled(defaultEnabled = true): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let isMounted = true;

    void getAiSettings()
      .then((settings) => {
        if (isMounted) setEnabled(settings.enabled !== false);
      })
      .catch(() => {
        if (isMounted) setEnabled(defaultEnabled);
      });

    const onSettingsUpdated = (event: Event) => {
      const settingsEvent = event as CustomEvent<AiSettingsType>;
      if (settingsEvent.detail) {
        setEnabled(settingsEvent.detail.enabled !== false);
      }
    };

    window.addEventListener(AI_SETTINGS_UPDATED_EVENT, onSettingsUpdated);

    return () => {
      isMounted = false;
      window.removeEventListener(AI_SETTINGS_UPDATED_EVENT, onSettingsUpdated);
    };
  }, [defaultEnabled]);

  return enabled;
}
