import React from 'react';
import { observer } from 'mobx-react';
import { Switch, Route } from 'react-router-dom';

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
        <Switch>
          <Route exact path="/(|index.html)">
            <Conversations />
          </Route>
          <Route exact path="/test" component={() => <div>Test</div>} />
        </Switch>
      </div>
      <Footer />
      <GlobalModal />
    </div>
  </div>
);

export const ObservingMainLayout = observer(MainLayout);
