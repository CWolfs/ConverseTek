/* eslint-disable function-paren-newline */
import { observable, action, toJS, makeObservable } from 'mobx';
import defer from 'lodash.defer';
import remove from 'lodash.remove';
import sortBy from 'lodash.sortby';
import last from 'lodash.last';
import structuredClone from '@ungap/structured-clone';

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
} from 'utils/conversation-utils';
import { ClipboardType, ConversationAssetType, ElementNodeType, OperationCallType, PromptNodeType } from 'types';
import { isPromptNodeType } from 'utils/node-utils';

import { dataStore } from '../dataStore';

/* eslint-disable no-return-assign, no-param-reassign, class-methods-use-this */
class NodeStore {
  static deleteDeferred = false;

  activeNode: PromptNodeType | ElementNodeType | null = null;
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
      setClipboard: action,
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
  updateActiveNode(node: PromptNodeType | ElementNodeType) {
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

  /**
   * Copy all nodes, responses and links starting from the selected node
   * Make real copies with new ids so if the user copies, then deletes a branch/node(s) then they can still paste the copies untouched
   * @param nodeId node id to start copying from
   * @returns
   */
  setClipboard(nodeId: string) {
    const tempClipboard: Partial<ClipboardType> = {
      nodeIdMap: new Map<number, number>(),
    };

    const node = structuredClone<PromptNodeType | ElementNodeType | null>(toJS(this.getNode(nodeId)));
    if (node === null) return;

    tempClipboard.originalNodeId = nodeId;

    // Operating on the copied node so no need to worry about reused references
    const newNodeId = generateId();
    node.idRef.id = newNodeId;

    if (isPromptNodeType(node)) {
      const { index } = node;

      tempClipboard.originalNodeIndex = index;

      // Creates a new index for the deep copied prompt node
      const newNodeIndex = this.generateNextPromptNodeIndex();
      tempClipboard.nodeIdMap?.set(index, newNodeIndex);

      // Set the new index on the new prompt node
      node.index = newNodeIndex;
    }

    tempClipboard.copiedNode = node;

    // If a PromptNodeType then iterate over the branches and copy the ElementNodeTypes too
    // This effectively builds a flat array of nodes (ElementNodeTypes and the follow resolved PromptNodeTypes)
    const branches = isPromptNodeType(node) ? node.branches : [node];
    tempClipboard.nodes = branches.reduce((result: PromptNodeType[], elementNode: ElementNodeType) => {
      const { nextNodeIndex } = elementNode;

      const shouldTraverseNextNodeIndex = this.updateResponseNodesDuringCopy(tempClipboard as ClipboardType, elementNode, newNodeId);

      if (shouldTraverseNextNodeIndex) {
        const { nextNodeIndex: newNextPromptNodeIndex } = elementNode;
        this.copyPromptNodesRecursiveIntoResult(result, tempClipboard as ClipboardType, nextNodeIndex, newNextPromptNodeIndex, elementNode.idRef.id);
      }

      return result;
    }, [] as PromptNodeType[]);

    console.log('copy finished', tempClipboard);
    this.clipboard = tempClipboard as ClipboardType;
  }

  /**
   *
   * @param tempClipboard
   * @param elementNode
   * @param newNodeId
   * @returns shouldTraverseNextNodeIndex
   */
  updateResponseNodesDuringCopy(tempClipboard: ClipboardType, elementNode: ElementNodeType, newNodeId: string): boolean {
    const { nextNodeIndex, auxiliaryLink } = elementNode;

    // Operating on the copied node's branches so no need to run a deep copy on these ElementNodeTypes
    const newElementNodeId = generateId();
    elementNode.idRef.id = newElementNodeId;
    elementNode.parentId = newNodeId;

    // Change link indexes
    if (nextNodeIndex !== -1 && auxiliaryLink) {
      // If any response node is a link to a prompt node that has been copied (and has a cached new prompt node index) - use the new cached prompt node index
      const copiedAndUpdatedNodeId = tempClipboard.nodeIdMap?.get(elementNode.nextNodeIndex);
      if (copiedAndUpdatedNodeId) elementNode.nextNodeIndex = copiedAndUpdatedNodeId;
    }

    // If the response goes nowhere (-1) or is a link to another node (don't follow the link for a copy) then continue on the main reduce
    if (nextNodeIndex === -1 || auxiliaryLink) return false;

    // No more links exist at this point onward so generate a new index for the next prompt node on the response node
    const newNextPromptNodeIndex = this.generateNextPromptNodeIndex();
    elementNode.nextNodeIndex = newNextPromptNodeIndex;

    return true;
  }

  copyPromptNodesRecursiveIntoResult(
    result: PromptNodeType[],
    tempClipboard: ClipboardType,
    nodeIndex: number,
    newNextNodeIndex: number,
    newNodeParentId: string,
  ): void {
    if (tempClipboard == null) throw Error('Clipboard is null or undefined. Cannot copy nodes with no clipboard');

    const promptNode = structuredClone<PromptNodeType | null>(toJS(this.getPromptNodeByIndex(nodeIndex)));
    if (!promptNode) return;

    const { index } = promptNode;

    // Cache the new prompt node index for possible reuse later for responses that might point or link to it
    tempClipboard.nodeIdMap.set(index, newNextNodeIndex);

    // Operating on the copied node so no need to worry about reused references
    const newNodeId = generateId();
    promptNode.idRef.id = newNodeId;
    promptNode.index = newNextNodeIndex;
    promptNode.parentId = newNodeParentId;

    // Store the node
    result.push(promptNode);

    // ...and follow its responses into their nodes recursively
    promptNode.branches.forEach((elementNode: ElementNodeType) => {
      const { nextNodeIndex } = elementNode;

      const shouldTraverseNextNodeIndex = this.updateResponseNodesDuringCopy(tempClipboard, elementNode, newNodeId);

      if (shouldTraverseNextNodeIndex) {
        const { nextNodeIndex: newNextPromptNodeIndex } = elementNode;
        this.copyPromptNodesRecursiveIntoResult(result, tempClipboard, nextNodeIndex, newNextPromptNodeIndex, elementNode.idRef.id);
      }
    });
  }

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

  setNode(node: PromptNodeType | ElementNodeType) {
    const { unsavedActiveConversationAsset: conversationAsset } = dataStore;
    const { type } = node;

    if (conversationAsset === null) return;

    if (type === 'root') {
      updateRootNode(conversationAsset, node);
    } else if (type === 'node') {
      updatePromptNode(conversationAsset, node);
    } else if (type === 'response') {
      const parentPromptNode = this.getNode(node.parentId) as PromptNodeType;
      updateResponseNode(conversationAsset, parentPromptNode, node);
    }
  }

  setNodeText(node: PromptNodeType | ElementNodeType, text: string) {
    const { type } = node;
    if (type === 'node') {
      node.text = text;
    } else {
      node.responseText = text;
    }
  }

  setNodeActions(node: PromptNodeType | ElementNodeType, actions: OperationCallType[] | null) {
    if (actions === null) node.actions = null;

    node.actions = {
      ops: actions,
    };
  }

  addNodeAction(node: PromptNodeType | ElementNodeType, nodeAction: OperationCallType) {
    const { actions } = node;

    if (actions) {
      this.setNodeActions(node, [...(actions.ops || []), nodeAction]);
    } else {
      this.setNodeActions(node, [nodeAction]);
    }
  }

  setElementNodeConditions(elementNode: ElementNodeType, conditions: OperationCallType[] | null) {
    if (conditions === null) elementNode.conditions = null;

    elementNode.conditions = {
      ops: conditions,
    };
  }

  addNodeCondition(elementNode: ElementNodeType, elementNodeCondition: OperationCallType) {
    const { conditions } = elementNode;

    if (conditions) {
      this.setElementNodeConditions(elementNode, [...(conditions.ops || []), elementNodeCondition]);
    } else {
      this.setElementNodeConditions(elementNode, [elementNodeCondition]);
    }
  }

  getNode(nodeId: string | undefined): PromptNodeType | ElementNodeType | null {
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

  getPromptNodeByIndex(index: number): PromptNodeType | null {
    const { unsavedActiveConversationAsset: conversationAsset } = dataStore;
    if (conversationAsset === null) return null;

    const { nodes } = conversationAsset.conversation;

    const node = nodes.find((n) => n.index === index);
    if (node) return node;

    return null;
  }

  removeNode(node: PromptNodeType | ElementNodeType, immediate = false): void {
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
    setRootNodes(conversationAsset, rootNodes as ElementNodeType[]);
  }

  addPromptNode(parentElementNode: ElementNodeType) {
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
        const grandParentNode = this.getNode(parentElementNode.parentId) as PromptNodeType;
        updateResponseNode(conversationAsset, grandParentNode, parentElementNode);
      }

      updatePromptNode(conversationAsset, node);

      this.updateActiveNode(node);
      this.setRebuild(true);
    } else {
      console.warn("[Node Store] Will not create new node. Only one node per 'root' or 'response' allowed");
    }
  }

