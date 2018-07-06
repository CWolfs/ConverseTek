import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { observer, inject } from 'mobx-react';
import { Button, Icon, Collapse, Popconfirm } from 'antd';
import classnames from 'classnames';
import remove from 'lodash.remove';

import 'react-custom-scroll/dist/customScroll.css';

import ViewableLogic from '../../components/ViewableLogic';
import EditableLogic from '../../components/EditableLogic';

import './ConversationConditions.css';

const { Panel } = Collapse;

@observer
class ConversationConditions extends Component {
  constructor(props) {
    super(props);

    this.dataSize = 0;

    this.renderPanel = this.renderPanel.bind(this);
    this.resize = this.resize.bind(this);
    this.onDelete = this.onDelete.bind(this);
  }

  componentDidMount() {
    window.addEventListener('resize', this.resize);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.resize);
  }

  onDelete(event, index) {
    const { nodeStore, node } = this.props;
    const { conditions } = node;
    remove(conditions.ops, (value, i) => i === index);
    if (conditions.ops.length <= 0) node.conditions = null;

    nodeStore.setRebuild(true);

    event.stopPropagation();
  }

  resize() {
    this.forceUpdate();
  }

  renderPanel(condition, index) {
    const key = index;

    const classes = classnames(
      'conversation-conditions__panel',
      {
        first: index === 0,
        last: index === (this.dataSize - 1),
      },
    );

    const header = (
      <div className="conversation-conditions__panel-header">
        <div className="conversation-conditions__panel-header-logic">
          <ViewableLogic logic={condition} />
        </div>
        <Popconfirm
          title="Are you sure you want to delete this condition?"
          placement="topLeft"
          onConfirm={event => this.onDelete(event, index)}
          okText="Yes"
          cancelText="No"
        >
          <Button
            size="small"
            type="caution"
            className="conversation-conditions__panel-header-delete-button"
            onClick={event => event.stopPropagation()}
          >
            <Icon type="delete" />
          </Button>
        </Popconfirm>
      </div>);

    return (
      <Panel key={key} className={classes} header={header}>
        <EditableLogic logic={condition} category="primary" />
      </Panel>
    );
  }

  render() {
    const { node } = this.props;
    let { conditions } = node;
    if (conditions === null) {
      conditions = [];
    } else {
      conditions = conditions.ops;
    }

    this.dataSize = conditions.length;
    const height = window.document.getElementsByClassName('conversation-editor__details')[0].clientHeight - 22;

    return (
      <div className="conversation-conditions" style={{ height }}>
        <Collapse>
          {conditions.map((condition, index) => this.renderPanel(condition, index))}
        </Collapse>
        <div className="conversation-conditions__buttons">
          <Button
            type="secondary"
            size="small"
          >
            <Icon type="plus" />
          </Button>
        </div>
      </div>
    );
  }
}

ConversationConditions.propTypes = {
  nodeStore: PropTypes.object.isRequired,
  node: PropTypes.object.isRequired,
};

export default inject('nodeStore')(ConversationConditions);
