import React, { useRef, MouseEvent, useEffect } from 'react';
import PropTypes from 'prop-types';
import { observer } from 'mobx-react';
import { Button, Icon, Collapse, Popconfirm } from 'antd';
import classnames from 'classnames';
import remove from 'lodash.remove';
import { useUpdate } from 'ahooks';

import 'react-custom-scroll/dist/customScroll.css';

import { ViewableLogic } from 'components/ViewableLogic';
import { EditableLogic } from 'components/EditableLogic';
import { useStore } from 'hooks/useStore';
import { NodeStore } from 'stores/nodeStore/node-store';
import { DefStore } from 'stores/defStore/def-store';
import { PromptNodeType, ElementNodeType, OperationCallType } from 'types';

import './ConversationActions.css';

const { Panel } = Collapse;

function ConversationActions({ node }: { node: PromptNodeType | ElementNodeType }) {
  const nodeStore = useStore<NodeStore>('node');
  const defStore = useStore<DefStore>('def');
  const dataSize = useRef(0);
  const update = useUpdate();

  const { actions } = node;

  // onMount - control the resize
  useEffect(() => {
    const handleResize = () => {
      update();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const onAddAction = () => {
    const newAction: OperationCallType = {
      functionName: 'Play BattleTech Audio Event',
      args: [],
    };
    defStore.setOperation(newAction, newAction.functionName);

    if (actions) {
      nodeStore.addNodeAction(node, newAction);
    } else {
      nodeStore.setNodeActions(node, [newAction]);
    }
  };

  const onDeleteAction = (event: MouseEvent, index: number) => {
    if (!actions || !actions.ops) return;

    remove(actions.ops, (value, i) => i === index);
    if (actions.ops.length <= 0) nodeStore.setNodeActions(node, null);

    event.stopPropagation();
  };

  const renderPanel = (action: OperationCallType, index: number) => {
    const key = index;

    const classes = classnames('conversation-actions__panel', {
      first: index === 0,
      last: index === dataSize.current - 1,
    });

    const header = (
      <div className="conversation-actions__panel-header">
        <div className="conversation-actions__panel-header-logic">
          <ViewableLogic key={action.functionName} logic={action} />
        </div>
        <Popconfirm
          title="Are you sure you want to delete this action?"
          placement="topLeft"
          onConfirm={(event: MouseEvent) => onDeleteAction(event, index)}
          okText="Yes"
          cancelText="No"
        >
          <Button
            size="small"
            type="caution"
            className="conversation-actions__panel-header-delete-button"
            onClick={(event: MouseEvent) => event.stopPropagation()}
          >
            <Icon type="delete" />
          </Button>
        </Popconfirm>
      </div>
    );

    return (
      <Panel key={`${key}`} className={classes} header={header}>
        <EditableLogic key={action.functionName} logic={action} category="primary" scope="action" />
      </Panel>
    );
  };

  const displayActions = actions === null || !actions.ops ? [] : actions.ops;
  dataSize.current = displayActions.length;
  const height = window.document.getElementsByClassName('conversation-editor__details')[0].clientHeight - 22;

  return (
    <div className="conversation-actions" style={{ height }}>
      <Collapse>{displayActions.map((condition, index) => renderPanel(condition, index))}</Collapse>
      <div className="conversation-actions__buttons">
        <Button className="button-secondary" size="small" onClick={onAddAction}>
          <Icon type="plus" />
        </Button>
      </div>
    </div>
  );
}

ConversationActions.propTypes = {
  node: PropTypes.object.isRequired,
};

export const ObservingConversationActions = observer(ConversationActions);
