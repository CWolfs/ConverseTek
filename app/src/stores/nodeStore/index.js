import { observable, action, toJS } from 'mobx';
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

import dataStore from '../dataStore';
import { detectType } from '../../utils/node-utils';

/* eslint-disable no-return-assign, no-param-reassign, class-methods-use-this */
class NodeStore {
  @observable activeNode;
  @observable focusedNode;
  @observable scrollToTreeIndex;
  @observable activeTreeIndex;
  @observable dirtyActiveNode = false;
  @observable rebuild = false;

  constructor() {
    this.ownerId = null;
    this.activeNode = null;
    this.focusedNode = null;
    this.takenNodeIndexes = [];
    this.expandMap = new Map();
    this.clipboard = {
      node: null,
      nodes: [],
    };

    this.processDeletes = this.processDeletes.bind(this);
  }

  generateNextNodeIndex() {
    this.takenNodeIndexes = sortBy(this.takenNodeIndexes, index => index);
    const nextNodeIndex = last(this.takenNodeIndexes) + 1 || 0;
    this.takenNodeIndexes.push(nextNodeIndex);
    return nextNodeIndex;
  }

  @action setRebuild(flag) {
    this.rebuild = flag;
    if (this.rebuild) {
      defer(() => {
        this.rebuild = false;
        if (this.activeNode) this.updateActiveNode(this.activeNode);
      });
    }
  }