  addResponseNode(parentPromptNode: PromptNodeType) {
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

    const responseNodes = responseIds.map((responseId) => this.getNode(responseId)) as ElementNodeType[];
    const parentPromptNode = this.getNode(parentId) as PromptNodeType;
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
    const responseNode = this.getNode(responseToMoveId) as ElementNodeType;
    const newParentPromptNode = this.getNode(newParentNodeId) as PromptNodeType;
    const oldParentPromptNode = this.getNode(responseNode.parentId) as PromptNodeType;

    responseNode.parentId = newParentNodeId;

    const updatedNewParentBranches = [...newParentResponseOrder.map((responseNodeId) => this.getNode(responseNodeId.id))] as ElementNodeType[];
    newParentPromptNode.branches = updatedNewParentBranches;

    // Don't remove if within the same parent Node
    if (responseNode.parentId !== newParentNodeId) {
      const updatedOldParentBranches = oldParentPromptNode.branches.filter(
        (responseNode: ElementNodeType) => getId(responseNode) !== responseToMoveId,
      );
      oldParentPromptNode.branches = updatedOldParentBranches;
    }
  }

  movePromptNode(nodeToMoveId: string, nextParentResponseId: string, previousParentResponseId: string): void {
    const nodeBeingMoved = nodeStore.getNode(nodeToMoveId) as PromptNodeType;
    const { index: nodeIndex } = nodeBeingMoved;

    // Set new root/response parent 'nextNodeIndex' to node 'index'
    const nextParentElementNode = nodeStore.getNode(nextParentResponseId) as ElementNodeType;
    if (nextParentElementNode == null) throw Error(`Next parent root/response '${nextParentResponseId}' not found`);
    nextParentElementNode.nextNodeIndex = nodeIndex;

    // Set previous root/response parent 'nextNodeIndex' to -1
    const previousParentElementNode = nodeStore.getNode(previousParentResponseId) as ElementNodeType;
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

    roots.forEach((rootNode: ElementNodeType) => {
      const { nextNodeIndex } = rootNode;
      if (nextNodeIndex === indexToClean) {
        rootNode.nextNodeIndex = -1;
      }
    });

    nodes.forEach((promptNode: PromptNodeType) => {
      const { branches } = promptNode;

      branches.forEach((elementNode: ElementNodeType) => {
        const { nextNodeIndex } = elementNode;
        if (nextNodeIndex === indexToClean) {
          elementNode.nextNodeIndex = -1;
        }
      });
    });
  }

