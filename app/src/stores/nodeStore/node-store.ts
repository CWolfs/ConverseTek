/* eslint-disable function-paren-newline */
import { observable, action, toJS, makeObservable } from 'mobx';
import defer from 'lodash.defer';
import remove from 'lodash.remove';
import sortBy from 'lodash.sortby';
import last from 'lodash.last';

import {
  getId,
  generateId,
  createPromptNode,
  createResponseNode,
  createRootNode,
  updateRootNode,
  updatePromptNode,
  updateResponseNode,
  setResponseNodes,
  setRootNodes,
  // addNodes,
} from '../../utils/conversation-utils';

import { dataStore } from '../dataStore';
// import { detectType, isNodeLinkType, isNodeType } from '../../utils/node-utils';
import { NodePromptType } from 'types/NodePromptType';
import { NodeElementType } from 'types/NodeElementType';
import { ConversationAssetType } from 'types/ConversationAssetType';
import { OperationCallType } from 'types/OperationCallType';
import { ClipboardType } from 'types/ClipboardType';

/* eslint-disable no-return-assign, no-param-reassign, class-methods-use-this */
class NodeStore {
  static deleteDeferred = false;

  activeNode: NodePromptType | NodeElementType | null = null;
  focusedTreeNode: RSTNode | null = null;
  ownerId: string | null = null;
  takenPromptNodeIndexes: number[] = [];
  expandMap = new Map<string, boolean>();
  clipboard: ClipboardType | null = null;
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
      // setClipboard: action,
      clearClipboard: action,
      // pasteAsLinkFromClipboard: action,
      // pasteAsCopyFromClipboard: action,
      setNode: action,
      setNodeText: action,
      setNodeActions: action,
      addNodeAction: action,
      setElementNodeConditions: action,
      addNodeCondition: action,
      processDeletes: action,
      addNodeByParentId: action,
      addRootNode: action,
      setRootNodesByIds: action,
      getChildrenFromRoots: action,
      addPromptNode: action,
      addResponseNode: action,
      setResponseNodesByIds: action,
      moveResponseNode: action,
      movePromptNode: action,
      deleteNodeCascadeById: action,
      cleanUpDanglingResponseIndexes: action,
      deleteNodeCascade: action,
      deleteBranchCascade: action,
      deleteLink: action,
      reset: action,
    });
  }

  generateNextPromptNodeIndex() {
    this.takenPromptNodeIndexes = sortBy(this.takenPromptNodeIndexes, (index) => index);
    const lastIndex = last(this.takenPromptNodeIndexes) ?? -1;
    const nextPromptNodeIndex = lastIndex + 1;
    this.takenPromptNodeIndexes.push(nextPromptNodeIndex);
    return nextPromptNodeIndex;
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
      defer(
        action(() => {
          this.rebuild = false;
          if (this.activeNode) this.updateActiveNode(this.activeNode);
        }),
      );
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
  updateActiveNode(node: NodePromptType | NodeElementType) {
    this.setActiveNode(getId(node));
  }

  setActiveNode(nodeId: string) {
    this.activeNode = this.getNode(nodeId);
  }

  setActiveNodeByIndex(nodeIndex: number) {
    this.activeNode = this.getPromptNodeByIndex(nodeIndex);
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

    if (tree == null) throw Error('Tree not found for autoscroll to node. This should not happen.');

    // TODO: Stop the scrolling it the top or bottom has been reached

    if (element) {
      const scrollTop = ((element.offsetParent as HTMLElement)?.offsetParent as HTMLElement)?.offsetTop;
      const scrollLeft = (element.offsetParent as HTMLElement)?.offsetLeft - 50;
      tree.scrollTop = scrollTop;
      tree.scrollLeft = scrollLeft;
    } else if (!element) {
      if (direction === 'up') {
        tree.scrollTop -= 200;
      } else if (direction === 'down') {
        tree.scrollTop += 200;
      }
      defer(() => this.scrollToNode(nodeId, direction, tree as HTMLElement));
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
  // setClipboard(promptId: string) {}

  // FIXME: Rewrite copy/pasting/linking
  // setClipboard(nodeId: string) {
  //   const tempClipboard: Partial<ClipboardType> = {
  //     nodeIdMap: new Map<number, number>(),
  //   };

  //   const node = toJS(this.getNode(nodeId));
  //   if (node === null) return;

  //   tempClipboard.originalNodeId = nodeId;
  //   tempClipboard.originalNodeIndex = (isNodeType(node) && node.index) || null;

  //   const newNodeId = generateId();
  //   node.idRef.id = newNodeId;

  //   if (isNodeType(node)) {
  //     const newNodeIndex = this.generateNextNodeIndex();
  //     tempClipboard.nodeIdMap?.set(node.index, newNodeIndex);
  //     node.index = newNodeIndex;
  //   }

  //   tempClipboard.node = node;
  //   const branches = isNodeType(node) ? node.branches : [node];

  //   tempClipboard.nodes = flattenDeep(
  //     branches.map((branch) => {
  //       const { nextNodeIndex, auxiliaryLink } = branch;
  //       const newBranchId = generateId();
  //       branch.idRef.id = newBranchId;
  //       branch.parentId = newNodeId;

  //       // Change link indexes
  //       if (nextNodeIndex !== -1 && auxiliaryLink) {
  //         const copiedAndUpdatedNodeId = tempClipboard.nodeIdMap?.get(branch.nextNodeIndex);
  //         if (copiedAndUpdatedNodeId) branch.nextNodeIndex = copiedAndUpdatedNodeId;
  //       }

  //       if (nextNodeIndex === -1 || auxiliaryLink) return [];

  //       const newNextNodeIndex = this.generateNextNodeIndex();
  //       branch.nextNodeIndex = newNextNodeIndex;
  //       return this.copyNodesRecursive(nextNodeIndex, newNextNodeIndex, newBranchId);
  //     }),
  //   );

  //   this.clipboard = tempClipboard as Clipboard;
  // }

  // FIXME: Rewrite copy/pasting/linking as there are known bugs and I can't resolve this type mess

  // copyNodesRecursive(nodeIndex: number, newNextNodeIndex: number, newNodeParentId: string): (NodeType | NodeLinkType)[] {
  //   if (this.clipboard == null) throw Error('Clipboard is null or undefined. Cannot copy nodes with no clipboard');

  //   const node = toJS(this.getNodeByIndex(nodeIndex));
  //   if (!node) return [];

  //   const newNodeId = generateId();
  //   node.idRef.id = newNodeId;

  //   this.clipboard.nodeIdMap.set(node.index, newNextNodeIndex);
  //   node.index = newNextNodeIndex;
  //   node.parentId = newNodeParentId;

  //   const nodes: (NodeType | NodeLinkType)[] = [
  //     node,
  //     ...node.branches.map((branch: NodeLinkType) => {
  //       const { nextNodeIndex, auxiliaryLink } = branch;
  //       const newBranchId = generateId();
  //       branch.idRef.id = newBranchId;
  //       branch.parentId = newNodeId;

  //       // Change link indexes
  //       if (nextNodeIndex !== -1 && auxiliaryLink) {
  //         const linkedNextNodeIndex = this.clipboard.nodeIdMap.get(branch.nextNodeIndex);

  //         // If the index exists in the copied branch then link to the new node,
  //         // otherwise keep the existing link
  //         if (linkedNextNodeIndex) {
  //           branch.nextNodeIndex = linkedNextNodeIndex;
  //         }
  //       }

  //       if (nextNodeIndex === -1 || auxiliaryLink) return [];

  //       const newNodeIndex = this.generateNextNodeIndex();
  //       branch.nextNodeIndex = newNodeIndex;
  //       return this.copyNodesRecursive(nextNodeIndex, newNodeIndex, newBranchId);
  //     }),
  //   ];
  //   return nodes;
  // }

  clearClipboard() {
    this.clipboard = null;
  }

  // FIXME: Rewrite copy/pasting/linking
  // pasteAsLinkFromClipboard(nodeId: string) {
  //   const response = this.getNode(nodeId);
  //   if (response === null) return;

  //   if (this.clipboard == null) throw Error('Clipboard is null or undefined. Cannot paste as link from clipboard.');

  //   const { originalNodeIndex } = this.clipboard;

  //   if ('nextNodeIndex' in response) {
  //     if (originalNodeIndex) response.nextNodeIndex = originalNodeIndex;
  //     response.auxiliaryLink = true;

  //     this.clearClipboard();
  //     this.setRebuild(true);
  //   }
  // }

  // FIXME: Rewrite copy/pasting/linking
  // pasteAsCopyFromClipboard(nodeId: string) {
  //   const { unsavedActiveConversationAsset: conversationAsset } = dataStore;
  //   if (this.clipboard == null) throw Error('Clipboard is null or undefined. Cannot paste as copy from clipboard.');
  //   if (conversationAsset == null) throw Error('Conversation is null. Cannot paste as copy from cipboard');

  //   const node = this.getNode(nodeId);
  //   if (node == null) throw Error('Node is null.');

  //   const { node: clipboardNode, nodes: clipboardNodes } = this.clipboard;
  //   const { isRoot, isNode, isResponse } = detectType(node.type);

  //   if (isRoot || isResponse) {
  //     // Only allow nodes to be copied in if target is a root or response
  //     if (isNodeType(clipboardNode)) {
  //       if (!isNodeLinkType(node)) throw Error('Target node for paste as copy is not a NodeLink. It must be a NodeLink.');
  //       node.nextNodeIndex = clipboardNode.index;
  //       clipboardNode.parentId = nodeId;
  //       addNodes(conversationAsset, [clipboardNode, ...(clipboardNodes as NodeType[])]);
  //     } else {
  //       console.error('[NodeStore] Cannot copy - wrong node types');
  //     }
  //   } else if (isNode) {
  //     // Only allow response to be copied in
  //     if (isNodeLinkType(clipboardNode)) {
  //       clipboardNode.parentId = nodeId;
  //       updateResponse(conversationAsset, node as NodeType, clipboardNode);
  //       addNodes(conversationAsset, clipboardNodes as NodeType[]);
  //     } else {
  //       console.error('[NodeStore] Cannot copy - wrong node types');
  //     }
  //   }

  //   this.clearClipboard();
  //   this.setRebuild(true);
  // }

  /*
   * ==================
   * || NODE METHODS ||
   * ==================
   */

  setNode(node: NodePromptType | NodeElementType) {
    const { unsavedActiveConversationAsset: conversationAsset } = dataStore;
    const { type } = node;

    if (conversationAsset === null) return;

    if (type === 'root') {
      updateRootNode(conversationAsset, node);
    } else if (type === 'node') {
      updatePromptNode(conversationAsset, node);
    } else if (type === 'response') {
      const parentPromptNode = this.getNode(node.parentId) as NodePromptType;
      updateResponseNode(conversationAsset, parentPromptNode, node);
    }
  }

  setNodeText(node: NodePromptType | NodeElementType, text: string) {
    const { type } = node;
    if (type === 'node') {
      node.text = text;
    } else {
      node.responseText = text;
    }
  }

  setNodeActions(node: NodePromptType | NodeElementType, actions: OperationCallType[] | null) {
    if (actions === null) node.actions = null;

    node.actions = {
      ops: actions,
    };
  }

  addNodeAction(node: NodePromptType | NodeElementType, nodeAction: OperationCallType) {
    const { actions } = node;

    if (actions) {
      this.setNodeActions(node, [...(actions.ops || []), nodeAction]);
    } else {
      this.setNodeActions(node, [nodeAction]);
    }
  }

  setElementNodeConditions(elementNode: NodeElementType, conditions: OperationCallType[] | null) {
    if (conditions === null) elementNode.conditions = null;

    elementNode.conditions = {
      ops: conditions,
    };
  }

  addNodeCondition(elementNode: NodeElementType, elementNodeCondition: OperationCallType) {
    const { conditions } = elementNode;

    if (conditions) {
      this.setElementNodeConditions(elementNode, [...(conditions.ops || []), elementNodeCondition]);
    } else {
      this.setElementNodeConditions(elementNode, [elementNodeCondition]);
    }
  }

  getNode(nodeId: string | undefined): NodePromptType | NodeElementType | null {
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

  getPromptNodeByIndex(index: number): NodePromptType | null {
    const { unsavedActiveConversationAsset: conversationAsset } = dataStore;
    if (conversationAsset === null) return null;

    const { nodes } = conversationAsset.conversation;

    const node = nodes.find((n) => n.index === index);
    if (node) return node;

    return null;
  }

  removeNode(node: NodePromptType | NodeElementType, immediate = false): void {
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

  processDeletes = (): void => {
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

  addNodeByParentId(parentId: string): void {
    const parent = this.getNode(parentId);

    if (parent == null) {
      if (parentId === '0') {
        this.addRootNode();
      }
    } else {
      const { type } = parent;

      if (type === 'node') {
        this.addResponseNode(parent);
      } else if (type === 'root' || type === 'response') {
        this.addPromptNode(parent);
      }
    }
  }

  addRootNode(): void {
    const { unsavedActiveConversationAsset: conversationAsset } = dataStore;
    if (conversationAsset === null) return;

    const rootNode = createRootNode();
    rootNode.parentId = '0';
    updateRootNode(conversationAsset, rootNode);

    this.updateActiveNode(rootNode);
    this.setRebuild(true);
  }

  setRootNodesByIds(rootNodeIds: string[]) {
    const { unsavedActiveConversationAsset: conversationAsset } = dataStore;
    if (conversationAsset === null) return;

    const rootNodes = rootNodeIds.map((rootNodeId: string) => this.getNode(rootNodeId));
    setRootNodes(conversationAsset, rootNodes as NodeElementType[]);
  }

  addPromptNode(parentElementNode: NodeElementType) {
    const { unsavedActiveConversationAsset: conversationAsset } = dataStore;
    const { nextNodeIndex: existingNextPromptNodeIndex } = parentElementNode;

    if (conversationAsset === null) return;

    if (existingNextPromptNodeIndex === -1) {
      const nextPromptNodeIndex = this.generateNextPromptNodeIndex();
      const node = createPromptNode(nextPromptNodeIndex);
      node.parentId = getId(parentElementNode);
      parentElementNode.nextNodeIndex = node.index;

      if (parentElementNode.type === 'root') {
        updateRootNode(conversationAsset, parentElementNode);
      } else if (parentElementNode.type === 'response') {
        const grandParentNode = this.getNode(parentElementNode.parentId) as NodePromptType;
        updateResponseNode(conversationAsset, grandParentNode, parentElementNode);
      }

      updatePromptNode(conversationAsset, node);

      this.updateActiveNode(node);
      this.setRebuild(true);
    } else {
      console.warn("[Node Store] Will not create new node. Only one node per 'root' or 'response' allowed");
    }
  }

  addResponseNode(parentPromptNode: NodePromptType) {
    const { unsavedActiveConversationAsset: conversationAsset } = dataStore;
    if (conversationAsset === null) return;

    const responseNode = createResponseNode();
    responseNode.parentId = getId(parentPromptNode);
    updateResponseNode(conversationAsset, parentPromptNode, responseNode);

    this.updateActiveNode(responseNode);
    this.setRebuild(true);
  }

  setResponseNodesByIds(parentId: string, responseIds: string[]) {
    const { unsavedActiveConversationAsset: conversationAsset } = dataStore;
    if (conversationAsset === null) return;

    const responseNodes = responseIds.map((responseId) => this.getNode(responseId)) as NodeElementType[];
    const parentPromptNode = this.getNode(parentId) as NodePromptType;
    setResponseNodes(conversationAsset, parentPromptNode, responseNodes);
  }

  moveResponseNode(
    responseToMoveId: string,
    newParentNodeId: string,
    newParentResponseOrder: {
      id: string;
    }[],
  ): void {
    const { unsavedActiveConversationAsset: conversationAsset } = dataStore;
    if (conversationAsset === null) return;

    // Get Response, Old Parent Node and New Parent Node
    const responseNode = this.getNode(responseToMoveId) as NodeElementType;
    const newParentPromptNode = this.getNode(newParentNodeId) as NodePromptType;
    const oldParentPromptNode = this.getNode(responseNode.parentId) as NodePromptType;

    responseNode.parentId = newParentNodeId;

    const updatedNewParentBranches = [...newParentResponseOrder.map((responseNodeId) => this.getNode(responseNodeId.id))] as NodeElementType[];
    newParentPromptNode.branches = updatedNewParentBranches;

    // Don't remove if within the same parent Node
    if (responseNode.parentId !== newParentNodeId) {
      const updatedOldParentBranches = oldParentPromptNode.branches.filter(
        (responseNode: NodeElementType) => getId(responseNode) !== responseToMoveId,
      );
      oldParentPromptNode.branches = updatedOldParentBranches;
    }
  }

  movePromptNode(nodeToMoveId: string, nextParentResponseId: string, previousParentResponseId: string): void {
    const nodeBeingMoved = nodeStore.getNode(nodeToMoveId) as NodePromptType;
    const { index: nodeIndex } = nodeBeingMoved;

    // Set new root/response parent 'nextNodeIndex' to node 'index'
    const nextParentElementNode = nodeStore.getNode(nextParentResponseId) as NodeElementType;
    if (nextParentElementNode == null) throw Error(`Next parent root/response '${nextParentResponseId}' not found`);
    nextParentElementNode.nextNodeIndex = nodeIndex;

    // Set previous root/response parent 'nextNodeIndex' to -1
    const previousParentElementNode = nodeStore.getNode(previousParentResponseId) as NodeElementType;
    if (previousParentElementNode == null) throw Error(`Previous parent root/response '${previousParentResponseId}' not found`);
    previousParentElementNode.nextNodeIndex = -1;
  }

  deleteNodeCascadeById(id: string): void {
    const node = this.getNode(id);
    if (node) {
      this.deleteNodeCascade(node);
      this.setRebuild(true);
    }
  }

  /*
   * Ensures that any node that refers to an id specified now points to 'END OF DIALOG' (-1)
   */
  cleanUpDanglingResponseIndexes(indexToClean: number): void {
    const { unsavedActiveConversationAsset: conversationAsset } = dataStore;
    if (conversationAsset === null) return;

    const { roots, nodes } = conversationAsset.conversation;

    roots.forEach((rootNode: NodeElementType) => {
      const { nextNodeIndex } = rootNode;
      if (nextNodeIndex === indexToClean) {
        rootNode.nextNodeIndex = -1;
      }
    });

    nodes.forEach((promptNode: NodePromptType) => {
      const { branches } = promptNode;

      branches.forEach((elementNode: NodeElementType) => {
        const { nextNodeIndex } = elementNode;
        if (nextNodeIndex === indexToClean) {
          elementNode.nextNodeIndex = -1;
        }
      });
    });
  }

  deleteNodeCascade(node: NodePromptType | NodeElementType): void {
    if (node.type === 'node') {
      const { index, branches } = node;
      branches.forEach((branch) => {
        this.deleteBranchCascade(branch);
      });

      remove(this.takenPromptNodeIndexes, (i) => i === index);
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

  deleteBranchCascade(elementNode: NodeElementType): void {
    const { auxiliaryLink } = elementNode;

    if (!auxiliaryLink) {
      const nextNode = this.getPromptNodeByIndex(elementNode.nextNodeIndex);
      if (nextNode) this.deleteNodeCascade(nextNode);
    }

    if (this.activeNode && getId(this.activeNode) === getId(elementNode)) this.clearActiveNode();
    this.removeNode(elementNode);
  }

  deleteLink(parentId: string): void {
    const elementNode = this.getNode(parentId) as NodeElementType;
    elementNode.nextNodeIndex = -1;
    elementNode.auxiliaryLink = false;
    this.setRebuild(true);
  }

  getChildrenFromRoots(rootNodes: NodeElementType[]): RSTNode[] {
    return rootNodes.map((rootNode) => {
      const rootId = getId(rootNode);
      const isExpanded = this.isNodeExpanded(rootId);

      // FIXME: Preprocess data for setting things like rootNode.type instead of setting it in a getter
      rootNode.type = 'root';

      return {
        title: rootNode.responseText,
        id: getId(rootNode),
        parentId: null,
        type: 'root',
        expanded: isExpanded,
        children: this.getChildrenFromElementNode(rootNode),
      };
    });
  }

  setNodeExpansion(nodeId: string | undefined, flag: boolean): void {
    if (!nodeId) return;

    this.expandMap.set(nodeId, flag);
  }

  isNodeExpanded(nodeId: string | undefined): boolean {
    if (!nodeId) return false;

    const isNodeExpanded = this.expandMap.get(nodeId);
    if (isNodeExpanded === undefined) return true;
    return isNodeExpanded;
  }

  getNodeResponseIdsFromNodeId(nodeId: string): string[] {
    const promptNode = this.getNode(nodeId) as NodePromptType;
    return this.getNodeResponseIds(promptNode);
  }

  getNodeResponseIds(node: NodePromptType): string[] {
    return node.branches.map((branch) => getId(branch));
  }

  /*
   * =======================================
   * || DIALOG TREE DATA BUILDING METHODS ||
   * =======================================
   */
  getChildrenFromElementNode(elementNode: NodeElementType): RSTNode[] | null {
    const { nextNodeIndex } = elementNode; // root or response/branch

    // GUARD - End of branch so this would be tagged as a DIALOG END node
    if (nextNodeIndex === -1) return null;

    // GUARD - Error if there's a mistake in the file and
    //         no node exists of the index being looked for
    const childPromptNode = this.getPromptNodeByIndex(nextNodeIndex);
    if (!childPromptNode) {
      console.error(`[Conversation Editor] Failed trying to find prompt node ${nextNodeIndex}`);
      return null;
    }

    const { index: childPromptIndex } = childPromptNode;
    const childNodeId = getId(childPromptNode);
    const isChildExpanded = this.isNodeExpanded(childNodeId);
    childPromptNode.type = 'node';
    childPromptNode.parentId = getId(elementNode);
    this.takenPromptNodeIndexes.push(childPromptIndex);

    return [
      {
        title: childPromptNode.text,
        id: childNodeId,
        parentId: getId(elementNode),
        type: 'node',
        expanded: isChildExpanded,

        children: childPromptNode.branches.map((elementNode: NodeElementType): RSTNode => {
          const { auxiliaryLink } = elementNode;
          const elementNodeId = getId(elementNode);
          const isElementNodeExpanded = this.isNodeExpanded(elementNodeId);

          elementNode.type = 'response';
          elementNode.parentId = childNodeId;

          const isValidLink = auxiliaryLink && elementNode.nextNodeIndex !== -1;
          let elementNodeChildren: RSTNode[] | null = [];

          if (auxiliaryLink) {
            if (isValidLink) {
              const linkNode = this.getPromptNodeByIndex(elementNode.nextNodeIndex);

              elementNodeChildren = [
                {
                  title: `[Link to NODE ${elementNode.nextNodeIndex}]`,
                  type: 'link',
                  linkId: linkNode ? getId(linkNode) : null,
                  linkIndex: elementNode.nextNodeIndex,
                  canDrag: false,
                  parentId: elementNodeId,
                },
              ];
            }
          } else {
            elementNodeChildren = this.getChildrenFromElementNode(elementNode);
          }

          return {
            title: elementNode.responseText,
            id: elementNodeId,
            parentId: childNodeId,
            type: 'response',
            expanded: isElementNodeExpanded,
            children: elementNodeChildren,
          };
        }),
      },
    ];
  }

  reset = () => {
    this.focusedTreeNode = null;
    this.takenPromptNodeIndexes = [];
    this.nodeIdToTreeIndexMap.clear();
  };
}

export const nodeStore = new NodeStore();

export { NodeStore };
