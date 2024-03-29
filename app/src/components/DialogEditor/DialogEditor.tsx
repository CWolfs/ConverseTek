/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */
import React, { useState, useEffect, useRef, MouseEvent } from 'react';
import { observer } from 'mobx-react';
import SortableTree from 'react-sortable-tree';
import { useContextMenu } from 'react-contexify';
import { useSize } from 'ahooks';
import throttle from 'lodash/throttle';
import classnames from 'classnames';
import defer from 'lodash.defer';

import 'react-sortable-tree/style.css';

import { DataStore } from 'stores/dataStore/data-store';
import { NodeStore } from 'stores/nodeStore/node-store';
import { ConversationAssetType, ElementNodeType, PromptNodeType } from 'types';

import { useStore } from 'hooks/useStore';
import { useControlWheel } from 'hooks/useControlWheel';
import { useWindowSize } from 'hooks/useWindowSize';
import { detectType, isElementNodeType, isPromptNodeType } from 'utils/node-utils';
import { getId } from 'utils/conversation-utils';
import { toggleExpandedForAll } from 'utils/tree-data-utils';
import { collapseOrExpandBranches, collapseOtherBranches, expandFromCoreToNode } from 'utils/custom-tree-data-utils';

import { ScalableScrollbar } from 'components/ScalableScrollbar';

import { ConverseTekNodeRenderer } from './ConverseTekNodeRenderer';
import { DialogEditorContextMenu } from '../ContextMenus/DialogEditorContextMenu';

import './DialogEditor.css';

export type OnNodeContextMenuProps = {
  event: MouseEvent<HTMLDivElement>;
  contextMenuId: string;
  type: 'core' | 'isolatedcore' | 'node' | 'response' | 'root' | 'link';
  parentId: string | null;
};

function buildTreeDataFromConversation(nodeStore: NodeStore, conversationAsset: ConversationAssetType): RSTNode[] {
  const data = [
    {
      title: 'Core',
      id: '0',
      type: 'core',
      parentId: '-1',
      children: nodeStore.getChildrenFromRoots(conversationAsset.conversation.roots),
      expanded: true,
      canDrag: false,
    } as RSTNode,
  ];

  return data;
}

function buildTreeDataFromNode(nodeStore: NodeStore, node: PromptNodeType | ElementNodeType | null): RSTNode[] {
  let children: RSTNode[] = [];

  if (node != null) {
    if (isPromptNodeType(node)) {
      children = nodeStore.getChildrenFromPromptNodeIncludingSelf(node) || [];
    } else if (isElementNodeType(node)) {
      children = nodeStore.getChildrenFromElementNodeIncludingSelf(node) || [];
    }
  }

  const data = [
    {
      title: 'Isolated Core',
      id: '0',
      type: 'isolatedcore',
      parentId: '-1',
      children,
      expanded: true,
      canDrag: false,
    } as RSTNode,
  ];

  return data;
}

const zoomLevelIncrement = 0.05;

