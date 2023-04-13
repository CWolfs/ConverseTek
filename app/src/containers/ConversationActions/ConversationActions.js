import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import { observer, inject } from 'mobx-react';
import { Button, Icon, Collapse, Popconfirm } from 'antd';
import classnames from 'classnames';
import remove from 'lodash.remove';

import 'react-custom-scroll/dist/customScroll.css';

import { ViewableLogic } from '../../components/ViewableLogic';
import { EditableLogic } from '../../components/EditableLogic';

import './ConversationActions.css';

const { Panel } = Collapse;

function ConversationActions({ nodeStore, defStore, node }) {
  const dataSize = useRef(0);
  const { actions } = node;

  const onAddAction = () => {
    const newCondition = {
      functionName: 'Play BattleTech Audio Event',
      args: [],
    };
    defStore.setOperation(newCondition, newCondition.functionName);

    if (actions) {
      nodeStore.addNodeAction(node, newCondition);
    } else {
      nodeStore.setNodeActions(node, [newCondition]);
    }
  };

  const onDeleteAction = (event, index) => {
    remove(actions.ops, (value, i) => i === index);
    if (actions.ops.length <= 0) nodeStore.setNodeActions(node, null);

    event.stopPropagation();
  };

  const renderPanel = (condition, index) => {
    const key = index;

    const classes = classnames('conversation-actions__panel', {
      first: index === 0,
      last: index === dataSize.current - 1,
    });

    const header = (
      <div className="conversation-actions__panel-header">
        <div className="conversation-actions__panel-header-logic">
          <ViewableLogic key={condition.functionName} logic={condition} />
        </div>
        <Popconfirm
          title="Are you sure you want to delete this condition?"
          placement="topLeft"
          onConfirm={(event) => onDeleteAction(event, index)}
          okText="Yes"
          cancelText="No"
        >
          <Button
            size="small"
            type="caution"
            className="conversation-actions__panel-header-delete-button"
            onClick={(event) => event.stopPropagation()}
          >
            <Icon type="delete" />
          </Button>
        </Popconfirm>
      </div>
    );

    return (
      <Panel key={key} className={classes} header={header}>
        <EditableLogic key={condition.functionName} logic={condition} category="primary" scope="action" />
      </Panel>
    );
  };

  const displayActions = actions === null ? [] : actions.ops;
  dataSize.current = displayActions.length;
  const height = window.document.getElementsByClassName('conversation-editor__details')[0].clientHeight - 22;

  return (
    <div className="conversation-actions" style={{ height }}>
      <Collapse>{displayActions.map((condition, index) => renderPanel(condition, index))}</Collapse>
      <div className="conversation-actions__buttons">
        <Button type="secondary" size="small" onClick={onAddAction}>
          <Icon type="plus" />
        </Button>
      </div>
    </div>
  );
}

ConversationActions.propTypes = {
  node: PropTypes.object.isRequired,
  nodeStore: PropTypes.object.isRequired,
  defStore: PropTypes.object.isRequired,
};

export const ObservingConversationActions = inject('nodeStore', 'defStore')(observer(ConversationActions));