  @action init(conversationAsset) {
    const nextOwnerId = getId(conversationAsset.Conversation);

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
  @action updateActiveNode(node) {
    this.setActiveNode(getId(node), node.type);
  }

  @action setActiveNode(nodeId) {
    this.activeNode = this.getNode(nodeId);
  }

  @action setActiveNodeByIndex(nodeIndex) {
    this.activeNode = this.getNodeByIndex(nodeIndex);
    defer(() => {
      this.scrollToNode(this.activeTreeIndex);
      defer(() => {
        // Ugly I know but can't find another way
        const element = window.document.querySelector(`[data-node-index="${this.activeTreeIndex}"]`);
        const tree = window.document.querySelector('.ReactVirtualized__Grid');
        tree.scrollLeft = element.offsetParent.offsetLeft - 50;
      });
    });
  }

  getActiveNodeId() {
    if (!this.activeNode) return null;
    return getId(this.activeNode);
  }

  @action clearActiveNode() {
    this.activeNode = null;
  }

  /*
  * =============================
  * || SCROLL TO  NODE METHODS ||
  * =============================
  */
  @action scrollToNode(nodeTreeIndex) {
    this.scrollToTreeIndex = nodeTreeIndex;
    defer(() => this.scrollToTreeIndex = -1);
  }

  @action setActiveTreeIndex(nodeTreeIndex) {
    this.activeTreeIndex = nodeTreeIndex;
  }

  /*
  * ========================
  * || FOCUS NODE METHODS ||
  * ========================
  */
  @action setFocusedNode(node) {
    this.focusedNode = node;
  }

  @action clearFocusedNode() {
    this.focusedNode = null;
  }

  /*
  * ============================
  * || NODE CLIPBOARD METHODS ||
  * ============================
  */
  @action setClipboard(nodeId) {
    const node = toJS(this.getNode(nodeId));
    node.idRef.id = generateId();
    node.index = this.generateNextNodeIndex();
    this.clipboard.node = node;

    this.clipboard.nodes = flattenDeep(node.branches.map((branch) => {
      const { nextNodeIndex, auxiliaryLink } = branch;
      branch.idRef.id = generateId();

      if (nextNodeIndex === -1 || auxiliaryLink) return [];

      const newNextNodeIndex = this.generateNextNodeIndex();
      return this.copyNodesRecursive(nextNodeIndex, newNextNodeIndex);
    }));
  }

  copyNodesRecursive(nodeIndex, newNextNodeIndex) {
    const node = toJS(this.getNodeByIndex(nodeIndex));
    node.idRef.id = generateId();
    node.index = newNextNodeIndex;

    const nodes = [
      node,
      ...node.branches.map((branch) => {
        const { nextNodeIndex, auxiliaryLink } = branch;
        branch.idRef.id = generateId();

        if (nextNodeIndex === -1 || auxiliaryLink) return [];

        const newNodeIndex = this.generateNextNodeIndex();
        return this.copyNodesRecursive(nextNodeIndex, newNodeIndex);
      }),
    ];
    return nodes;
  }

  @action clearClipboard() {
    this.clipboard = {
      node: null,
      nodes: null,
    };
  }

  @action pasteAsLinkFromClipboard(nodeId) {
    const response = this.getNode(nodeId);
    const { node: clipboardNode } = this.clipboard;

    response.nextNodeIndex = clipboardNode.index;
    response.auxiliaryLink = true;

    this.clearClipboard();
    this.setRebuild(true);
  }

  @action pasteAsCopyFromClipboard(nodeId) {
    const { unsavedActiveConversationAsset: conversationAsset } = dataStore;

    const node = this.getNode(nodeId);
    const { node: clipboardNode, nodes: clipboardNodes } = this.clipboard;
    const { isRoot, isNode, isResponse } = detectType(node.type);
    const {
      isNode: clipboardIsNode,
      isResponse: clipboardIsResponse,
    } = detectType(clipboardNode.type);

    if (isRoot || isResponse) { // Only allow nodes to be copied in if target is a root or response
      if (clipboardIsNode) {
        node.nextNodeIndex = clipboardNode.index;
        addNodes(conversationAsset, [clipboardNode, ...clipboardNodes]);
      } else {
        console.error('[NodeStore] Cannot copy - wrong node types');
      }
    } else if (isNode) { // Only allow response to be copied in
      if (clipboardIsResponse) {
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

  @action setNode(node) {
    const { unsavedActiveConversationAsset: conversationAsset } = dataStore;
    const { type } = node;

    if (type === 'root') {
      updateRoot(conversationAsset, node);
    } else if (type === 'node') {
      updateNode(conversationAsset, node);
    } else if (type === 'response') {
      const parentNode = this.getNode(node.parentId);
      updateResponse(conversationAsset, parentNode, node);
    }
  }

  getNode(nodeId) {
    const { unsavedActiveConversationAsset: conversationAsset } = dataStore;
    const { roots, nodes } = conversationAsset.Conversation;

    const root = roots.find(r => getId(r) === nodeId);
    if (root) return root;

    let branch = null;
    const node = nodes.find((n) => {
      if (getId(n) === nodeId) return true;
      branch = n.branches.find(b => getId(b) === nodeId);
      if (branch) return true;
      return false;
    });
    if (branch) return branch;
    if (node) return node;

    return null;
  }

  getNodeByIndex(index) {
    const { unsavedActiveConversationAsset: conversationAsset } = dataStore;
    const { nodes } = conversationAsset.Conversation;

    const node = nodes.find(n => n.index === index);
    if (node) return node;
    return null;
  }

  removeNode(node, immediate = false) {
    const { unsavedActiveConversationAsset: conversationAsset } = dataStore;
    const { roots, nodes } = conversationAsset.Conversation;
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

  @action processDeletes() {
    const { unsavedActiveConversationAsset: conversationAsset } = dataStore;
    const { roots, nodes } = conversationAsset.Conversation;

    nodes.forEach((n) => {
      remove(n.branches, b => b.deleting);
    });

    remove(nodes, n => n.deleting);
    remove(roots, r => r.deleting);

    defer(() => {
      NodeStore.deleteDeferred = false;
      this.setRebuild(true);
    });
  }

  @action addNodeByParentId(parentId) {
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

  @action addRoot() {
    const { unsavedActiveConversationAsset: conversationAsset } = dataStore;

    const root = createRoot();
    root.parentId = 0;
    updateRoot(conversationAsset, root);

    this.updateActiveNode(root);
    this.setRebuild(true);
  }

  @action setRoots(rootIds) {
    const { unsavedActiveConversationAsset: conversationAsset } = dataStore;
    const roots = rootIds.map(rootId => this.getNode(rootId));
    setRootsUtil(conversationAsset, roots);
  }

  @action addNode(parent) {
    const { unsavedActiveConversationAsset: conversationAsset } = dataStore;
    const { nextNodeIndex: existingNextNodeIndex } = parent;

    if (existingNextNodeIndex === -1) {
      const nextNodeIndex = this.generateNextNodeIndex();
      const node = createNode(nextNodeIndex);
      node.parentId = getId(parent);
      parent.nextNodeIndex = node.index;

      if (parent.type === 'root') {
        updateRoot(conversationAsset, parent);
      } else if (parent.type === 'response') {
        const grandParentNode = this.getNode(parent.parentId);
        updateResponse(conversationAsset, grandParentNode, parent);
      }

      updateNode(conversationAsset, node);

      this.updateActiveNode(node);
      this.setRebuild(true);
    } else {
      console.warn('[Node Store] Will not create new node. Only one node per \'root\' or \'response\' allowed');
    }
  }

  @action addResponse(parent) {
    const { unsavedActiveConversationAsset: conversationAsset } = dataStore;

    const response = createResponse();
    response.parentId = getId(parent);
    updateResponse(conversationAsset, parent, response);

    this.updateActiveNode(response);
    this.setRebuild(true);
  }

  @action setResponses(parentId, responseIds) {
    const { unsavedActiveConversationAsset: conversationAsset } = dataStore;
    const responses = responseIds.map(responseId => this.getNode(responseId));
    const parent = this.getNode(parentId);
    setResponses(conversationAsset, parent, responses);
  }

  @action deleteNodeCascadeById(id) {
    const node = this.getNode(id);
    if (node) {
      this.deleteNodeCascade(node);
      this.setRebuild(true);
    }
  }

  /*
  * Ensures that any node that refers to an id specified now points to 'END OF DIALOG' (-1)
  */
  @action cleanUpDanglingResponseIndexes(idToClean) {
    const { unsavedActiveConversationAsset: conversationAsset } = dataStore;
    const { roots, nodes } = conversationAsset.Conversation;

    roots.forEach((root) => {
      const { nextNodeIndex } = root;
      if (nextNodeIndex === idToClean) {
        root.nextNodeIndex = -1;
      }
    });

    nodes.forEach((node) => {
      const { branches } = node;

      branches.forEach((branch) => {
        const { nextNodeIndex } = branch;
        if (nextNodeIndex === idToClean) {
          branch.nextNodeIndex = -1;
        }
      });
    });
  }

  @action deleteNodeCascade(node) {
    if (node.type === 'node') {
      const { index, branches } = node;
      branches.forEach((branch) => {
        this.deleteBranchCascade(branch);
      });

      remove(this.takenNodeIndexes, i => i === index);
      this.removeNode(node);

      if (this.activeNode && (getId(this.activeNode) === getId(node))) this.clearActiveNode();

      this.cleanUpDanglingResponseIndexes(index);
    } else if (node.type === 'response') {
      this.deleteBranchCascade(node);
    } else if (node.type === 'root') {
      this.deleteBranchCascade(node);
      this.removeNode(node);
      if (this.activeNode && (getId(this.activeNode) === getId(node))) this.clearActiveNode();
    }
  }

  @action deleteBranchCascade(branch) {
    const { auxiliaryLink } = branch;

    if (!auxiliaryLink) {
      const nextNode = this.getNodeByIndex(branch.nextNodeIndex);
      if (nextNode) this.deleteNodeCascade(nextNode);
    }

    if (this.activeNode && (getId(this.activeNode) === getId(branch))) this.clearActiveNode();
    this.removeNode(branch);
  }

  @action deleteLink(parentId) {
    const node = this.getNode(parentId);
    node.nextNodeIndex = -1;
    node.auxiliaryLink = false;
    this.setRebuild(true);
  }

  getChildrenFromRoots(roots) {
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

  setNodeExpansion(nodeId, flag) {
    this.expandMap.set(nodeId, flag);
  }

  isNodeExpanded(nodeId) {
    const isNodeExpanded = this.expandMap.get(nodeId);
    if (isNodeExpanded === undefined) return true;
    return isNodeExpanded;
  }

  getNodeResponseIdsFromNodeId(nodeId) {
    const node = this.getNode(nodeId);
    return this.getNodeResponseIds(node);
  }

  getNodeResponseIds(node) {
    return node.branches.map(branch => getId(branch));
  }

  /*
  * =======================================
  * || DIALOG TREE DATA BUILDING METHODS ||
  * =======================================
  */
  getChildren(node) {
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

        children: childNode.branches.map((branch) => {
          const { auxiliaryLink } = branch;
          const branchNodeId = getId(branch);
          const isBranchExpanded = this.isNodeExpanded(branchNodeId);

          branch.type = 'response';
          branch.parentId = childNodeId;

          return {
            title: branch.responseText,
            id: branchNodeId,
            parentId: childNodeId,
            type: 'response',
            expanded: isBranchExpanded,
            children: (auxiliaryLink) ? [{
              title: `[Link to NODE ${branch.nextNodeIndex}]`,
              type: 'link',
              linkIndex: branch.nextNodeIndex,
              canDrag: false,
              parentId: branchNodeId,
            }] : this.getChildren(branch),
          };
        }),
      },
    ];
  }

  @action reset = () => {
    this.focusedNode = null;
    this.takenNodeIndexes = [];
  }
}

/* Statics */
NodeStore.deleteDeferred = false;

const nodeStore = new NodeStore();

export default nodeStore;
export { NodeStore };
