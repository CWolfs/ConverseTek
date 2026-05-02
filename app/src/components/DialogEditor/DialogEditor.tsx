/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */
import { cloneElement, useState, useEffect, useRef, useMemo } from 'react';
import type { CSSProperties, MouseEvent, ReactElement, Ref } from 'react';
import { observer } from 'mobx-react';
import { Tree, NodeApi, NodeRendererProps, RowRendererProps, CursorProps, DragPreviewProps, TreeApi } from 'react-arborist';
import { useContextMenu } from 'react-contexify';
import { useSize } from 'ahooks';
import throttle from 'lodash/throttle';
import classnames from 'classnames';
import defer from 'lodash.defer';

import { DataStore } from 'stores/dataStore/data-store';
import { DefStore } from 'stores/defStore/def-store';
import { NodeStore } from 'stores/nodeStore/node-store';
import { ConversationAssetType, ElementNodeType, PromptNodeType } from 'types';

import { useStore } from 'hooks/useStore';
import { useControlWheel } from 'hooks/useControlWheel';
import { useWindowSize } from 'hooks/useWindowSize';
import { detectType, isElementNodeType, isPromptNodeType } from 'utils/node-utils';
import { getId } from 'utils/conversation-utils';
import { toggleExpandedForAll } from 'utils/tree-data-utils';
import { collapseOrExpandBranches, collapseOtherBranches, expandFromCoreToNode } from 'utils/custom-tree-data-utils';
import { buildPromptSpeakerProjectionMap } from 'utils/speaker-projection-utils';
import { buildPromptCameraProjectionMap } from 'utils/camera-projection-utils';

import { ScalableScrollbar } from 'components/ScalableScrollbar';
import { LinkIcon } from 'components/Svg';

import { ConverseTekNodeRenderer } from './ConverseTekNodeRenderer';
import { DialogEditorContextMenu } from '../ContextMenus/DialogEditorContextMenu';
import {
  buildInitialOpenState,
  findConversationTreeMaxRightEdge,
  getConversationTreeNodeId,
  getConversationTreePath,
  getConversationTreeScaffoldLines,
  moveConversationTreeNode,
} from './conversation-tree-adapter';

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
const scaffoldBlockPxWidth = 44;
const rootScaffoldOffsetPx = scaffoldBlockPxWidth;
const dragPreviewHandleAnchorX = 17;
const dragPreviewHandleAnchorY = 12;

function getNodeLayoutStyle(style: CSSProperties): CSSProperties {
  const paddingLeft = typeof style.paddingLeft === 'number' ? style.paddingLeft : parseFloat(String(style.paddingLeft || 0));

  return {
    ...style,
    paddingLeft: (Number.isNaN(paddingLeft) ? 0 : paddingLeft) + rootScaffoldOffsetPx,
  };
}

function ConversationTreeRow({ attrs, innerRef, children }: RowRendererProps<RSTNode>) {
  return (
    <div
      {...attrs}
      ref={innerRef}
      className={classnames(attrs.className, 'conversation-tree__row')}
      onFocus={(event) => event.stopPropagation()}
    >
      {children}
    </div>
  );
}

function ConversationTreeCursor({ top, left }: CursorProps) {
  return <div className="conversation-tree__drop-cursor" style={{ top, left: left + rootScaffoldOffsetPx }} />;
}

function getNodePathNode(node: NodeApi<RSTNode> | null): RSTNode | null {
  return node == null || node.isRoot ? null : node.data;
}

