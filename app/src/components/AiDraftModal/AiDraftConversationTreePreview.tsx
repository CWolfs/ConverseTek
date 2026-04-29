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
  buildTreeData: () => PreviewTreeNode[];
  recordTreeIndex: (nodeId: string | undefined, treeIndex: number) => void;
};

type PreviewTreeNode = RSTNode & {
  previewTreeKey: string;
};

type PreviewRowHeightProps = {
  node: PreviewTreeNode;
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
  const [treeData, setTreeData] = useState<PreviewTreeNode[]>([]);

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
              onChange={(nextTreeData: PreviewTreeNode[]) => setTreeData(nextTreeData)}
              getNodeKey={({ node, treeIndex }: { node: PreviewTreeNode; treeIndex: number }) => {
                previewNodeStore.recordTreeIndex(node.id, treeIndex);
                return node.previewTreeKey || node.id || treeIndex;
              }}
              rowHeight={getPreviewRowHeight}
              canDrag={() => false}
              canDrop={() => false}
              generateNodeProps={({ node }: { node: PreviewTreeNode }) => ({
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
        previewTreeKey: 'core-0',
        type: 'core',
        parentId: '-1',
        children: conversationAsset.conversation.roots.map((root, index) =>
          buildElementTreeNode(root, 'root', null, `core-0/root-${index}`, previewNodeStore),
        ),
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
  previewTreeKey: string,
  previewNodeStore: PreviewNodeStore,
): PreviewTreeNode {
  const elementNodeId = getId(elementNode);

  return {
    title: elementNode.responseText,
    subtitle: formatElementSubtitle(elementNode),
    id: elementNodeId,
    previewTreeKey,
    parentId,
    type,
    expanded: previewNodeStore.isNodeExpanded(elementNodeId),
    canDrag: false,
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
    subtitle: formatPromptSubtitle(promptNode),
    id: promptNodeId,
    previewTreeKey,
    parentId,
    type: 'node',
    expanded: previewNodeStore.isNodeExpanded(promptNodeId),
    canDrag: false,
    children: promptNode.branches.map((branch, index) =>
      buildElementTreeNode(branch, 'response', promptNodeId, `${previewTreeKey}/response-${index}`, previewNodeStore),
    ),
  };
}

function getPreviewRowHeight({ node }: PreviewRowHeightProps): number {
  const title = typeof node.title === 'string' ? node.title : '';
  const subtitle = typeof node.subtitle === 'string' ? node.subtitle : '';
  const estimatedCharactersPerLine = node.type === 'response' ? 70 : 86;
  const titleLines = Math.max(1, Math.ceil(title.length / estimatedCharactersPerLine));
  const subtitleLines = subtitle.length > 0 ? Math.max(1, Math.ceil(subtitle.length / 96)) : 0;
  const estimatedHeight = 40 + titleLines * 18 + subtitleLines * 14;

  return Math.min(180, Math.max(64, estimatedHeight));
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
  return promptNode.sourceInSceneRef?.id || promptNode.speakerOverrideId || 'Inherits';
}

function formatSpeakerType(promptNode: PromptNodeType): string {
  if (promptNode.sourceInSceneRef?.id) return 'castId';
  if (promptNode.speakerOverrideId) return 'speakerId';
  return 'none';
}

function buildPreviewNodeButtons(node: PreviewTreeNode, previewNodeStore: PreviewNodeStore): JSX.Element[] {
  if (node.type !== 'node') return [];

  const promptNode = previewNodeStore.getNode(node.id);
  if (promptNode == null || promptNode.type !== 'node') return [];

  const speaker = formatSpeaker(promptNode);
  const displaySpeaker = speaker.replace(/Default$/i, '') || speaker;

  return [
    <span
      className="ai-draft-preview-tree__speaker-badge"
      title={`${formatSpeakerType(promptNode)} ${speaker}`}
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
