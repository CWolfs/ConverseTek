import React, { useRef, MouseEvent, useEffect } from 'react';
import { observer } from 'mobx-react';
import { Button, Icon, Collapse, Popconfirm } from 'antd';
import classnames from 'classnames';
import { useUpdate } from 'ahooks';

import 'react-custom-scroll/dist/customScroll.css';

import { ViewableLogic } from 'components/ViewableLogic';
import { EditableLogic } from 'components/EditableLogic';
import { useStore } from 'hooks/useStore';
import { NodeStore } from 'stores/nodeStore/node-store';
import { DefStore } from 'stores/defStore/def-store';
import { ElementNodeType, OperationCallType } from 'types';

import './ConversationConditions.css';

const { Panel } = Collapse;

function ConversationConditions({ node }: { node: ElementNodeType }) {
  const nodeStore = useStore<NodeStore>('node');
  const defStore = useStore<DefStore>('def');
  const update = useUpdate();

  const dataSize = useRef(0);
  const { conditions } = node;

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

  const onAddCondition = () => {
    const newCondition = {
      functionName: 'Evaluate Tag for Commander',
      args: [],
    };
    defStore.setOperation(newCondition, newCondition.functionName);

    if (conditions) {
      nodeStore.addNodeCondition(node, newCondition);
    } else {
      nodeStore.setElementNodeConditions(node, [newCondition]);
    }
  };

  const onDeleteCondition = (event: MouseEvent, index: number) => {
    nodeStore.removeNodeCondition(node, index);
    event.stopPropagation();
  };

  const renderPanel = (condition: OperationCallType, index: number) => {
    const key = `${node.idRef.id}.${index}`;

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
          onConfirm={(event: MouseEvent) => onDeleteCondition(event, index)}
          okText="Yes"
          cancelText="No"
        >
          <Button
            size="small"
            type="danger"
            className="conversation-conditions__panel-header-delete-button"
            onClick={(event: MouseEvent) => event.stopPropagation()}
          >
            <Icon type="delete" />
          </Button>
        </Popconfirm>
      </div>
    );

    return (
      <Panel key={`${key}`} className={classes} header={header}>
        <EditableLogic key={condition.functionName} logic={condition} category="primary" scope="condition" />
      </Panel>
    );
  };
  const displayConditions = conditions === null || !conditions.ops ? [] : conditions.ops;
  dataSize.current = displayConditions.length;

  return (
    <div className="conversation-conditions">
      <Collapse>{displayConditions.map((condition, index) => renderPanel(condition, index))}</Collapse>
      <div className="conversation-conditions__buttons">
        <Button className="button-secondary" size="small" onClick={onAddCondition}>
          <Icon type="plus" />
        </Button>
      </div>
    </div>
  );
}

export const ObservingConversationConditions = observer(ConversationConditions);
