/* eslint-disable function-paren-newline */
import { observable, action, toJS, makeObservable } from 'mobx';
import defer from 'lodash.defer';
import remove from 'lodash.remove';
import sortBy from 'lodash.sortby';
import last from 'lodash.last';
import flattenDeep from 'lodash.flattendeep';

import {
  getId,
  generateId,
  createNode,
  createResponse,
  createRoot,
  updateRoot,
  setRoots as setRootsUtil,
  updateNode,
  updateResponse,
  setResponses,
  addNodes,
} from '../../utils/conversation-utils';

import { dataStore } from '../dataStore';
import { detectType } from '../../utils/node-utils';
import { NodeType } from 'types/NodeType';
import { NodeLinkType } from 'types/NodeLinkType';
import { ConversationAssetType } from 'types/ConversationAssetType';
import { OperationArgType } from 'types/OperationArgType';
import { OperationCallType } from 'types/OperationCallType';

export type Clipboard = {
  node: NodeType | NodeLinkType;
  originalNodeId: string;
  originalNodeIndex: number;
  nodes: (NodeType | NodeLinkType)[];
  nodeIdMap: Map<number, number>;
};

/* eslint-disable no-return-assign, no-param-reassign, class-methods-use-this */
class NodeStore {
  activeNode: NodeType | NodeLinkType | null = null;
  focusedTreeNode: RSTNode | null = null;
  ownerId: string | null = null;
  takenNodeIndexes: number[] = [];
  expandMap = new Map<string, boolean>();
  clipboard: Clipboard | null = null;
  nodeIdToTreeIndexMap = new Map<string, number>();
  dirtyActiveNode = false;
  rebuild = false;

  constructor() {
    makeObservable(this, {
      activeNode: observable,
      focusedTreeNode: observable,
      dirtyActiveNode: observable,
      rebuild: observable,
      setRebuild: action,
      init: action,
      updateActiveNode: action,
      setActiveNode: action,
      setActiveNodeByIndex: action,
      clearActiveNode: action,
      scrollToNode: action,
      setFocusedTreeNode: action,
      clearFocusedNode: action,
      setClipboard: action,
      clearClipboard: action,
      pasteAsLinkFromClipboard: action,
      pasteAsCopyFromClipboard: action,
      setNode: action,
      setNodeText: action,
      setNodeActions: action,
      addNodeAction: action,
      setNodeConditions: action,
      addNodeCondition: action,
      processDeletes: action,
      addNodeByParentId: action,
      addRoot: action,
      setRoots: action,
      addNode: action,
      addResponse: action,
      setResponses: action,
      deleteNodeCascadeById: action,
      cleanUpDanglingResponseIndexes: action,
      deleteNodeCascade: action,
      deleteBranchCascade: action,
      deleteLink: action,
      reset: action,
    });

    // this.clipboard = {
    //   node: null,
    //   originalNodeId: null,
    //   originalNodeIndex: null,
    //   nodes: [],
    //   nodeIdMap: new Map<number, number>(),
    // };
  }

  generateNextNodeIndex() {
    this.takenNodeIndexes = sortBy(this.takenNodeIndexes, (index) => index);
    const lastIndex = last(this.takenNodeIndexes);
    const nextNodeIndex = lastIndex ? lastIndex + 1 : 0;
    this.takenNodeIndexes.push(nextNodeIndex);
    return nextNodeIndex;
  }

  addNodeIdAndTreeIndexPair(nodeId: string, index: number) {
    this.nodeIdToTreeIndexMap.set(nodeId, index);
  }

  getTreeIndex(nodeId: string) {
    if (this.nodeIdToTreeIndexMap.has(nodeId)) {
      return this.nodeIdToTreeIndexMap.get(nodeId);
    }
    return null;
  }

  setRebuild(flag: boolean) {
    this.rebuild = flag;
    if (this.rebuild) {
      defer(() => {
        this.rebuild = false;
        if (this.activeNode) this.updateActiveNode(this.activeNode);
      });
    }
  }

