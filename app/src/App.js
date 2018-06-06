import React, { Component } from 'react';
import { Route, BrowserRouter as Router } from 'react-router-dom';
import { Provider, observer } from 'mobx-react';
import { MobxIntlProvider } from 'mobx-react-intl';

import stores from './stores';

import Main from './layouts/Main';

import './css/styles.css';

@observer
export default class App extends Component {
  render() {
    return (
      <Provider {...stores}>
        <MobxIntlProvider>
          <Router>
            <Route component={Main} />
          </Router>
        </MobxIntlProvider>
      </Provider>
    );
  }
}
