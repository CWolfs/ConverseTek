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
  addNodes,
  regenerateNodeIds,
} from 'utils/conversation-utils';
import { ClipboardType, ConversationAssetType, ElementNodeType, OperationCallType, PromptNodeType } from 'types';
import { isElementNodeType, isPromptNodeType } from 'utils/node-utils';

import { dataStore } from '../dataStore';
import { modalStore } from '../modalStore';
import { ModalConfirmation } from 'components/Modals/ModalConfirmation';

/* eslint-disable no-return-assign, no-param-reassign, class-methods-use-this */
class NodeStore {
  static deleteDeferred = false;

  activeNode: PromptNodeType | ElementNodeType | null = null;
  collapseOnNodeId: string | null = null;
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
      regenerateNodeIds: action,
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
      setNodeId: action,
      setNodeText: action,
      setNodeComment: action,
      setElementNodeOnlyOnce: action,
      setElementNodeHideIfUnavailable: action,
      setPromptNodeSpeakerType: action,
      setPromptNodeSourceInSceneId: action,
      setPromptNodeSpeakerId: action,
      setNodeActions: action,
      removeNodeAction: action,
      addNodeAction: action,
      setElementNodeConditions: action,
      addNodeCondition: action,
      removeNodeCondition: action,
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
      cleanUpDanglingResponseNodeIndexes: action,
      deleteNodeCascade: action,
      deleteBranchCascade: action,
      deleteLink: action,
      setCollapseOnNodeId: action,
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