  init(conversationAsset: ConversationAssetType) {
    const nextOwnerId = getId(conversationAsset.conversation);

    // save the active node if it's the same conversation
    if (this.ownerId !== nextOwnerId) {
      this.ownerId = nextOwnerId;
      this.activeNode = null;
      this.expandMap.clear();
    } else {
      this.ownerId = nextOwnerId;
    }

    this.reset();
  }

  /*
   * =========================
   * || ACTIVE NODE METHODS ||
   * =========================
   */
  updateActiveNode(node: NodeType | NodeLinkType) {
    this.setActiveNode(getId(node));
  }

  setActiveNode(nodeId: string) {
    this.activeNode = this.getNode(nodeId);
  }

  setActiveNodeByIndex(nodeIndex: number) {
    this.activeNode = this.getNodeByIndex(nodeIndex);
  }

  getActiveNodeId() {
    if (!this.activeNode) return null;
    return getId(this.activeNode);
  }

  clearActiveNode() {
    this.activeNode = null;
  }

  /*
   * =============================
   * || SCROLL TO  NODE METHODS ||
   * =============================
   */
  scrollToNode(nodeId: string, direction: 'up' | 'down', cachedTree?: HTMLElement) {
    // Quickly scroll in the given direction to force the virtual tree to load
    // At the same time check for the required node
    const tree = cachedTree || window.document.querySelector('.ReactVirtualized__Grid');
    const element = window.document.querySelector(`[data-node-id="${nodeId}"]`) as HTMLElement;

    // TODO: Stop the scrolling it the top or bottom has been reached

    if (element) {
      const scrollTop = element.offsetParent.offsetParent.offsetTop;
      const scrollLeft = element.offsetParent.offsetLeft - 50;
      tree.scrollTop = scrollTop;
      tree.scrollLeft = scrollLeft;
    } else if (!element) {
      if (direction === 'up') {
        tree.scrollTop -= 200;
      } else if (direction === 'down') {
        tree.scrollTop += 200;
      }
      defer(() => this.scrollToNode(nodeId, direction, tree));
    }
  }

  /*
   * ========================
   * || FOCUS NODE METHODS ||
   * ========================
   */
  setFocusedTreeNode(node: RSTNode) {
    this.focusedTreeNode = node;
  }

  clearFocusedNode() {
    this.focusedTreeNode = null;
  }

  /*
   * ============================
   * || NODE CLIPBOARD METHODS ||
   * ============================
   */
  setClipboard(nodeId: string) {
    const node = toJS(this.getNode(nodeId));
    if (node === null) return;

    const { type } = node;
    this.clipboard.originalNodeId = nodeId;
    this.clipboard.originalNodeIndex = node.index;

    const newNodeId = generateId();
    node.idRef.id = newNodeId;

    const { isNode } = detectType(type);

    if (isNode) {
      const newNodeIndex = this.generateNextNodeIndex();
      this.clipboard.nodeIdMap.set(node.index, newNodeIndex);
      node.index = newNodeIndex;
    }

    this.clipboard.node = node;
    const branches = isNode ? node.branches : [node];

    this.clipboard.nodes = flattenDeep(
      branches.map((branch) => {
        const { nextNodeIndex, auxiliaryLink } = branch;
        const newBranchId = generateId();
        branch.idRef.id = newBranchId;
        branch.parentId = newNodeId;

        // Change link indexes
        if (nextNodeIndex !== -1 && auxiliaryLink) {
          const copiedAndUpdatedNodeId = this.clipboard.nodeIdMap.get(branch.nextNodeIndex);
          if (copiedAndUpdatedNodeId) branch.nextNodeIndex = copiedAndUpdatedNodeId;
        }

        if (nextNodeIndex === -1 || auxiliaryLink) return [];

        const newNextNodeIndex = this.generateNextNodeIndex();
        branch.nextNodeIndex = newNextNodeIndex;
        return this.copyNodesRecursive(nextNodeIndex, newNextNodeIndex, newBranchId);
      }),
    );

    // this.clipboard = {
    //   originalNodeId: clipboardNodeId;
    //   originalNodeIndex: clipboardNodeIndex;
    // }
  }

