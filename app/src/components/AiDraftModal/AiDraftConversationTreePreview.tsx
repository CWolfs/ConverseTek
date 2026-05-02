import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BranchesOutlined } from '@ant-design/icons';
import { useSize } from 'ahooks';
import { Tree, NodeRendererProps, RowRendererProps, CursorProps, TreeApi } from 'react-arborist';

import { ConverseTekNodeRenderer, ConversationTreeNodeStore } from 'components/DialogEditor/ConverseTekNodeRenderer';
import type { OnNodeContextMenuProps } from 'components/DialogEditor/DialogEditor';
import {
  buildInitialOpenState,
  findConversationTreeMaxRightEdge,
  getConversationTreeNodeId,
  getConversationTreePath,
  getConversationTreeScaffoldLines,
} from 'components/DialogEditor/conversation-tree-adapter';
import { ScalableScrollbar } from 'components/ScalableScrollbar';
import { useStore } from 'hooks/useStore';
import { DataStore } from 'stores/dataStore/data-store';
import { DefStore } from 'stores/defStore/def-store';
import { ConversationAssetType, ElementNodeType, PromptNodeType } from 'types';
import { getId } from 'utils/conversation-utils';

import 'components/DialogEditor/DialogEditor.css';

const scaffoldBlockPxWidth = 44;
const rootScaffoldOffsetPx = scaffoldBlockPxWidth;

function getPreviewNodeLayoutStyle(style: React.CSSProperties): React.CSSProperties {
  const paddingLeft = typeof style.paddingLeft === 'number' ? style.paddingLeft : parseFloat(String(style.paddingLeft || 0));

  return {
    ...style,
    paddingLeft: (Number.isNaN(paddingLeft) ? 0 : paddingLeft) + rootScaffoldOffsetPx,
  };
}

function PreviewTreeRow({ attrs, innerRef, children }: RowRendererProps<PreviewTreeNode>) {
  return (
    <div {...attrs} ref={innerRef} className={`${attrs.className || ''} conversation-tree__row`} onFocus={(event) => event.stopPropagation()}>
      {children}
    </div>
  );
}

function PreviewTreeCursor({ top, left }: CursorProps) {
  return <div className="conversation-tree__drop-cursor" style={{ top, left }} />;
}

type PreviewNodeStore = ConversationTreeNodeStore & {
  buildTreeData: () => PreviewTreeNode[];
  recordTreeIndex: (nodeId: string | undefined, treeIndex: number) => void;
};

type PreviewTreeNode = RSTNode & {
  previewTreeKey: string;
};

type Props = {
  conversationAsset: ConversationAssetType;
};