function DialogEditor({ conversationAsset, rebuild, expandAll }: { conversationAsset: ConversationAssetType; rebuild: boolean; expandAll: boolean }) {
  const dataStore = useStore<DataStore>('data');
  const nodeStore = useStore<NodeStore>('node');

  const dialogEditorRef = useRef<HTMLDivElement>(null);
  const dialogEditorSize = useSize(dialogEditorRef);

  const wholeTreeData = useRef<RSTNode[] | null>(null);
  const previousConversationId = useRef<string | null>(null);
  const activeIsolateOnNodeId = useRef<string | null>(null);

  const [treeData, setTreeData] = useState<RSTNode[] | null>(null);
  const [treeWidth, setTreeWidth] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isContextMenuVisible, setIsContextMenuVisible] = useState(false);
  const treeElement = useRef<HTMLDivElement>(null);
  const { show } = useContextMenu({
    id: 'dialog-context-menu',
  });

  const activeNodeId = nodeStore.getActiveNodeId();
  const previousNodeId = nodeStore.getPreviousActiveNodeId();
  const expandOnNodeId = nodeStore.getExpandOnNodeId();
  const collapseOnNodeId = nodeStore.getCollapseOnNodeId();
  const collapseOthersOnNodeId = nodeStore.getCollapseOthersOnNodeId();
  const expandFromCoreToNodeId = nodeStore.getExpandFromCoreToNodeId();
  const isolateOnNodeId = nodeStore.getIsolateOnNodeId();

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

    const { type: nodeType } = node;
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
          allowDrop = isPromptNodeType(nextNode);
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
    if (
      target.className === 'rst__node' ||
      target.className === 'rst__lineBlock' ||
      (target.className.includes && target.className.includes('ReactVirtualized__Grid'))
    ) {
      nodeStore.clearActiveNode();
    }
  };

  const onNodeContextMenu = ({ event, contextMenuId, type, parentId }: OnNodeContextMenuProps) => {
    show({ event, props: { id: contextMenuId, type, parentId } });
  };

  const onNodeContextMenuVisibilityChange = (isVisible: boolean) => {
    setIsContextMenuVisible(isVisible);
  };

  const onControlWheel = (zoomIn: boolean) => {
    setZoomLevel((oldZoomLevel): number => {
      let newZoomLevel = zoomIn ? oldZoomLevel + zoomLevelIncrement : oldZoomLevel - zoomLevelIncrement;

      if (newZoomLevel < 0.2) {
        newZoomLevel = 0.2;
      } else if (newZoomLevel > 2) {
        newZoomLevel = 2;
      }

      return newZoomLevel;
    });
  };

  const windowSize = useWindowSize();

  const findMaxRightEdge = (node: HTMLElement | null): number => {
    let maxRight = 0;
    if (node) {
      node.childNodes.forEach((child) => {
        if (child instanceof HTMLElement) {
          if (child.classList.contains('rst__rowWrapper')) {
            const rect = child.getBoundingClientRect();
            const left = child.parentElement?.parentElement?.style.left;
            let leftValue = 0;

            if (left) {
              leftValue = parseFloat(left);
            }

            const rightEdge = rect.width + leftValue;
            if (rightEdge > maxRight) {
              maxRight = rightEdge;
            }
          }

          // handle the child's children
          const childMaxRight = findMaxRightEdge(child);
          if (childMaxRight > maxRight) {
            maxRight = childMaxRight;
          }
        }
      });
    }
    return maxRight;
  };

  const reset = () => {
    activeIsolateOnNodeId.current = null;
    defer(() => nodeStore.scrollToTop());
  };

  useEffect(() => {
    if (treeElement.current) {
      const maxWidth = findMaxRightEdge(treeElement.current);
      nodeStore.setMaxTreeHorizontalNodePosition(maxWidth);
    }
  });

  const handleScroll = throttle(() => {
    if (treeElement.current) {
      const maxWidth = findMaxRightEdge(treeElement.current);
      nodeStore.setMaxTreeHorizontalNodePosition(maxWidth);
    }
  }, 100);

  useEffect(() => {
    if (treeElement.current) {
      const scrollList = document.querySelector('.ReactVirtualized__List');

      if (scrollList) {
        scrollList.addEventListener('scroll', handleScroll);

        return () => scrollList?.removeEventListener('scroll', handleScroll);
      }
    }
  }, [treeElement.current]);

  useEffect(() => {
    nodeStore.resetMaxTreeHorizontalNodePosition();
  }, [treeData]);

  // onMount
  useEffect(() => {
    wholeTreeData.current = null;
    activeIsolateOnNodeId.current = null;
    nodeStore.resetMaxTreeHorizontalNodePosition();
    nodeStore.init(conversationAsset);
    setTreeData(buildTreeDataFromConversation(nodeStore, conversationAsset));
  }, []);

  // OnConversationChange or rebuild
  useEffect(() => {
    if (getId(conversationAsset.conversation) !== previousConversationId.current) {
      reset();

      wholeTreeData.current = null;
      nodeStore.resetMaxTreeHorizontalNodePosition();
      nodeStore.init(conversationAsset);

      if (activeIsolateOnNodeId.current) {
        wholeTreeData.current = buildTreeDataFromConversation(nodeStore, conversationAsset);
        const node = nodeStore.getNode(activeIsolateOnNodeId.current);
        setTreeData(buildTreeDataFromNode(nodeStore, node));
      } else {
        setTreeData(buildTreeDataFromConversation(nodeStore, conversationAsset));
      }

      setIsContextMenuVisible(false);
      previousConversationId.current = getId(conversationAsset.conversation);
    }
  }, [conversationAsset]);

  useEffect(() => {
    if (treeData == null || rebuild == false) return;

    // in isolation mode
    if (wholeTreeData.current && activeIsolateOnNodeId.current) {
      const node = nodeStore.getNode(activeIsolateOnNodeId.current);
      setTreeData(buildTreeDataFromNode(nodeStore, node));
    } else {
      setTreeData(buildTreeDataFromConversation(nodeStore, conversationAsset));
    }

    setIsContextMenuVisible(false);
  }, [rebuild]);

  // On window size change
  useEffect(() => {
    setTimeout(() => {
      if (treeElement.current) {
        const calculatedTreeWidth = treeElement.current.clientWidth;
        if (treeWidth !== calculatedTreeWidth) resize();
      }
    }, 50);
  }, [windowSize.width, windowSize.height, zoomLevel]);

  // Expand or collapse all nodes
  useEffect(() => {
    if (treeData == null) return;

    const updatedTreeData = toggleExpandedForAll({
      treeData,
      callback: (node: RSTNode) => {
        nodeStore.setNodeExpansion(node.id, expandAll);
      },
      expanded: expandAll,
    }) as RSTNode[];

    setTreeData(updatedTreeData);
  }, [expandAll]);

  // To collapse all other branches except the provided branch starting at the node id
  useEffect(() => {
    if (collapseOthersOnNodeId == null || treeData == null) return;

    const node = nodeStore.getNode(collapseOthersOnNodeId);
    const updatedTreeData = collapseOtherBranches(treeData, node, (node: RSTNode) => {
      nodeStore.setNodeExpansion(node.id, false);
    });

    setTreeData(updatedTreeData);
    nodeStore.setCollapseOthersOnNodeId(null);
  }, [collapseOthersOnNodeId]);

  // To collapse branch below provided node id
  useEffect(() => {
    if (collapseOnNodeId == null || treeData == null) return;

    const node = nodeStore.getNode(collapseOnNodeId);
    const updatedTreeData = collapseOrExpandBranches(
      treeData,
      node,
      (node: RSTNode) => {
        nodeStore.setNodeExpansion(node.id, false);
      },
      false,
    );

    setTreeData(updatedTreeData);
    nodeStore.setCollapseOnNodeId(null);
  }, [collapseOnNodeId]);

  // To expand branch below provided node id
  useEffect(() => {
    if (expandOnNodeId == null || treeData == null) return;

    const node = nodeStore.getNode(expandOnNodeId);
    const updatedTreeData = collapseOrExpandBranches(
      treeData,
      node,
      (node: RSTNode) => {
        nodeStore.setNodeExpansion(node.id, true);
      },
      true,
    );

    setTreeData(updatedTreeData);
    nodeStore.setExpandOnNodeId(null);
  }, [expandOnNodeId]);

  // To expand from the core to the node id provided - used for autoscroll to uncover a node (e.g. follow link / go to active node)
  useEffect(() => {
    if (expandFromCoreToNodeId == null || treeData == null) return;

    const node = nodeStore.getNode(expandFromCoreToNodeId);
    const updatedTreeData = expandFromCoreToNode(treeData, node, (node: RSTNode) => {
      nodeStore.setNodeExpansion(node.id, true);
    });

    setTreeData(updatedTreeData);
    nodeStore.setExpandFromCoreToNodeId(null);
  }, [expandFromCoreToNodeId]);

  // To isolate a branch starting from the provided node id
  useEffect(() => {
    if (isolateOnNodeId == null || treeData == null) return;

    if (isolateOnNodeId === 'exit') {
      // Restore the whole tree
      setTreeData(wholeTreeData.current);
      wholeTreeData.current = null;
      activeIsolateOnNodeId.current = null;

      // Rebuild
      nodeStore.setRebuild(true);
    } else {
      const node = nodeStore.getNode(isolateOnNodeId);
      if (node == null) return;

      // Backup the whole tree
      if (!wholeTreeData.current) {
        wholeTreeData.current = treeData;
        activeIsolateOnNodeId.current = isolateOnNodeId;
      }

      // Set the tree data starting from the selected node
      setTreeData(buildTreeDataFromNode(nodeStore, node));
    }

    nodeStore.setIsolateOnNodeId(null);
  }, [isolateOnNodeId]);

  useControlWheel(treeElement, onControlWheel);

  if (treeData === null) return null;

  const dialogeEditorClasses = classnames('dialog-editor', {
    'dialog-editor--isolated': wholeTreeData.current,
  });

  return (
    <div ref={dialogEditorRef} className={dialogeEditorClasses}>
      <DialogEditorContextMenu id="dialog-context-menu" onVisibilityChange={onNodeContextMenuVisibilityChange} />
      <div
        className="dialog-editor__tree"
        ref={treeElement}
        onClick={onClicked}
        style={{
          transformOrigin: '0 0',
          transform: `scale(${zoomLevel})`,
          width: dialogEditorSize ? dialogEditorSize.width / zoomLevel : 0,
          height: (dialogEditorSize ? dialogEditorSize.height / zoomLevel : 0) - 1,
        }}
      >
        <ScalableScrollbar activeNodeId={activeNodeId} width={10 / zoomLevel}>
          <SortableTree
            treeData={treeData}
            onChange={(data: RSTNode[]) => setTreeData(data)}
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
              dataStore,
              nodeStore,
              activeNodeId,
              previousNodeId,
              onNodeContextMenu,
              isContextMenuVisible,
              zoomLevel,
            })}
            nodeContentRenderer={(props: any) => <ConverseTekNodeRenderer {...props} />}
            reactVirtualizedListProps={{
              width: treeWidth,
            }}
            slideRegionSize={100 / zoomLevel}
          />
        </ScalableScrollbar>
      </div>
    </div>
  );
}

export const ObservingDialogueEditor = observer(DialogEditor);
