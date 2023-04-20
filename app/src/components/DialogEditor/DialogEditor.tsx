/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */
import React, { useState, useEffect, useRef, MouseEvent } from 'react';
import PropTypes from 'prop-types';
import { observer } from 'mobx-react';
import SortableTree from 'react-sortable-tree';
import { useContextMenu } from 'react-contexify';

import 'react-sortable-tree/style.css';

import { NodeStore } from 'stores/nodeStore/node-store';
import { ConversationAssetType } from 'types/ConversationAssetType';

import { useStore } from 'hooks/useStore';
import { ElementNodeType } from 'types/ElementNodeType';
import { detectType, isNodeType } from 'utils/node-utils';

import { ConverseTekNodeRenderer } from './ConverseTekNodeRenderer';
import { DialogEditorContextMenu } from '../DialogEditorContextMenu';

import './DialogEditor.css';

export type OnNodeContextMenuProps = {
  event: MouseEvent<HTMLDivElement>;
  contextMenuId: string;
  type: 'node' | 'response' | 'root' | 'link';
  parentId: string;
};

function buildTreeData(nodeStore: NodeStore, conversationAsset: ConversationAssetType) {
  const data = [
    {
      title: 'Root',
      id: '0',
      children: nodeStore.getChildrenFromRoots(conversationAsset.conversation.roots),
      expanded: true,
      canDrag: false,
    },
  ];

  return data;
}

function DialogEditor({ conversationAsset, rebuild }: { conversationAsset: ConversationAssetType; rebuild: boolean }) {
  const nodeStore = useStore<NodeStore>('node');

  const [treeData, setTreeData] = useState<object[] | null>(null);
  const [treeWidth, setTreeWidth] = useState(0);
  const [isContextMenuVisible, setIsContextMenuVisible] = useState(false);
  const treeElement = useRef<HTMLDivElement>(null);
  const { show } = useContextMenu({
    id: 'dialog-context-menu',
  });

  const activeNodeId = nodeStore.getActiveNodeId();

  const onMove = (nodeContainer: RSTNodeOnMoveContainer) => {
    const { node, nextParentNode } = nodeContainer;
    const { id: nodeId, type: nodeType, parentId: nodeParentId } = node;
    const { id: nextParentNodeId, children: parentChildren } = nextParentNode;

    const { isRoot, isNode, isResponse } = detectType(nodeType);

    if (isRoot) {
      const rootIds = parentChildren.map((child) => child.id);
      nodeStore.setRootNodesByIds(rootIds);
    } else if (isNode) {
      if (nodeId == null || nodeParentId == null) return;

      nodeStore.movePromptNode(nodeId, nextParentNodeId, nodeParentId);
    } else if (isResponse) {
      if (nodeId == null) return;

      nodeStore.moveResponseNode(nodeId, nextParentNodeId, parentChildren);
    }
  };

  const resize = () => {
    if (treeElement.current) {
      const calculatedTreeWidth = treeElement.current.clientWidth;
      setTreeWidth(calculatedTreeWidth);
    }
  };

  const canDrop = (nodeContainer: RSTNodeCanDropContainer) => {
    const { nextParent, node } = nodeContainer;

    // GUARD - Don't allow drop at the very top of the tree
    if (nextParent === null) return false;

    const { type: nodeType, parentId: nodeParentId } = node;
    const { isRoot, isNode, isResponse } = detectType(nodeType);

    const { type: nextParentType, id: parentId } = nextParent;
    if (parentId == null) return false;

    let allowDrop = true;
    const nextNode = nodeStore.getNode(parentId);

    // Don't allow nodes to be moved under the same type
    if (nodeType === nextParentType) allowDrop = false;

    // Only allow roots to be moved around under the top level node
    if (allowDrop) allowDrop = (isRoot && nextParent.id === '0') || ((isNode || isResponse) && nextParent.id !== '0');

    // Only allow dragging within the same parent for roots and responses,
    // for nodes, only allow if the target response is empty
    if (allowDrop) {
      if (isRoot) {
        allowDrop = parentId === null || parentId === '0';
      } else if (isResponse) {
        if (nextNode != null) {
          allowDrop = isNodeType(nextNode);
        } else {
          allowDrop = false;
        }
      } else if (isNode) {
        const parent = nodeStore.getNode(parentId) as ElementNodeType;
        if (parent == null) {
          console.error(`Checking drop target Response '${parentId}' but it is null`);
          return false;
        }

        const { nextNodeIndex } = parent;
        if (nextNodeIndex !== -1) allowDrop = false;
      }
    }

    return allowDrop;
  };

  const onClicked = (event: MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    if (target.className === 'rst__node' || target.className === 'rst__lineBlock') {
      nodeStore.clearActiveNode();
    }
  };

  const onNodeContextMenu = ({ event, contextMenuId, type, parentId }: OnNodeContextMenuProps) => {
    show({ event, props: { id: contextMenuId, type, parentId } });
  };

  const onNodeContextMenuVisibilityChange = (isVisible: boolean) => {
    setIsContextMenuVisible(isVisible);
  };

  // onMount
  useEffect(() => {
    nodeStore.init(conversationAsset);
    setTreeData(buildTreeData(nodeStore, conversationAsset));

    window.addEventListener('resize', resize);

    if (treeElement.current) {
      const calculatedTreeWidth = treeElement.current.clientWidth;
      setTreeWidth(calculatedTreeWidth);
    }

    return () => {
      window.removeEventListener('resize', resize);
    };
  }, []);

  // OnConversationChange or rebuild
  useEffect(() => {
    nodeStore.init(conversationAsset);
    setTreeData(buildTreeData(nodeStore, conversationAsset));
    setIsContextMenuVisible(false);
  }, [conversationAsset, rebuild]);

  // On every update
  useEffect(() => {
    if (treeElement.current) {
      const calculatedTreeWidth = treeElement.current.clientWidth;
      if (treeWidth !== calculatedTreeWidth) resize();
    }
  });

  if (treeData === null) return null;

  return (
    <div className="dialog-editor">
      <div className="dialog-editor__tree" ref={treeElement} onClick={onClicked}>
        <DialogEditorContextMenu id="dialog-context-menu" onVisibilityChange={onNodeContextMenuVisibilityChange} />
        <SortableTree
          treeData={treeData}
          onChange={(data: object[]) => setTreeData(data)}
          getNodeKey={({ node, treeIndex }: { node: RSTNode; treeIndex: number }) => {
            if (node.treeIndex !== treeIndex) {
              // eslint-disable-next-line no-param-reassign
              node.treeIndex = treeIndex;
            }
            if (!node.id) return treeIndex;

            nodeStore.addNodeIdAndTreeIndexPair(node.id, treeIndex);
            return node.id;
          }}
          rowHeight={40}
          canDrag={(nodeContainer: RSTNodeCanDragContainer) => !(nodeContainer.node.id === '0')}
          canDrop={canDrop}
          onMoveNode={onMove}
          generateNodeProps={() => ({
            nodeStore,
            activeNodeId,
            onNodeContextMenu,
            isContextMenuVisible,
          })}
          nodeContentRenderer={(props: any) => <ConverseTekNodeRenderer {...props} />}
          reactVirtualizedListProps={{
            width: treeWidth,
          }}
        />
      </div>
    </div>
  );
}

DialogEditor.defaultProps = {
  rebuild: false,
};

DialogEditor.propTypes = {
  conversationAsset: PropTypes.object.isRequired,
  rebuild: PropTypes.bool,
};

export const ObservingDialogueEditor = observer(DialogEditor);