  copyNodesRecursive(nodeIndex, newNextNodeIndex, newNodeParentId) {
    const node = toJS(this.getNodeByIndex(nodeIndex));
    const newNodeId = generateId();
    node.idRef.id = newNodeId;

    this.clipboard.nodeIdMap.set(node.index, newNextNodeIndex);
    node.index = newNextNodeIndex;
    node.parentId = newNodeParentId;

    const nodes = [
      node,
      ...node.branches.map((branch) => {
        const { nextNodeIndex, auxiliaryLink } = branch;
        const newBranchId = generateId();
        branch.idRef.id = newBranchId;
        branch.parentId = newNodeId;

        // Change link indexes
        if (nextNodeIndex !== -1 && auxiliaryLink) {
          const linkedNextNodeIndex = this.clipboard.nodeIdMap.get(branch.nextNodeIndex);

          // If the index exists in the copied branch then link to the new node,
          // otherwise keep the existing link
          if (linkedNextNodeIndex) {
            branch.nextNodeIndex = linkedNextNodeIndex;
          }
        }

        if (nextNodeIndex === -1 || auxiliaryLink) return [];

        const newNodeIndex = this.generateNextNodeIndex();
        branch.nextNodeIndex = newNodeIndex;
        return this.copyNodesRecursive(nextNodeIndex, newNodeIndex, newBranchId);
      }),
    ];
    return nodes;
  }

  clearClipboard() {
    // this.clipboard = {
    //   node: null,
    //   originalNodeId: null,
    //   originalNodeIndex: null,
    //   nodes: [],
    //   nodeIdMap: new Map(),
    // };
    this.clipboard = null;
  }

  pasteAsLinkFromClipboard(nodeId: string) {
    const response = this.getNode(nodeId);
    if (response === null) return;

    const { originalNodeIndex } = this.clipboard;

    if ('nextNodeIndex' in response) {
      response.nextNodeIndex = originalNodeIndex;
      response.auxiliaryLink = true;

      this.clearClipboard();
      this.setRebuild(true);
    }
  }

  pasteAsCopyFromClipboard(nodeId: string) {
    const { unsavedActiveConversationAsset: conversationAsset } = dataStore;

    const node = this.getNode(nodeId);
    const { node: clipboardNode, nodes: clipboardNodes } = this.clipboard;
    const { isRoot, isNode, isResponse } = detectType(node.type);
    const { isNode: clipboardIsNode, isResponse: clipboardIsResponse } = detectType(clipboardNode.type);

    if (isRoot || isResponse) {
      // Only allow nodes to be copied in if target is a root or response
      if (clipboardIsNode) {
        node.nextNodeIndex = clipboardNode.index;
        clipboardNode.parentId = nodeId;
        addNodes(conversationAsset, [clipboardNode, ...clipboardNodes]);
      } else {
        console.error('[NodeStore] Cannot copy - wrong node types');
      }
    } else if (isNode) {
      // Only allow response to be copied in
      if (clipboardIsResponse) {
        clipboardNode.parentId = nodeId;
        updateResponse(conversationAsset, node, clipboardNode);
        addNodes(conversationAsset, clipboardNodes);
      } else {
        console.error('[NodeStore] Cannot copy - wrong node types');
      }
    }

    this.clearClipboard();
    this.setRebuild(true);
  }

  /*
   * ==================
   * || NODE METHODS ||
   * ==================
   */

  setNode(node: NodeType | NodeLinkType) {
    const { unsavedActiveConversationAsset: conversationAsset } = dataStore;
    const { type } = node;

    if (conversationAsset === null) return;

    if (type === 'root') {
      updateRoot(conversationAsset, node);
    } else if (type === 'node') {
      updateNode(conversationAsset, node);
    } else if (type === 'response') {
      const parentNode = this.getNode(node.parentId);
      updateResponse(conversationAsset, parentNode, node);
    }
  }

  setNodeText(node: NodeType | NodeLinkType, text: string) {
    const { type } = node;
    if (type === 'node') {
      // FIXME: Implement immutability for nodes
      node.text = text;
    } else {
      // FIXME: Implement immutability for nodes
      node.responseText = text;
    }
  }

