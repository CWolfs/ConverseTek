import React, { Component } from 'react';
import { Route, BrowserRouter as Router } from 'react-router-dom';
import { Provider, observer } from 'mobx-react';

import stores from './stores';

import Main from './layouts/Main';

import './css/styles.css';

class App extends Component {
  render() {
    return (
      <Provider {...stores}>
        <Router>
          <Route component={Main} />
        </Router>
      </Provider>
    );
  }
}

export default observer(App);
