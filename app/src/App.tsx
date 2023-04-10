import React from 'react';
import { Route, BrowserRouter as Router } from 'react-router-dom';
import { Provider, observer } from 'mobx-react';

import stores from './stores';

import Main from './layouts/Main';

import './css/styles.css';

const App = () => (
  <Provider {...stores}>
    <Router>
      <Route component={Main} />
    </Router>
  </Provider>
);

export default observer(App);