  setNodeActions(node: NodeType | NodeLinkType, actions: OperationCallType[] | null) {
    if (actions === null) node.actions = null;

    node.actions = {
      ops: actions,
    };
  }

  addNodeAction(node: NodeType | NodeLinkType, nodeAction: OperationCallType) {
    const { actions } = node;

    if (actions) {
      this.setNodeActions(node, [...(actions.ops || []), nodeAction]);
    } else {
      this.setNodeActions(node, [nodeAction]);
    }
  }

  setNodeConditions(node: NodeLinkType, conditions: OperationCallType[] | null) {
    if (conditions === null) node.conditions = null;

    node.conditions = {
      ops: conditions,
    };
  }

  addNodeCondition(node: NodeLinkType, nodeCondition: OperationCallType) {
    const { conditions } = node;

    if (conditions) {
      this.setNodeConditions(node, [...(conditions.ops || []), nodeCondition]);
    } else {
      this.setNodeConditions(node, [nodeCondition]);
    }
  }

  getNode(nodeId: string | undefined): NodeType | NodeLinkType | null {
    const { unsavedActiveConversationAsset: conversationAsset } = dataStore;
    if (!conversationAsset) {
      throw Error('Unsaved conversation is null or undefined');
    }

    const { roots, nodes } = conversationAsset.conversation;

    const root = roots.find((r) => getId(r) === nodeId);
    if (root) return root;

    let branch = null;
    const node = nodes.find((n) => {
      if (getId(n) === nodeId) return true;
      branch = n.branches.find((b) => getId(b) === nodeId);
      if (branch) return true;
      return false;
    });

    if (branch) return branch;
    if (node) return node;

    return null;
  }

  getNodeByIndex(index: number) {
    const { unsavedActiveConversationAsset: conversationAsset } = dataStore;
    if (conversationAsset === null) return null;

    const { nodes } = conversationAsset.conversation;

    const node = nodes.find((n) => n.index === index);
    if (node) return node;

    return null;
  }

  removeNode(node: NodeType | NodeLinkType, immediate = false) {
    const { unsavedActiveConversationAsset: conversationAsset } = dataStore;
    if (conversationAsset === null) return;

    const { roots, nodes } = conversationAsset.conversation;
    const { type } = node;
    const nodeId = getId(node);

    // Mark for delete
    if (type === 'root') {
      roots.forEach((r) => {
        const toDelete = getId(r) === nodeId;
        if (toDelete) r.deleting = true;
      });
    } else if (type === 'node') {
      nodes.forEach((n) => {
        const toDelete = getId(n) === nodeId;
        if (toDelete) n.deleting = true;
      });
    } else if (type === 'response') {
      nodes.forEach((n) => {
        n.branches.forEach((b) => {
          const toDelete = getId(b) === nodeId;
          if (toDelete) b.deleting = true;
        });
      });
    }

    if (immediate) {
      this.processDeletes();
    } else if (!NodeStore.deleteDeferred) {
      NodeStore.deleteDeferred = true;
      defer(this.processDeletes);
    }
  }

  processDeletes = () => {
    const { unsavedActiveConversationAsset: conversationAsset } = dataStore;
    if (conversationAsset === null) return;

    const { roots, nodes } = conversationAsset.conversation;

    nodes.forEach((n) => {
      remove(n.branches, (b) => b.deleting);
    });

    remove(nodes, (n) => n.deleting);
    remove(roots, (r) => r.deleting);

    defer(() => {
      NodeStore.deleteDeferred = false;
      this.setRebuild(true);
    });
  };

  addNodeByParentId(parentId: string) {
    const parent = this.getNode(parentId);

    if (parent === undefined || parent === null) {
      if (parentId === '0') {
        this.addRoot();
      }
    } else {
      const { type } = parent;

      if (type === 'node') {
        this.addResponse(parent);
      } else if (type === 'root' || type === 'response') {
        this.addNode(parent);
      }
    }
  }

