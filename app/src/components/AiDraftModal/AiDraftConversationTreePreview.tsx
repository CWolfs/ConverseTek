import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from 'antd';
import { useSize } from 'ahooks';
import SortableTree from 'react-sortable-tree';

import 'react-sortable-tree/style.css';

import { ConverseTekNodeRenderer, ConversationTreeNodeStore, ConverseTekNodeRendererProps } from 'components/DialogEditor/ConverseTekNodeRenderer';
import type { OnNodeContextMenuProps } from 'components/DialogEditor/DialogEditor';
import { ScalableScrollbar } from 'components/ScalableScrollbar';
import { useStore } from 'hooks/useStore';
import { DataStore } from 'stores/dataStore/data-store';
import { DefStore } from 'stores/defStore/def-store';
import { ConversationAssetType, ElementNodeType, PromptNodeType } from 'types';
import { getId } from 'utils/conversation-utils';

import 'components/DialogEditor/DialogEditor.css';

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
      const nextMaxPosition = findMaxRightEdge(treeContainerRef.current);
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

  return (
    <div className="ai-draft-preview-tree">
      <div className="ai-draft-preview-tree__toolbar">
        <span>
          <Icon type="branches" /> Conversation tree preview
        </span>
        <span>Read-only</span>
      </div>
      <div ref={treeContainerRef} className="ai-draft-preview-tree__canvas dialog-editor">
        {treeData.length > 0 && treeWidth > 0 && (
          <ScalableScrollbar activeNodeId={activeNodeId} width={10} hideScrollOnScale={false}>
            <SortableTree
              treeData={treeData}
              onChange={(nextTreeData: PreviewTreeNode[]) => setTreeData(nextTreeData)}
              getNodeKey={({ node, treeIndex }: { node: PreviewTreeNode; treeIndex: number }) => {
                previewNodeStore.recordTreeIndex(node.id, treeIndex);
                return node.previewTreeKey || node.id || treeIndex;
              }}
              rowHeight={40}
              canDrag={() => false}
              canDrop={() => false}
              generateNodeProps={({ node }: { node: PreviewTreeNode }) => {
                const comment = getPreviewNodeComment(node, previewNodeStore);
                return {
                  dataStore,
                  nodeStore: previewNodeStore,
                  activeNodeId,
                  previousNodeId: null,
                  onNodeContextMenu: ignoreContextMenu,
                  isContextMenuVisible: false,
                  buttons: [],
                  className: comment ? 'ai-draft-preview-tree__row--has-comment' : '',
                  rowCommentTooltip: comment,
                  zoomLevel: 1,
                  operationDefinitions: defStore.operations,
                };
              }}
              nodeContentRenderer={(rendererProps: ConverseTekNodeRendererProps) => <ConverseTekNodeRenderer {...rendererProps} />}
              reactVirtualizedListProps={{
                width: treeWidth,
              }}
              slideRegionSize={100}
            />
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

function findMaxRightEdge(node: HTMLElement | null): number {
  let maxRight = 0;
  if (node == null) return maxRight;

  node.childNodes.forEach((child) => {
    if (!(child instanceof HTMLElement)) return;

    if (child.classList.contains('rst__rowWrapper')) {
      const rect = child.getBoundingClientRect();
      const left = child.parentElement?.parentElement?.style.left;
      const leftValue = left ? parseFloat(left) : 0;
      maxRight = Math.max(maxRight, rect.width + leftValue);
    }

    maxRight = Math.max(maxRight, findMaxRightEdge(child));
  });

  return maxRight;
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
