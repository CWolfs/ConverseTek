import { useEffect } from 'react';
import { Routes, Route, BrowserRouter as Router } from 'react-router-dom';
import { Provider, observer } from 'mobx-react';
import { App as AntdApp, ConfigProvider } from 'antd';

import stores from './stores';
import { storeContext } from './stores/store-context';
import { DependencyStatusType } from 'types';
import { getDependencyStatus, getColourConfig } from 'services/api';
import { ModalConfirmation } from 'components/Modals/ModalConfirmation';
import { converseTekTheme } from './theme/conversetek-theme';

import { MainLayout } from './layouts/MainLayout';

import 'antd/dist/reset.css';
import './css/styles.css';

const App = () => {
  const { modalStore } = stores;

  useEffect(() => {
    void getDependencyStatus().then((dependencyStatus: DependencyStatusType): void => {
      if (dependencyStatus.status === 'error') {
        const message = `You are missing dependencies: ${dependencyStatus.missingDependencies.join(
          ', ',
        )}. Copy them from your 'BATTLETECH/BattleTech_Data/Managed' folder into the ConverseTek folder.`;

        const modalTitle = `Missing Dependencies`;
        modalStore.setModelContent(
          ModalConfirmation,
          {
            type: 'warning',
            title: modalTitle,
            body: message,
            width: '30rem',
            closable: false,
          },
          'global1',
        );
      }
    });

    void getColourConfig();
  }, []);

  return (
    <ConfigProvider
      modal={{
        mask: {
          blur: false,
        },
      }}
      theme={converseTekTheme}
    >
      <AntdApp>
        <storeContext.Provider value={stores}>
          <Provider {...stores}>
            <Router>
              <Routes>
                <Route path="/*" element={<MainLayout />} />
              </Routes>
            </Router>
          </Provider>
        </storeContext.Provider>
      </AntdApp>
    </ConfigProvider>
  );
};

export default observer(App);