  addRoot() {
    const { unsavedActiveConversationAsset: conversationAsset } = dataStore;
    if (conversationAsset === null) return;

    const root = createRoot();
    root.parentId = 0;
    updateRoot(conversationAsset, root);

    this.updateActiveNode(root);
    this.setRebuild(true);
  }

  setRoots(rootIds: string[]) {
    const { unsavedActiveConversationAsset: conversationAsset } = dataStore;
    if (conversationAsset === null) return;

    const roots = rootIds.map((rootId) => this.getNode(rootId));
    setRootsUtil(conversationAsset, roots);
  }

  addNode(parent: NodeLinkType) {
    const { unsavedActiveConversationAsset: conversationAsset } = dataStore;
    const { nextNodeIndex: existingNextNodeIndex } = parent;

    if (conversationAsset === null) return;

    if (existingNextNodeIndex === -1) {
      const nextNodeIndex = this.generateNextNodeIndex();
      const node = createNode(nextNodeIndex);
      node.parentId = getId(parent);
      parent.nextNodeIndex = node.index;

      if (parent.type === 'root') {
        updateRoot(conversationAsset, parent);
      } else if (parent.type === 'response') {
        const grandParentNode = this.getNode(parent.parentId) as NodeType;
        updateResponse(conversationAsset, grandParentNode, parent);
      }

      updateNode(conversationAsset, node);

      this.updateActiveNode(node);
      this.setRebuild(true);
    } else {
      console.warn("[Node Store] Will not create new node. Only one node per 'root' or 'response' allowed");
    }
  }

  addResponse(parent: NodeType) {
    const { unsavedActiveConversationAsset: conversationAsset } = dataStore;
    if (conversationAsset === null) return;

    const response = createResponse();
    response.parentId = getId(parent);
    updateResponse(conversationAsset, parent, response);

    this.updateActiveNode(response);
    this.setRebuild(true);
  }

  setResponses(parentId: string, responseIds: string[]) {
    const { unsavedActiveConversationAsset: conversationAsset } = dataStore;
    if (conversationAsset === null) return;

    const responses = responseIds.map((responseId) => this.getNode(responseId)) as NodeLinkType[];
    const parent = this.getNode(parentId) as NodeType;
    setResponses(conversationAsset, parent, responses);
  }

  deleteNodeCascadeById(id: string) {
    const node = this.getNode(id);
    if (node) {
      this.deleteNodeCascade(node);
      this.setRebuild(true);
    }
  }

  /*
   * Ensures that any node that refers to an id specified now points to 'END OF DIALOG' (-1)
   */
  cleanUpDanglingResponseIndexes(indexToClean: number) {
    const { unsavedActiveConversationAsset: conversationAsset } = dataStore;
    if (conversationAsset === null) return;

    const { roots, nodes } = conversationAsset.conversation;

    roots.forEach((root) => {
      const { nextNodeIndex } = root;
      if (nextNodeIndex === indexToClean) {
        root.nextNodeIndex = -1;
      }
    });

    nodes.forEach((node) => {
      const { branches } = node;

      branches.forEach((branch) => {
        const { nextNodeIndex } = branch;
        if (nextNodeIndex === indexToClean) {
          branch.nextNodeIndex = -1;
        }
      });
    });
  }

  deleteNodeCascade(node: NodeType | NodeLinkType) {
    if (node.type === 'node') {
      const { index, branches } = node;
      branches.forEach((branch) => {
        this.deleteBranchCascade(branch);
      });

      remove(this.takenNodeIndexes, (i) => i === index);
      this.removeNode(node);

      if (this.activeNode && getId(this.activeNode) === getId(node)) this.clearActiveNode();

      this.cleanUpDanglingResponseIndexes(index);
    } else if (node.type === 'response') {
      this.deleteBranchCascade(node);
    } else if (node.type === 'root') {
      this.deleteBranchCascade(node);
      this.removeNode(node);
      if (this.activeNode && getId(this.activeNode) === getId(node)) this.clearActiveNode();
    }
  }

