import React, { useRef, MouseEvent } from 'react';
import { observer } from 'mobx-react';
import { Button, Icon, Collapse, Popconfirm } from 'antd';
import classnames from 'classnames';
import remove from 'lodash.remove';

import 'react-custom-scroll/dist/customScroll.css';

import { ViewableLogic } from 'components/ViewableLogic';
import { EditableLogic } from 'components/EditableLogic';
import { useStore } from 'hooks/useStore';
import { NodeStore } from 'stores/nodeStore/node-store';
import { DefStore } from 'stores/defStore/def-store';
import { NodeLinkType } from 'types/NodeLinkType';
import { OperationCallType } from 'types/OperationCallType';

import './ConversationConditions.css';

const { Panel } = Collapse;

function ConversationConditions({ node }: { node: NodeLinkType }) {
  const nodeStore = useStore<NodeStore>('node');
  const defStore = useStore<DefStore>('def');

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

  const onDeleteCondition = (event: MouseEvent, index: number) => {
    if (!conditions || !conditions.ops) return;

    remove(conditions.ops, (value, i) => i === index);
    if (conditions.ops.length <= 0) nodeStore.setNodeConditions(node, null);

    event.stopPropagation();
  };

  const renderPanel = (condition: OperationCallType, index: number) => {
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
          onConfirm={(event: MouseEvent) => onDeleteCondition(event, index)}
          okText="Yes"
          cancelText="No"
        >
          <Button
            size="small"
            type="caution"
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

export const ObservingConversationConditions = observer(ConversationConditions);