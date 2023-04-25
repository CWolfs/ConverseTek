import React, { createContext, useEffect } from 'react';
import { Routes, Route, BrowserRouter as Router } from 'react-router-dom';
import { Provider, observer } from 'mobx-react';

import stores from './stores';
import { DependencyStatusType } from 'types';
import { getDependencyStatus } from 'services/api';
import { useStore } from 'hooks/useStore';
import { ModalStore } from 'stores/modalStore/modal-store';
import { ModalConfirmation } from 'components/ModalConfirmation';

import { MainLayout } from './layouts/MainLayout';

import './css/styles.css';

export const storeContext = createContext(stores);

const App = () => {
  const modalStore = useStore<ModalStore>('modal');

  useEffect(() => {
    void getDependencyStatus().then((dependencyStatus: DependencyStatusType): void => {
      if (dependencyStatus.status === 'error') {
        const message = `You are missing dependencies: ${dependencyStatus.missingDependencies.join(
          ', ',
        )}. Copy them from your 'BATTLETECH/BattleTech_Data/Managed' into the ConverseTek folder.`;

        const modalTitle = `Missing Dependencies`;
        modalStore.setModelContent(ModalConfirmation, {
          type: 'warning',
          title: modalTitle,
          body: message,
          width: '30rem',
          closable: false,
        });
      }
    });
  }, []);

  return (
    <Provider {...stores}>
      <Router>
        <Routes>
          <Route path="/*" element={<MainLayout />} />
        </Routes>
      </Router>
    </Provider>
  );
};

export default observer(App);