export function AiDraftConversationTreePreview({ conversationAsset }: Props) {
  const dataStore = useStore<DataStore>('data');
  const defStore = useStore<DefStore>('def');
  const treeContainerRef = useRef<HTMLDivElement>(null);
  const arboristTreeRef = useRef<TreeApi<PreviewTreeNode> | null>(null);
  const treeContainerSize = useSize(treeContainerRef);
  const expansionByNodeId = useRef(new Map<string, boolean>());
  const maxHorizontalNodePositionRef = useRef(0);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [maxHorizontalNodePosition, setMaxHorizontalNodePosition] = useState(0);
  const [treeData, setTreeData] = useState<PreviewTreeNode[]>([]);
  const treeWidth = treeContainerSize?.width || 0;

  const previewNodeStore = useMemo(
    () => createPreviewNodeStore(conversationAsset, expansionByNodeId.current, setActiveNodeId, maxHorizontalNodePositionRef),
    [conversationAsset],
  );

  useEffect(() => {
    setActiveNodeId(null);
    maxHorizontalNodePositionRef.current = 0;
    setMaxHorizontalNodePosition(0);
    setTreeData(previewNodeStore.buildTreeData());
  }, [previewNodeStore]);

  useEffect(() => {
    const animationFrameId = requestAnimationFrame(() => {
      const nextMaxPosition = findConversationTreeMaxRightEdge(treeContainerRef.current);
      setMaxHorizontalNodePosition((previousMaxPosition) => {
        const measuredMaxPosition = Math.max(previousMaxPosition, nextMaxPosition);
        maxHorizontalNodePositionRef.current = measuredMaxPosition;
        return measuredMaxPosition;
      });
    });

    return () => cancelAnimationFrame(animationFrameId);
  }, [treeData, treeWidth]);

  useEffect(() => {
    maxHorizontalNodePositionRef.current = maxHorizontalNodePosition;
  }, [maxHorizontalNodePosition]);

  const ignoreContextMenu = ({ event }: OnNodeContextMenuProps) => {
    event.preventDefault();
  };
  const getPreviewTreeNodeId = (node: PreviewTreeNode) => node.previewTreeKey || getConversationTreeNodeId(node);
  const initialOpenState = buildInitialOpenState(treeData, getPreviewTreeNodeId);
  const PreviewNodeRenderer = (props: NodeRendererProps<PreviewTreeNode>) => {
    const { node, tree, style } = props;
    const treeNode = node.data;
    const treeIndex = node.rowIndex ?? 0;
    previewNodeStore.recordTreeIndex(treeNode.id, treeIndex);

    const comment = getPreviewNodeComment(treeNode, previewNodeStore);

    return (
      <ConverseTekNodeRenderer
        dataStore={dataStore}
        nodeStore={previewNodeStore}
        activeNodeId={activeNodeId}
        previousNodeId={null}
        onNodeContextMenu={ignoreContextMenu}
        isContextMenuVisible={false}
        scaffoldBlockPxWidth={scaffoldBlockPxWidth}
        toggleChildrenVisibility={
          treeNode.children && treeNode.children.length > 0
            ? ({ node: currentNode }: { node: RSTNode; path: RSTPath; treeIndex: number }) => {
                const arboristNode = tree.get(getPreviewTreeNodeId(currentNode as PreviewTreeNode));
                if (arboristNode == null) return;

                arboristNode.toggle();
                previewNodeStore.setNodeExpansion(currentNode.id, !arboristNode.isOpen);
              }
            : null
        }
        connectDragPreview={(element: React.ReactElement) => element}
        connectDragSource={(element: React.ReactElement) => element}
        isDragging={false}
        canDrop={false}
        canDrag={false}
        node={{ ...treeNode, expanded: node.isOpen }}
        title={treeNode.title}
        subtitle={treeNode.subtitle || null}
        draggedNode={null}
        path={getConversationTreePath(node)}
        treeIndex={treeIndex}
        isSearchMatch={false}
        isSearchFocus={false}
        buttons={[]}
        className={comment ? 'ai-draft-preview-tree__row--has-comment' : ''}
        style={getPreviewNodeLayoutStyle(style)}
        didDrop={false}
        treeId="ai-draft-preview-tree"
        isOver={false}
        parentNode={node.parent == null || node.parent.isRoot ? null : node.parent.data}
        rowDirection="ltr"
        scaffoldLines={getConversationTreeScaffoldLines(node, scaffoldBlockPxWidth)}
        rowCommentTooltip={comment}
        zoomLevel={1}
        operationDefinitions={defStore.operations}
      />
    );
  };

  return (
    <div className="ai-draft-preview-tree">
      <div className="ai-draft-preview-tree__toolbar">
        <span>
          <BranchesOutlined /> Conversation tree preview
        </span>
        <span>Read-only</span>
      </div>
      <div ref={treeContainerRef} className="ai-draft-preview-tree__canvas dialog-editor">
        {treeData.length > 0 && treeWidth > 0 && (
          <ScalableScrollbar activeNodeId={activeNodeId} width={10} hideScrollOnScale={false}>
            <Tree<PreviewTreeNode>
              ref={arboristTreeRef}
              data={treeData}
              idAccessor={getPreviewTreeNodeId}
              childrenAccessor={(node) => (node.children || null) as readonly PreviewTreeNode[] | null}
              initialOpenState={initialOpenState}
              rowHeight={40}
              indent={scaffoldBlockPxWidth}
              width={treeWidth}
              height={treeContainerSize?.height || 0}
              disableDrag
              disableDrop
              disableMultiSelection
              renderRow={PreviewTreeRow}
              renderCursor={PreviewTreeCursor}
              className="conversation-tree__list"
              dndRootElement={treeContainerRef.current}
            >
              {PreviewNodeRenderer}
            </Tree>
          </ScalableScrollbar>
        )}
      </div>
    </div>
  );
}

