import React, { useRef, MouseEvent, useEffect } from 'react';
import PropTypes from 'prop-types';
import { observer } from 'mobx-react';
import { Button, Collapse, Popconfirm } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import classnames from 'classnames';
import { useUpdate } from 'ahooks';

import { ViewableLogic } from 'components/ViewableLogic';
import { EditableLogic } from 'components/EditableLogic';
import { useStore } from 'hooks/useStore';
import { NodeStore } from 'stores/nodeStore/node-store';
import { DefStore } from 'stores/defStore/def-store';
import { PromptNodeType, ElementNodeType, OperationCallType } from 'types';

import './ConversationActions.css';

type CollapseItems = NonNullable<React.ComponentProps<typeof Collapse>['items']>;

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

  const onDeleteAction = (event: MouseEvent | undefined, index: number) => {
    nodeStore.removeNodeAction(node, index);
    event?.stopPropagation();
  };

  const renderPanel = (action: OperationCallType, index: number): CollapseItems[number] => {
    const key = `${node.idRef.id}.${index}`;

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
          onConfirm={(event) => onDeleteAction(event, index)}
          okText="Yes"
          cancelText="No"
        >
          <Button
            size="small"
            type="primary"
            danger
            className="conversation-actions__panel-header-delete-button"
            onClick={(event: MouseEvent) => event.stopPropagation()}
          >
            <DeleteOutlined />
          </Button>
        </Popconfirm>
      </div>
    );

    return {
      children: <EditableLogic key={action.functionName} logic={action} category="primary" scope="action" />,
      className: classes,
      key,
      label: header,
    };
  };

  const displayActions = actions === null || !actions.ops ? [] : actions.ops;
  dataSize.current = displayActions.length;

  return (
    <div className="conversation-actions">
      <Collapse items={displayActions.map((action, index) => renderPanel(action, index))} />
      <div className="conversation-actions__buttons">
        <Button className="button-secondary" type="primary" size="small" onClick={onAddAction}>
          <PlusOutlined />
        </Button>
      </div>
    </div>
  );
}

ConversationActions.propTypes = {
  node: PropTypes.object.isRequired,
};

export const ObservingConversationActions = observer(ConversationActions);
