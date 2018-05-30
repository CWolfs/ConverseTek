import React from 'react';
import PropTypes from 'prop-types';
import { injectIntl } from 'react-intl';
import { observer, inject } from 'mobx-react';
import { Switch, Route } from 'react-router-dom';

import Conversations from '../../containers/Conversations';

import Header from '../../containers/Header';
import Footer from '../../containers/Footer';

import './Main.css';

const Layout = ({ children }) => (
  <div className="main">
    <div className="main__content">
      <Header />
      <div className="main__children">
        <Switch>
          <Route exact path="/(|index.html)" component={Conversations} />
          <Route exact path="/test" component={() => (<div>Test</div>)} />
        </Switch>
        {children}
      </div>
      <Footer />
    </div>
  </div>
);

Layout.defaultProps = {
  children: undefined,
};

Layout.propTypes = {
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node,
  ]),
};

export default inject('locale')(injectIntl(observer(Layout)));