function DialogEditor({ conversationAsset, rebuild, expandAll }: { conversationAsset: ConversationAssetType; rebuild: boolean; expandAll: boolean }) {
  const dataStore = useStore<DataStore>('data');
  const defStore = useStore<DefStore>('def');
  const nodeStore = useStore<NodeStore>('node');

  const dialogEditorRef = useRef<HTMLDivElement>(null);
  const dialogEditorSize = useSize(dialogEditorRef);

  const wholeTreeData = useRef<RSTNode[] | null>(null);
  const previousConversationId = useRef<string | null>(null);
  const activeIsolateOnNodeId = useRef<string | null>(null);

  const [treeData, setTreeData] = useState<RSTNode[] | null>(null);
  const [treeVersion, setTreeVersion] = useState(0);
  const [treeWidth, setTreeWidth] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isContextMenuVisible, setIsContextMenuVisible] = useState(false);
  const treeElement = useRef<HTMLDivElement>(null);
  const arboristTreeRef = useRef<TreeApi<RSTNode> | null>(null);
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
  const speakerRevision = nodeStore.getSpeakerRevision();
  const speakerProjectionByNodeId = useMemo(
    () => buildPromptSpeakerProjectionMap(conversationAsset),
    [conversationAsset, rebuild, speakerRevision],
  );
  const cameraProjectionByNodeId = useMemo(
    () => buildPromptCameraProjectionMap(conversationAsset),
    [conversationAsset, rebuild, dataStore.conversationMutationRevision],
  );

  const replaceTreeData = (nextTreeData: RSTNode[] | null) => {
    setTreeData(nextTreeData);
    setTreeVersion((currentVersion) => currentVersion + 1);
  };

  const commitMove = (node: RSTNode, nextParentNode: RSTNode, previousParentId: string | null) => {
    const { id: nodeId, type: nodeType } = node;
    const { id: nextParentNodeId, children: parentChildren } = nextParentNode;

    const { isRoot, isNode, isResponse } = detectType(nodeType);

    if (isRoot) {
      const rootIds = (parentChildren || []).map((child) => child.id).filter((id): id is string => id != null);
      nodeStore.setRootNodesByIds(rootIds);
    } else if (isNode) {
      if (nodeId == null || previousParentId == null || nextParentNodeId == null) return;

      nodeStore.movePromptNode(nodeId, nextParentNodeId, previousParentId);
    } else if (isResponse) {
      if (nodeId == null || nextParentNodeId == null) return;

      nodeStore.moveResponseNode(
        nodeId,
        nextParentNodeId,
        (parentChildren || []).filter((child): child is RSTNode & { id: string } => child.id != null),
      );
    }
  };

  const onMove = ({ dragIds, parentId, index }: { dragIds: string[]; parentId: string | null; index: number }) => {
    const dragId = dragIds[0];
    if (dragId == null) return;

    setTreeData((currentTreeData) => {
      if (currentTreeData == null) return currentTreeData;

      const moveResult = moveConversationTreeNode(currentTreeData, dragId, parentId, index);
      if (moveResult == null) return currentTreeData;

      commitMove(moveResult.movedNode, moveResult.nextParentNode, moveResult.previousParentId);
      return moveResult.treeData;
    });
  };

  const resize = () => {
    if (treeElement.current) {
      const calculatedTreeWidth = treeElement.current.clientWidth;
      setTreeWidth(calculatedTreeWidth);
    }
  };

  const canDrop = (node: RSTNode, nextParent: RSTNode | null) => {
    if (nextParent == null) return false;

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

  const disableDrop = ({ parentNode, dragNodes }: { parentNode: NodeApi<RSTNode>; dragNodes: NodeApi<RSTNode>[]; index: number }) => {
    const dragNode = dragNodes[0];
    if (dragNode == null || parentNode == null || parentNode.isRoot) return true;

    return !canDrop(dragNode.data, parentNode.data);
  };

  const onClicked = (event: MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('.conversation-node-renderer__toggle-button')) return;

    if (!target.closest('.conversation-node-renderer__row-contents')) {
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

  const reset = () => {
    activeIsolateOnNodeId.current = null;
    defer(() => nodeStore.scrollToTop());
  };

  useEffect(() => {
    if (treeElement.current) {
      const maxWidth = findConversationTreeMaxRightEdge(treeElement.current);
      nodeStore.setMaxTreeHorizontalNodePosition(maxWidth);
    }
  });

  const handleScroll = throttle(() => {
    if (treeElement.current) {
      const maxWidth = findConversationTreeMaxRightEdge(treeElement.current);
      nodeStore.setMaxTreeHorizontalNodePosition(maxWidth);
    }
  }, 100);

  useEffect(() => {
    if (treeElement.current) {
      const scrollList = treeElement.current.querySelector('.conversation-tree__list');

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
    replaceTreeData(buildTreeDataFromConversation(nodeStore, conversationAsset));
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
        replaceTreeData(buildTreeDataFromNode(nodeStore, node));
      } else {
        replaceTreeData(buildTreeDataFromConversation(nodeStore, conversationAsset));
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
      replaceTreeData(buildTreeDataFromNode(nodeStore, node));
    } else {
      replaceTreeData(buildTreeDataFromConversation(nodeStore, conversationAsset));
    }

    setIsContextMenuVisible(false);
  }, [rebuild]);

  useEffect(() => {
    resize();
  }, [dialogEditorSize?.width, dialogEditorSize?.height, zoomLevel]);

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
    });

    replaceTreeData(updatedTreeData);
  }, [expandAll]);

  // To collapse all other branches except the provided branch starting at the node id
  useEffect(() => {
    if (collapseOthersOnNodeId == null || treeData == null) return;

    const node = nodeStore.getNode(collapseOthersOnNodeId);
    const updatedTreeData = collapseOtherBranches(treeData, node, (node: RSTNode) => {
      nodeStore.setNodeExpansion(node.id, false);
    });

    replaceTreeData(updatedTreeData);
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

    replaceTreeData(updatedTreeData);
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

    replaceTreeData(updatedTreeData);
    nodeStore.setExpandOnNodeId(null);
  }, [expandOnNodeId]);

  // To expand from the core to the node id provided - used for autoscroll to uncover a node (e.g. follow link / go to active node)
  useEffect(() => {
    if (expandFromCoreToNodeId == null || treeData == null) return;

    const node = nodeStore.getNode(expandFromCoreToNodeId);
    const updatedTreeData = expandFromCoreToNode(treeData, node, (node: RSTNode) => {
      nodeStore.setNodeExpansion(node.id, true);
    });

    replaceTreeData(updatedTreeData);
    nodeStore.setExpandFromCoreToNodeId(null);
  }, [expandFromCoreToNodeId]);

  // To isolate a branch starting from the provided node id
  useEffect(() => {
    if (isolateOnNodeId == null || treeData == null) return;

    if (isolateOnNodeId === 'exit') {
      // Restore the whole tree
      replaceTreeData(wholeTreeData.current);
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
      replaceTreeData(buildTreeDataFromNode(nodeStore, node));
    }

    nodeStore.setIsolateOnNodeId(null);
  }, [isolateOnNodeId]);

  useControlWheel(treeElement, onControlWheel);

  if (treeData === null) return null;

  const dialogeEditorClasses = classnames('dialog-editor', {
    'dialog-editor--isolated': wholeTreeData.current,
  });
  const treeHeight = (dialogEditorSize ? dialogEditorSize.height / zoomLevel : 0) - 1;
  const measuredTreeWidth = dialogEditorSize ? dialogEditorSize.width / zoomLevel : 0;
  const arboristTreeWidth = treeWidth || measuredTreeWidth;
  const initialOpenState = buildInitialOpenState(treeData);
  const TreeNodeRenderer = (props: NodeRendererProps<RSTNode>) => {
    const { node, tree, style, dragHandle } = props;
    const treeNode = node.data;
    const treeIndex = node.rowIndex ?? 0;
    if (treeNode.id) nodeStore.addNodeIdAndTreeIndexPair(treeNode.id, treeIndex);

    const draggedNode = tree.dragNode?.data || null;
    const nodeParent = getNodePathNode(node.parent);
    const dragSource = (element: ReactElement) =>
      cloneElement(element as ReactElement<{ ref?: Ref<HTMLDivElement> }>, { ref: dragHandle });
    const toggleChildrenVisibility = ({ node: currentNode }: { node: RSTNode; path: RSTPath; treeIndex: number }) => {
      const arboristNode = tree.get(getConversationTreeNodeId(currentNode));
      if (arboristNode == null) return;

      arboristNode.toggle();
      nodeStore.setNodeExpansion(currentNode.id, !arboristNode.isOpen);
    };

    return (
      <ConverseTekNodeRenderer
        dataStore={dataStore}
        nodeStore={nodeStore}
        activeNodeId={activeNodeId}
        previousNodeId={previousNodeId}
        onNodeContextMenu={onNodeContextMenu}
        isContextMenuVisible={isContextMenuVisible}
        scaffoldBlockPxWidth={scaffoldBlockPxWidth}
        toggleChildrenVisibility={treeNode.children && treeNode.children.length > 0 ? toggleChildrenVisibility : null}
        connectDragPreview={(element: ReactElement) => element}
        connectDragSource={dragSource}
        isDragging={draggedNode != null}
        canDrop={node.willReceiveDrop ? tree.canDrop() : true}
        canDrag={treeNode.canDrag !== false && treeNode.id !== '0'}
        node={{ ...treeNode, expanded: node.isOpen }}
        title={treeNode.title}
        subtitle={treeNode.subtitle || null}
        draggedNode={draggedNode}
        path={getConversationTreePath(node)}
        treeIndex={treeIndex}
        isSearchMatch={false}
        isSearchFocus={false}
        buttons={[]}
        className=""
        style={getNodeLayoutStyle(style)}
        didDrop={false}
        treeId="conversation-tree"
        isOver={node.willReceiveDrop}
        parentNode={nodeParent}
        rowDirection="ltr"
        zoomLevel={zoomLevel}
        scaffoldLines={getConversationTreeScaffoldLines(node, scaffoldBlockPxWidth)}
        speakerProjectionByNodeId={speakerProjectionByNodeId}
        cameraProjectionByNodeId={cameraProjectionByNodeId}
        operationDefinitions={defStore.operations}
      />
    );
  };
  const TreeDragPreview = ({ mouse, id, isDragging }: DragPreviewProps) => {
    if (!isDragging || mouse == null || id == null) return null;

    const treeNode = arboristTreeRef.current?.get(id)?.data;
    if (treeNode == null) return null;
    const treeRect = treeElement.current?.getBoundingClientRect();
    if (treeRect == null) return null;

    const storedNode = treeNode.id ? nodeStore.getNode(treeNode.id) : null;
    const { isRoot, isNode, isResponse, isLink } = detectType(treeNode.type);
    const anchorX = isLink ? 0 : dragPreviewHandleAnchorX;
    const previewX = (mouse.x - treeRect.left) / zoomLevel - anchorX;
    const previewY = (mouse.y - treeRect.top) / zoomLevel - dragPreviewHandleAnchorY;
    const previewTitle =
      storedNode == null
        ? treeNode.title
        : storedNode.type === 'node'
        ? storedNode.text
        : storedNode.responseText;

    return (
      <div className="conversation-tree__drag-preview-layer">
        <div
          className={classnames('conversation-tree__drag-preview', {
            'conversation-tree__drag-preview--root': isRoot,
            'conversation-tree__drag-preview--node': isNode,
            'conversation-tree__drag-preview--response': isResponse,
            'conversation-tree__drag-preview--link': isLink,
          })}
          style={{ transform: `translate(${previewX}px, ${previewY}px)` }}
        >
          <span className="conversation-tree__drag-preview-handle">{isLink && <LinkIcon />}</span>
          <span className="conversation-tree__drag-preview-title">{previewTitle}</span>
        </div>
      </div>
    );
  };

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
          <Tree<RSTNode>
            key={treeVersion}
            ref={arboristTreeRef}
            data={treeData}
            idAccessor={getConversationTreeNodeId}
            childrenAccessor={(node) => node.children || null}
            initialOpenState={initialOpenState}
            rowHeight={40}
            indent={scaffoldBlockPxWidth}
            width={arboristTreeWidth}
            height={treeHeight}
            disableMultiSelection
            selection={activeNodeId || undefined}
            disableDrag={(node) => node.id === '0' || node.canDrag === false}
            disableDrop={disableDrop}
            onMove={onMove}
            onToggle={(nodeId) => {
              const node = arboristTreeRef.current?.get(nodeId);
              if (node) nodeStore.setNodeExpansion(node.data.id, node.isOpen);
            }}
            renderRow={ConversationTreeRow}
            renderDragPreview={TreeDragPreview}
            renderCursor={ConversationTreeCursor}
            className="conversation-tree__list"
            dndRootElement={treeElement.current}
          >
            {TreeNodeRenderer}
          </Tree>
        </ScalableScrollbar>
      </div>
    </div>
  );
}

export const ObservingDialogueEditor = observer(DialogEditor);
