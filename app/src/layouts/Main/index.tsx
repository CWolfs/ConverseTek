import React, { ReactElement } from 'react';
import PropTypes from 'prop-types';
import { observer } from 'mobx-react';
import { Switch, Route } from 'react-router-dom';

import Conversations from '../../containers/Conversations';
import GlobalModal from '../../containers/GlobalModal';

import Header from '../../containers/Header';
import Footer from '../../containers/Footer';

import './Main.css';

const Layout = ({ children }): ReactElement => (
  <div className="main">
    <div className="main__content">
      <Header />
      <div className="main__children">
        <Switch>
          <Route exact path="/(|index.html)" component={Conversations} />
          <Route exact path="/test" component={() => <div>Test</div>} />
        </Switch>
        {children}
      </div>
      <Footer />
      <GlobalModal />
    </div>
  </div>
);

Layout.defaultProps = {
  children: undefined,
};

Layout.propTypes = {
  children: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.node), PropTypes.node]),
};

export default observer(Layout);