  deleteBranchCascade(branch: NodeLinkType) {
    const { auxiliaryLink } = branch;

    if (!auxiliaryLink) {
      const nextNode = this.getNodeByIndex(branch.nextNodeIndex);
      if (nextNode) this.deleteNodeCascade(nextNode);
    }

    if (this.activeNode && getId(this.activeNode) === getId(branch)) this.clearActiveNode();
    this.removeNode(branch);
  }

  deleteLink(parentId: string) {
    const node = this.getNode(parentId) as NodeLinkType;
    node.nextNodeIndex = -1;
    node.auxiliaryLink = false;
    this.setRebuild(true);
  }

  getChildrenFromRoots(roots: NodeLinkType[]) {
    return roots.map((root) => {
      const rootId = getId(root);
      const isExpanded = this.isNodeExpanded(rootId);

      root.type = 'root';
      return {
        title: root.responseText,
        id: getId(root),
        parentId: null,
        type: 'root',
        expanded: isExpanded,
        children: this.getChildren(root),
      };
    });
  }

  setNodeExpansion(nodeId: string | undefined, flag: boolean) {
    if (!nodeId) return;

    this.expandMap.set(nodeId, flag);
  }

  isNodeExpanded(nodeId: string | undefined) {
    if (!nodeId) return false;

    const isNodeExpanded = this.expandMap.get(nodeId);
    if (isNodeExpanded === undefined) return true;
    return isNodeExpanded;
  }

  getNodeResponseIdsFromNodeId(nodeId: string) {
    const node = this.getNode(nodeId) as NodeType;
    return this.getNodeResponseIds(node);
  }

  getNodeResponseIds(node: NodeType) {
    return node.branches.map((branch) => getId(branch));
  }

  /*
   * =======================================
   * || DIALOG TREE DATA BUILDING METHODS ||
   * =======================================
   */
  getChildren(node: NodeLinkType): RSTNode[] | null {
    const { nextNodeIndex } = node; // root or response/branch

    // GUARD - End of branch so this would be tagged as a DIALOG END node
    if (nextNodeIndex === -1) return null;

    // GUARD - Error if there's a mistake in the file and
    //         no node exists of the index being looked for
    const childNode = this.getNodeByIndex(nextNodeIndex);
    if (!childNode) {
      console.error(`[Conversation Editor] Failed trying to find node ${nextNodeIndex}`);
      return null;
    }

    const { index: childIndex } = childNode;
    const childNodeId = getId(childNode);
    const isChildExpanded = this.isNodeExpanded(childNodeId);
    childNode.type = 'node';
    childNode.parentId = getId(node);
    this.takenNodeIndexes.push(childIndex);

    return [
      {
        title: childNode.text,
        id: childNodeId,
        parentId: getId(node),
        type: 'node',
        expanded: isChildExpanded,

        children: childNode.branches.map((branch): RSTNode => {
          const { auxiliaryLink } = branch;
          const branchNodeId = getId(branch);
          const isBranchExpanded = this.isNodeExpanded(branchNodeId);

          branch.type = 'response';
          branch.parentId = childNodeId;

          const isValidLink = auxiliaryLink && branch.nextNodeIndex !== -1;
          let branchChildren: RSTNode[] | null = [];

          if (auxiliaryLink) {
            if (isValidLink) {
              const linkNode = this.getNodeByIndex(branch.nextNodeIndex);

              branchChildren = [
                {
                  title: `[Link to NODE ${branch.nextNodeIndex}]`,
                  type: 'link',
                  linkId: linkNode ? getId(linkNode) : null,
                  linkIndex: branch.nextNodeIndex,
                  canDrag: false,
                  parentId: branchNodeId,
                },
              ];
            }
          } else {
            branchChildren = this.getChildren(branch);
          }

          return {
            title: branch.responseText,
            id: branchNodeId,
            parentId: childNodeId,
            type: 'response',
            expanded: isBranchExpanded,
            children: branchChildren,
          };
        }),
      },
    ];
  }

  reset = () => {
    this.focusedTreeNode = null;
    this.takenNodeIndexes = [];
    this.nodeIdToTreeIndexMap.clear();
  };
}

/* Statics */
NodeStore.deleteDeferred = false;

export const nodeStore = new NodeStore();

export { NodeStore };