  regenerateNodeIds(conversationAsset: ConversationAssetType) {
    regenerateNodeIds(conversationAsset);
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

  pasteAsLinkFromClipboard(targetResponseId: string) {
    const responseNode = this.getNode(targetResponseId);
    if (responseNode === null) return;

    if (this.clipboard == null) throw Error('Clipboard is null or undefined. Cannot paste as link from clipboard.');

    const { originalNodeIndex } = this.clipboard;

    if (isElementNodeType(responseNode)) {
      const proceedWithPasteAsLink = () => {
        const { nextNodeIndex, auxiliaryLink: previousNodeAuxiliaryLink } = responseNode;

        // Create the link by setting the new nextNodeIndex and setting aux link
        if (originalNodeIndex != null) responseNode.nextNodeIndex = originalNodeIndex;
        responseNode.auxiliaryLink = true;

        // Since the old node is being replaced it effectively is being orphaned
        // The node and all it's childen need to be deleted
        // Additionally, any links to nodes in that deleting branch need to be removed
        if (!previousNodeAuxiliaryLink) {
          this.deletePromptNodeCascadeByIndex(nextNodeIndex, false);
        }

        this.clearClipboard();
        this.setRebuild(true);
      };

      // Ask the user to confirm pasting a link if the response already points to a node
      if (responseNode.nextNodeIndex !== -1) {
        const buttons = {
          positiveLabel: 'Confirm',
          onPositive: proceedWithPasteAsLink,
          negativeLabel: 'Cancel',
        };

        const title = 'Response node points to an existing Prompt node';
        modalStore.setModelContent(
          ModalConfirmation,
          {
            type: 'warning',
            title,
            body: 'The response node you are attempting to link into already points or links to a prompt node. Are you sure you want to overwrite this?,',
            width: '30rem',
            buttons,
            disableOk: false,
          },
          'global1',
        );
      } else {
        proceedWithPasteAsLink();
      }
    } else {
      console.error('Type mismatch on paste as link. You cannot paste a node into anything other than a ElementtNode');
    }
  }

  pasteAsCopyFromClipboard(targetNodeId: string) {
    const { unsavedActiveConversationAsset: conversationAsset } = dataStore;
    if (this.clipboard == null) throw Error('Clipboard is null or undefined. Cannot paste as copy from clipboard.');
    if (conversationAsset == null) throw Error('Conversation is null. Cannot paste as copy from cipboard');

    const targetNode = this.getNode(targetNodeId);
    if (targetNode == null) throw Error('Node is null');

    const { copiedNode: clipboardNode, nodes: clipboardNodes } = this.clipboard;

    if (isElementNodeType(targetNode)) {
      if (isPromptNodeType(clipboardNode)) {
        // If the target node is a ElementNode and the copied node is a PromptNode then we know we can copy the data in under the target node without issue
        // e.g. end result would be: ResponseNode --> PromptNode
        const proceedWithPasteAsCopy = () => {
          const { nextNodeIndex, auxiliaryLink: previousNodeAuxiliaryLink } = targetNode;

          // point the target node to the copied node
          targetNode.nextNodeIndex = clipboardNode.index;

          // if the previous Response was linking elsewhere, mark it as no longer an aux link
          targetNode.auxiliaryLink = false;

          // ...and set the parent of the copied node to the target node
          clipboardNode.parentId = targetNodeId;

          // Add the copied node, and all associated nodes from the clipboard into the conversation
          addNodes(conversationAsset, [clipboardNode, ...clipboardNodes]);

          // Since the old node is being replaced it effectively is being orphaned
          // The node and all it's childen need to be deleted
          // Additionally, any links to nodes in that deleting branch need to be removed
          if (!previousNodeAuxiliaryLink) {
            this.deletePromptNodeCascadeByIndex(nextNodeIndex, false);
          }

          this.clearClipboard();
          this.setRebuild(true);
        };

        // Ask the user to confirm pasting a copy if the response already points to a node
        if (targetNode.nextNodeIndex !== -1) {
          const buttons = {
            positiveLabel: 'Confirm',
            onPositive: proceedWithPasteAsCopy,
            negativeLabel: 'Cancel',
          };

          const title = 'Response node points to an existing Prompt node';
          modalStore.setModelContent(
            ModalConfirmation,
            {
              type: 'warning',
              title,
              body: 'The response node you are attempting to paste as copy into already points or links to a prompt node. Are you sure you want to overwrite this?,',
              width: '30rem',
              buttons,
              disableOk: false,
            },
            'global1',
          );
        } else {
          proceedWithPasteAsCopy();
        }
      } else {
        console.error('[NodeStore] Cannot paste. Wrong node types. Cannot paste a ResponseNode into another ResponseNode');
      }
    } else if (isPromptNodeType(targetNode)) {
      if (isElementNodeType(clipboardNode)) {
        // If the target node is a PromptNode and the copied node is a ResponseNode then we know we can copy the data in under the target node without issue
        // e.g. end result would be: PromptNode --> ResponseNode
        clipboardNode.parentId = targetNodeId;

        // Add the ResponseNode as a branch in the PromptNode
        updateResponseNode(conversationAsset, targetNode, clipboardNode);

        // Add all associated nodes from the clipboard into the conversation
        addNodes(conversationAsset, clipboardNodes);
      } else {
        console.error('[NodeStore] Cannot paste. Wrong node types. Cannot paste a PromptNode into another PromptNode');
      }
    }

    this.clearClipboard();
    this.setRebuild(true);
  }

  clearClipboard() {
    this.clipboard = null;
  }

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

  setNodeId(node: PromptNodeType | ElementNodeType, id: string) {
    node.idRef.id = id;
    nodeStore.setRebuild(true);
  }

  setNodeText(node: PromptNodeType | ElementNodeType, text: string) {
    const { type } = node;
    if (type === 'node') {
      node.text = text;
    } else {
      node.responseText = text;
    }
  }

  setNodeComment(node: PromptNodeType | ElementNodeType, comment: string) {
    node.comment = comment;
  }

  setElementNodeOnlyOnce(elementNode: ElementNodeType, onlyOnce: boolean) {
    elementNode.onlyOnce = onlyOnce;
  }

  setElementNodeHideIfUnavailable(elementNode: ElementNodeType, hideIfUnavailable: boolean) {
    elementNode.hideIfUnavailable = hideIfUnavailable;
  }

  setPromptNodeSpeakerType(node: PromptNodeType, value: 'castId' | 'speakerId'): void {
    node.speakerType = value;
    if (value === 'speakerId') node.sourceInSceneRef = null;
  }

  setPromptNodeSourceInSceneId(node: PromptNodeType, id: string): void {
    if (!node.sourceInSceneRef) {
      node.sourceInSceneRef = { id };
    } else {
      node.sourceInSceneRef.id = id;
    }
  }

  setPromptNodeSpeakerId(node: PromptNodeType, id: string): void {
    node.speakerOverrideId = id;
    node.sourceInSceneRef = null;
  }

  setNodeActions(node: PromptNodeType | ElementNodeType, actions: OperationCallType[] | null): void {
    if (actions === null) {
      node.actions = null;
      return;
    }

    node.actions = {
      ops: actions,
    };
  }

  addNodeAction(node: PromptNodeType | ElementNodeType, nodeAction: OperationCallType): void {
    const { actions } = node;

    if (actions) {
      this.setNodeActions(node, [...(actions.ops || []), nodeAction]);
    } else {
      this.setNodeActions(node, [nodeAction]);
    }
  }

  removeNodeAction(node: PromptNodeType | ElementNodeType, index: number): void {
    const { actions } = node;
    if (!actions || !actions.ops) return;

    remove(actions.ops, (value, i) => i === index);
    if (actions.ops.length <= 0) nodeStore.setNodeActions(node, null);
  }

  setElementNodeConditions(elementNode: ElementNodeType, conditions: OperationCallType[] | null): void {
    if (conditions === null) {
      elementNode.conditions = null;
      return;
    }

    elementNode.conditions = {
      ops: conditions,
    };
  }

  addNodeCondition(elementNode: ElementNodeType, elementNodeCondition: OperationCallType): void {
    const { conditions } = elementNode;

    if (conditions) {
      this.setElementNodeConditions(elementNode, [...(conditions.ops || []), elementNodeCondition]);
    } else {
      this.setElementNodeConditions(elementNode, [elementNodeCondition]);
    }
  }

  removeNodeCondition(node: ElementNodeType, index: number): void {
    const { conditions } = node;
    if (!conditions || !conditions.ops) return;

    remove(conditions.ops, (value, i) => i === index);
    if (conditions.ops.length <= 0) nodeStore.setElementNodeConditions(node, null);
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
    if (index === -1) return null;

    const { nodes } = conversationAsset.conversation;

    const node = nodes.find((n) => n.index === index);
    if (node) return node;

    return null;
  }

  removeNode(node: PromptNodeType | ElementNodeType, immediate = false): void {
    const { unsavedActiveConversationAsset: conversationAsset } = dataStore;
    if (conversationAsset === null) return;

    // No need to mark for deletion if it's already marked to be deleted
    if (node.deleting) return;

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
        const { index } = n;
        const toDelete = getId(n) === nodeId;

        if (toDelete) {
          n.deleting = true;
          this.cleanUpDanglingResponseNodeIndexes(index);
        }
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

    const { parentId: oldParentId } = responseNode;
    responseNode.parentId = newParentNodeId;

    const updatedNewParentBranches = [...newParentResponseOrder.map((responseNodeId) => this.getNode(responseNodeId.id))] as ElementNodeType[];
    newParentPromptNode.branches = updatedNewParentBranches;

    // Don't remove if within the same parent Node
    if (oldParentId !== newParentNodeId) {
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

  deletePromptNodeCascadeByIndex(index: number, rebuild = true): void {
    const node = this.getPromptNodeByIndex(index);
    if (node) {
      this.deleteNodeCascade(node);
      this.setRebuild(rebuild);
    }
  }

  /*
   * Ensures that any node that refers to an id specified now points to 'END OF DIALOG' (-1)
   */
  cleanUpDanglingResponseNodeIndexes(indexToClean: number): void {
    const { unsavedActiveConversationAsset: conversationAsset } = dataStore;
    if (conversationAsset === null) return;

    const { roots, nodes } = conversationAsset.conversation;

    roots.forEach((rootNode: ElementNodeType) => {
      const { nextNodeIndex } = rootNode;
      if (nextNodeIndex === indexToClean) {
        rootNode.nextNodeIndex = -1;
        rootNode.auxiliaryLink = false;
      }
    });

    nodes.forEach((promptNode: PromptNodeType) => {
      const { branches } = promptNode;

      branches.forEach((elementNode: ElementNodeType) => {
        const { nextNodeIndex } = elementNode;
        if (nextNodeIndex === indexToClean) {
          elementNode.nextNodeIndex = -1;
          elementNode.auxiliaryLink = false;
        }
      });
    });
  }

  deleteNodeCascade(node: PromptNodeType | ElementNodeType): void {
    if (node.type === 'node') {
      const { index, branches } = node;

      branches.forEach((responseNode: ElementNodeType) => {
        this.deleteBranchCascade(responseNode);
      });

      remove(this.takenPromptNodeIndexes, (i) => i === index);
      this.removeNode(node);

      if (this.activeNode && getId(this.activeNode) === getId(node)) this.clearActiveNode();
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

    // Follow any ResponseNodes pointing to their next PromptNode
    // BUT, do not follow links!
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

  setCollapseOnNodeId(nodeId: string | null): void {
    this.collapseOnNodeId = nodeId;
  }

  getCollapseOnNodeId(): string | null {
    return this.collapseOnNodeId;
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
