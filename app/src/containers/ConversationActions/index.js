import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { observer, inject } from 'mobx-react';
import { Button, Icon, Collapse, Popconfirm } from 'antd';
import classnames from 'classnames';
import remove from 'lodash.remove';

import 'react-custom-scroll/dist/customScroll.css';

import ViewableLogic from '../../components/ViewableLogic';
import EditableLogic from '../../components/EditableLogic';

import './ConversationActions.css';

const { Panel } = Collapse;

@observer
class ConversationActions extends Component {
  constructor(props) {
    super(props);

    this.dataSize = 0;

    this.renderPanel = this.renderPanel.bind(this);
    this.resize = this.resize.bind(this);
    this.onAddAction = this.onAddAction.bind(this);
    this.onDeleteAction = this.onDeleteAction.bind(this);
  }

  componentDidMount() {
    window.addEventListener('resize', this.resize);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.resize);
  }

  onAddAction() {
    const { node, defStore } = this.props;
    const { actions } = node;

    const newCondition = {
      functionName: 'Play BattleTech Audio Event',
      args: [],
    };
    defStore.setOperation(newCondition, newCondition.functionName);

    if (actions) {
      actions.ops.push(newCondition);
    } else {
      node.actions = {
        ops: [newCondition],
      };
    }
  }

  onDeleteAction(event, index) {
    const { nodeStore, node } = this.props;
    const { actions } = node;
    remove(actions.ops, (value, i) => i === index);
    if (actions.ops.length <= 0) node.actions = null;

    nodeStore.setRebuild(true);

    event.stopPropagation();
  }

  resize() {
    this.forceUpdate();
  }

  renderPanel(condition, index) {
    const key = index;

    const classes = classnames(
      'conversation-actions__panel',
      {
        first: index === 0,
        last: index === (this.dataSize - 1),
      },
    );

    const header = (
      <div className="conversation-actions__panel-header">
        <div className="conversation-actions__panel-header-logic">
          <ViewableLogic key={condition.functionName} logic={condition} />
        </div>
        <Popconfirm
          title="Are you sure you want to delete this condition?"
          placement="topLeft"
          onConfirm={event => this.onDeleteAction(event, index)}
          okText="Yes"
          cancelText="No"
        >
          <Button
            size="small"
            type="caution"
            className="conversation-actions__panel-header-delete-button"
            onClick={event => event.stopPropagation()}
          >
            <Icon type="delete" />
          </Button>
        </Popconfirm>
      </div>);

    return (
      <Panel key={key} className={classes} header={header}>
        <EditableLogic
          key={condition.functionName}
          logic={condition}
          category="primary"
          scope="action"
        />
      </Panel>
    );
  }

  render() {
    const { node } = this.props;
    let { actions } = node;
    if (actions === null) {
      actions = [];
    } else {
      actions = actions.ops;
    }

    this.dataSize = actions.length;
    const height = window.document.getElementsByClassName('conversation-editor__details')[0].clientHeight - 22;

    return (
      <div className="conversation-actions" style={{ height }}>
        <Collapse>
          {actions.map((condition, index) => this.renderPanel(condition, index))}
        </Collapse>
        <div className="conversation-actions__buttons">
          <Button
            type="secondary"
            size="small"
            onClick={this.onAddAction}
          >
            <Icon type="plus" />
          </Button>
        </div>
      </div>
    );
  }
}

ConversationActions.propTypes = {
  nodeStore: PropTypes.object.isRequired,
  node: PropTypes.object.isRequired,
  defStore: PropTypes.object.isRequired,
};

export default inject('nodeStore', 'defStore')(ConversationActions);
