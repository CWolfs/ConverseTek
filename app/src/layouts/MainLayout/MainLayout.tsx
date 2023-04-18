import React from 'react';
import { observer } from 'mobx-react';
import { Routes, Route } from 'react-router-dom';

import { Conversations } from '../../containers/Conversations';
import { GlobalModal } from '../../containers/GlobalModal';

import { Header } from '../../containers/Header';
import { Footer } from '../../containers/Footer';

import './Main.css';

const MainLayout = (): JSX.Element => (
  <div className="main">
    <div className="main__content">
      <Header />
      <div className="main__children">
        <Routes>
          <Route path={`${__INITIAL_ROUTE_PATH__}`} element={<Conversations />} />
          <Route path="/test" element={<div>Test area</div>} />
        </Routes>
      </div>
      <Footer />
      <GlobalModal />
    </div>
  </div>
);

export const ObservingMainLayout = observer(MainLayout);
