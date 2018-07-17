import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button } from 'antd';

import './ToggleEditable.css';

class ToggleEditable extends Component {
  constructor(props) {
    super(props);

    this.state = {
      editable: false,
    };
  }

  renderFirstChild() {
    const { children } = this.props;
    return children[0];
  }

  renderSecondChild() {
    const { children } = this.props;
    return children[1];
  }

  render() {
    const { editable } = this.state;
    const content = (editable) ? this.renderSecondChild() : this.renderFirstChild();

    return (
      <div className="toggle-editable">
        <div className="toggle-editable__content">
          { content }
        </div>
        <div className="toggle-editable__controls">
          <Button />
        </div>
      </div>
    );
  }
}

ToggleEditable.propTypes = {
  children: PropTypes.node.isRequired,
};

export default ToggleEditable;