  deleteNodeCascade(node: PromptNodeType | ElementNodeType): void {
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

  deleteBranchCascade(elementNode: ElementNodeType): void {
    const { auxiliaryLink } = elementNode;

    if (!auxiliaryLink) {
      const nextNode = this.getPromptNodeByIndex(elementNode.nextNodeIndex);
      if (nextNode) this.deleteNodeCascade(nextNode);
    }

    if (this.activeNode && getId(this.activeNode) === getId(elementNode)) this.clearActiveNode();
    this.removeNode(elementNode);
  }

  deleteLink(parentId: string): void {
    const elementNode = this.getNode(parentId) as ElementNodeType;
    elementNode.nextNodeIndex = -1;
    elementNode.auxiliaryLink = false;
    this.setRebuild(true);
  }

  getChildrenFromRoots(rootNodes: ElementNodeType[]): RSTNode[] {
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
    const promptNode = this.getNode(nodeId) as PromptNodeType;
    return this.getNodeResponseIds(promptNode);
  }

  getNodeResponseIds(node: PromptNodeType): string[] {
    return node.branches.map((branch) => getId(branch));
  }

  /*
   * =======================================
   * || DIALOG TREE DATA BUILDING METHODS ||
   * =======================================
   */
  getChildrenFromElementNode(elementNode: ElementNodeType): RSTNode[] | null {
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

        children: childPromptNode.branches.map((elementNode: ElementNodeType): RSTNode => {
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
