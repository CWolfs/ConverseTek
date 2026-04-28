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
import { ConversationAssetType, ElementNodeType, OperationCallType, PromptNodeType } from 'types';
import { getId } from 'utils/conversation-utils';

type PreviewNodeStore = ConversationTreeNodeStore & {
  buildTreeData: () => RSTNode[];
  recordTreeIndex: (nodeId: string | undefined, treeIndex: number) => void;
};

type Props = {
  conversationAsset: ConversationAssetType;
};

export function AiDraftConversationTreePreview({ conversationAsset }: Props) {
  const dataStore = useStore<DataStore>('data');
  const treeContainerRef = useRef<HTMLDivElement>(null);
  const treeContainerSize = useSize(treeContainerRef);
  const expansionByNodeId = useRef(new Map<string, boolean>());
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [treeData, setTreeData] = useState<RSTNode[]>([]);

  const previewNodeStore = useMemo(
    () => createPreviewNodeStore(conversationAsset, expansionByNodeId.current, setActiveNodeId),
    [conversationAsset],
  );

  useEffect(() => {
    setActiveNodeId(null);
    setTreeData(previewNodeStore.buildTreeData());
  }, [previewNodeStore]);

  const ignoreContextMenu = ({ event }: OnNodeContextMenuProps) => {
    event.preventDefault();
  };

  const treeWidth = treeContainerSize?.width || 0;

  return (
    <div className="ai-draft-preview-tree">
      <div className="ai-draft-preview-tree__toolbar">
        <span>
          <Icon type="branches" /> Conversation tree preview
        </span>
        <span>Read-only</span>
      </div>
      <div ref={treeContainerRef} className="ai-draft-preview-tree__canvas">
        {treeData.length > 0 && treeWidth > 0 && (
          <ScalableScrollbar activeNodeId={activeNodeId} width={10} hideScrollOnScale={false}>
            <SortableTree
              treeData={treeData}
              onChange={(nextTreeData: RSTNode[]) => setTreeData(nextTreeData)}
              getNodeKey={({ node, treeIndex }: { node: RSTNode; treeIndex: number }) => {
                previewNodeStore.recordTreeIndex(node.id, treeIndex);
                return node.id || treeIndex;
              }}
              rowHeight={56}
              canDrag={() => false}
              canDrop={() => false}
              generateNodeProps={({ node }: { node: RSTNode }) => ({
                dataStore,
                nodeStore: previewNodeStore,
                activeNodeId,
                previousNodeId: null,
                onNodeContextMenu: ignoreContextMenu,
                isContextMenuVisible: false,
                buttons: buildPreviewNodeButtons(node, previewNodeStore),
                zoomLevel: 1,
              })}
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
    buildTreeData: () => [
      {
        title: conversationAsset.conversation.uiName || 'AI Draft Conversation',
        id: '0',
        type: 'core',
        parentId: '-1',
        children: conversationAsset.conversation.roots.map((root) => buildElementTreeNode(root, 'root', null, previewNodeStore)),
        expanded: true,
        canDrag: false,
      },
    ],
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
    getMaxTreeHorizontalNodePosition: () => 0,
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
  previewNodeStore: PreviewNodeStore,
): RSTNode {
  const elementNodeId = getId(elementNode);

  return {
    title: elementNode.responseText,
    subtitle: formatElementSubtitle(elementNode),
    id: elementNodeId,
    parentId,
    type,
    expanded: previewNodeStore.isNodeExpanded(elementNodeId),
    canDrag: false,
    children: buildElementChildren(elementNode, elementNodeId, previewNodeStore),
  };
}

function buildElementChildren(elementNode: ElementNodeType, elementNodeId: string, previewNodeStore: PreviewNodeStore): RSTNode[] | null {
  if (elementNode.nextNodeIndex === -1) return null;

  if (elementNode.auxiliaryLink) {
    const linkedPromptNode = previewNodeStore.getPromptNodeByIndex(elementNode.nextNodeIndex);
    return [
      {
        title: `[Link to NODE ${elementNode.nextNodeIndex}]`,
        id: `link-${elementNodeId}-${elementNode.nextNodeIndex}`,
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

  return [buildPromptTreeNode(childPromptNode, elementNodeId, previewNodeStore)];
}

function buildPromptTreeNode(promptNode: PromptNodeType, parentId: string, previewNodeStore: PreviewNodeStore): RSTNode {
  const promptNodeId = getId(promptNode);

  return {
    title: promptNode.text,
    subtitle: formatPromptSubtitle(promptNode),
    id: promptNodeId,
    parentId,
    type: 'node',
    expanded: previewNodeStore.isNodeExpanded(promptNodeId),
    canDrag: false,
    children: promptNode.branches.map((branch) => buildElementTreeNode(branch, 'response', promptNodeId, previewNodeStore)),
  };
}

function formatPromptSubtitle(promptNode: PromptNodeType): string {
  return [
    `NODE ${promptNode.index}`,
    promptNode.comment ? `draft key ${promptNode.comment}` : '',
    formatOperationCount('action', promptNode.actions?.ops),
  ]
    .filter(Boolean)
    .join(' | ');
}

function formatElementSubtitle(elementNode: ElementNodeType): string {
  const target = elementNode.nextNodeIndex === -1 ? 'END' : `${elementNode.auxiliaryLink ? 'link to' : 'to'} NODE ${elementNode.nextNodeIndex}`;

  return [
    target,
    formatOperationCount('condition', elementNode.conditions?.ops),
    formatOperationCount('action', elementNode.actions?.ops),
  ]
    .filter(Boolean)
    .join(' | ');
}

function formatSpeaker(promptNode: PromptNodeType): string {
  if (promptNode.speakerType === 'castId' && promptNode.sourceInSceneRef?.id) return promptNode.sourceInSceneRef.id;
  if (promptNode.speakerType === 'speakerId' && promptNode.speakerOverrideId) return promptNode.speakerOverrideId;
  return 'Narration';
}

function buildPreviewNodeButtons(node: RSTNode, previewNodeStore: PreviewNodeStore): JSX.Element[] {
  if (node.type !== 'node') return [];

  const promptNode = previewNodeStore.getNode(node.id);
  if (promptNode == null || promptNode.type !== 'node') return [];

  const speaker = formatSpeaker(promptNode);
  const displaySpeaker = speaker.replace(/Default$/i, '') || speaker;

  return [
    <span
      className="ai-draft-preview-tree__speaker-badge"
      title={`${promptNode.speakerType || 'none'} ${speaker}`}
    >
      {displaySpeaker}
    </span>,
  ];
}

function formatOperationCount(label: string, operations: OperationCallType[] | null | undefined): string {
  const operationCount = operations?.length || 0;
  if (operationCount === 0) return '';

  return `${operationCount} ${label}${operationCount === 1 ? '' : 's'}`;
}
