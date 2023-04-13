import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import { observer } from 'mobx-react';
import { Button, Icon, Collapse, Popconfirm } from 'antd';
import classnames from 'classnames';
import remove from 'lodash.remove';

import 'react-custom-scroll/dist/customScroll.css';

import { ViewableLogic } from 'components/ViewableLogic';
import { EditableLogic } from 'components/EditableLogic';
import { useStore } from 'hooks/useStore';

import './ConversationConditions.css';

const { Panel } = Collapse;

function ConversationConditions({ node }) {
  const nodeStore = useStore('node');
  const defStore = useStore('def');

  const dataSize = useRef(0);
  const { conditions } = node;

  const onAddCondition = () => {
    const newCondition = {
      functionName: 'Evaluate Tag for Commander',
      args: [],
    };
    defStore.setOperation(newCondition, newCondition.functionName);

    if (conditions) {
      nodeStore.addNodeCondition(node, newCondition);
    } else {
      nodeStore.setNodeConditions(node, [newCondition]);
    }
  };

  const onDeleteCondition = (event, index) => {
    remove(conditions.ops, (value, i) => i === index);
    if (conditions.ops.length <= 0) nodeStore.setNodeConditions(node, null);

    event.stopPropagation();
  };

  const renderPanel = (condition, index) => {
    const key = index;

    const classes = classnames('conversation-conditions__panel', {
      first: index === 0,
      last: index === dataSize.current - 1,
    });

    const header = (
      <div className="conversation-conditions__panel-header">
        <div className="conversation-conditions__panel-header-logic">
          <ViewableLogic key={condition.functionName} logic={condition} />
        </div>
        <Popconfirm
          title="Are you sure you want to delete this condition?"
          placement="topLeft"
          onConfirm={(event) => onDeleteCondition(event, index)}
          okText="Yes"
          cancelText="No"
        >
          <Button
            size="small"
            type="caution"
            className="conversation-conditions__panel-header-delete-button"
            onClick={(event) => event.stopPropagation()}
          >
            <Icon type="delete" />
          </Button>
        </Popconfirm>
      </div>
    );

    return (
      <Panel key={key} className={classes} header={header}>
        <EditableLogic key={condition.functionName} logic={condition} category="primary" scope="condition" />
      </Panel>
    );
  };

  const displayConditions = conditions === null ? [] : conditions.ops;
  dataSize.current = displayConditions.length;
  const height = window.document.getElementsByClassName('conversation-editor__details')[0].clientHeight - 22;

  return (
    <div className="conversation-conditions" style={{ height }}>
      <Collapse>{displayConditions.map((condition, index) => renderPanel(condition, index))}</Collapse>
      <div className="conversation-conditions__buttons">
        <Button type="secondary" size="small" onClick={onAddCondition}>
          <Icon type="plus" />
        </Button>
      </div>
    </div>
  );
}

ConversationConditions.propTypes = {
  node: PropTypes.object.isRequired,
};

export const ObservingConversationConditions = observer(ConversationConditions);
