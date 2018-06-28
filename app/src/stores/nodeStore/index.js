import { observable, action } from 'mobx';
import defer from 'lodash.defer';
import remove from 'lodash.remove';
import sortBy from 'lodash.sortby';
import last from 'lodash.last';

import {
  getId,
  createNode,
  createResponse,
  createRoot,
  updateRoot,
  updateNode,
  updateResponse,
} from '../../utils/conversation-utils';
import dataStore from '../dataStore';

/* eslint-disable no-return-assign, no-param-reassign, class-methods-use-this */
class NodeStore {
  @observable activeNode;
  @observable focusedNode;
  @observable dirtyActiveNode = false;
  @observable rebuild = false;

  constructor() {
    this.ownerId = null;
    this.activeNode = null;
    this.focusedNode = null;
    this.takenNodeIndexes = [];
    this.expandMap = new Map();

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

  getActiveNodeId() {
    if (!this.activeNode) return null;
    return getId(this.activeNode);
  }

  @action clearActiveNode() {
    this.activeNode = null;
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