function createPreviewNodeStore(
  conversationAsset: ConversationAssetType,
  expansionByNodeId: Map<string, boolean>,
  setActiveNodeId: (nodeId: string | null) => void,
  maxHorizontalNodePositionRef: React.MutableRefObject<number>,
): PreviewNodeStore {
  const nodeById = new Map<string, PromptNodeType | ElementNodeType>();
  const promptNodeByIndex = new Map<number, PromptNodeType>();
  const treeIndexByNodeId = new Map<string, number>();

  conversationAsset.conversation.roots.forEach((root) => {
    nodeById.set(getId(root), root);
  });

  conversationAsset.conversation.nodes.forEach((promptNode) => {
    nodeById.set(getId(promptNode), promptNode);
    promptNodeByIndex.set(promptNode.index, promptNode);

    promptNode.branches.forEach((branch) => {
      nodeById.set(getId(branch), branch);
    });
  });

  const previewNodeStore: PreviewNodeStore = {
    buildTreeData: () => {
      if (conversationAsset.conversation.roots.length === 0) {
        return conversationAsset.conversation.nodes
          .filter((node) => node.parentId === '0')
          .map((node, index) => buildPromptTreeNode(node, '0', `node-${index}`, previewNodeStore));
      }

      return [
        {
          title: conversationAsset.conversation.uiName || 'AI Draft Conversation',
          id: '0',
          previewTreeKey: 'core-0',
          type: 'core',
          parentId: '-1',
          children: conversationAsset.conversation.roots.map((root, index) =>
            buildElementTreeNode(root, 'root', null, `core-0/root-${index}`, previewNodeStore),
          ),
          expanded: true,
          canDrag: false,
        },
      ];
    },
    recordTreeIndex: (nodeId, treeIndex) => {
      if (nodeId) treeIndexByNodeId.set(nodeId, treeIndex);
    },
    getNode: (nodeId) => {
      if (!nodeId) return null;
      return nodeById.get(nodeId) || null;
    },
    getPromptNodeByIndex: (index) => promptNodeByIndex.get(index) || null,
    getTreeIndex: (nodeId) => treeIndexByNodeId.get(nodeId) ?? 0,
    setActiveNode: () => setActiveNodeId(null),
    initScrollToNode: () => undefined,
    isNodeVisible: () => true,
    setFocusedTreeNode: () => undefined,
    getMaxTreeHorizontalNodePosition: () => maxHorizontalNodePositionRef.current,
    setNodeExpansion: (nodeId, flag) => {
      if (nodeId) expansionByNodeId.set(nodeId, flag);
    },
    isNodeExpanded: (nodeId) => {
      if (!nodeId) return false;
      return expansionByNodeId.get(nodeId) ?? true;
    },
  };

  return previewNodeStore;
}

function buildElementTreeNode(
  elementNode: ElementNodeType,
  type: 'root' | 'response',
  parentId: string | null,
  previewTreeKey: string,
  previewNodeStore: PreviewNodeStore,
): PreviewTreeNode {
  const elementNodeId = getId(elementNode);

  return {
    title: elementNode.responseText,
    id: elementNodeId,
    previewTreeKey,
    parentId,
    type,
    expanded: previewNodeStore.isNodeExpanded(elementNodeId),
    children: buildElementChildren(elementNode, elementNodeId, previewTreeKey, previewNodeStore),
  };
}

function buildElementChildren(
  elementNode: ElementNodeType,
  elementNodeId: string,
  parentTreeKey: string,
  previewNodeStore: PreviewNodeStore,
): PreviewTreeNode[] | null {
  if (elementNode.nextNodeIndex === -1) return null;

  if (elementNode.auxiliaryLink) {
    const linkedPromptNode = previewNodeStore.getPromptNodeByIndex(elementNode.nextNodeIndex);
    return [
      {
        title: `[Link to NODE ${elementNode.nextNodeIndex}]`,
        id: `link-${elementNodeId}-${elementNode.nextNodeIndex}`,
        previewTreeKey: `${parentTreeKey}/link-${elementNode.nextNodeIndex}`,
        type: 'link',
        linkId: linkedPromptNode ? getId(linkedPromptNode) : null,
        linkIndex: elementNode.nextNodeIndex,
        canDrag: false,
        parentId: elementNodeId,
      },
    ];
  }

  const childPromptNode = previewNodeStore.getPromptNodeByIndex(elementNode.nextNodeIndex);
  if (!childPromptNode) return null;

  return [buildPromptTreeNode(childPromptNode, elementNodeId, `${parentTreeKey}/node-${elementNode.nextNodeIndex}`, previewNodeStore)];
}

function buildPromptTreeNode(
  promptNode: PromptNodeType,
  parentId: string,
  previewTreeKey: string,
  previewNodeStore: PreviewNodeStore,
): PreviewTreeNode {
  const promptNodeId = getId(promptNode);

  return {
    title: promptNode.text,
    id: promptNodeId,
    previewTreeKey,
    parentId,
    type: 'node',
    expanded: previewNodeStore.isNodeExpanded(promptNodeId),
    children: promptNode.branches.map((branch, index) =>
      buildElementTreeNode(branch, 'response', promptNodeId, `${previewTreeKey}/response-${index}`, previewNodeStore),
    ),
  };
}

function getPreviewNodeComment(node: PreviewTreeNode, previewNodeStore: PreviewNodeStore): string {
  const storedNode = previewNodeStore.getNode(node.id);
  return storedNode?.comment?.trim() || '';
}
