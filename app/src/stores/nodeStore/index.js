import { decorate, observable, action } from 'mobx';
import defer from 'lodash.defer';
import remove from 'lodash.remove';
import sortBy from 'lodash.sortby';
import last from 'lodash.last';

import {
  getId,
  createNode,
  createResponse,
  createRoot,
  replaceRoot,
  replaceResponse,
} from '../../utils/conversation-utils';
import dataStore from '../dataStore';

/* eslint-disable no-return-assign, no-param-reassign */
class NodeStore {
  constructor() {
    this.roots = observable.map(new Map(), { deep: false });
    this.nodes = observable.map(new Map(), { deep: false });
    this.branches = observable.map(new Map(), { deep: false });
    this.activeNode = null;
    this.focusedNode = null;
    this.dirtyActiveNode = false;
    this.rebuild = false;
    this.ownerId = null;
    this.activeNode = null;
    this.focusedNode = null;
    this.takenNodeIndexes = [];
  }

  generateNextNodeIndex() {
    this.takenNodeIndexes = sortBy(this.takenNodeIndexes, index => index);
    const nextNodeIndex = last(this.takenNodeIndexes) + 1 || 1;
    this.takenNodeIndexes.push(nextNodeIndex);
    return nextNodeIndex;
  }

  setRebuild(flag) {
    this.rebuild = flag;
    if (this.rebuild) {
      defer(() => {
        this.rebuild = false;
        if (this.activeNode) this.updateActiveNode(this.activeNode);
      });
    }
  }

  build(conversationAsset) {
    const { roots, nodes } = conversationAsset.Conversation;

    const nextOwnerId = getId(conversationAsset.Conversation);

    // save the active node if it's the same conversation
    if (this.ownerId !== nextOwnerId) {
      this.ownerId = nextOwnerId;
      this.activeNode = null;
    } else {
      this.ownerId = nextOwnerId;
    }

    this.reset();

    this.buildRoots(roots);
    this.buildNodes(nodes);
  }

  /*
  * =========================
  * || ACTIVE NODE METHODS ||
  * =========================
  */

  updateActiveNode(node) {
    this.setNode(node);
    this.setActiveNode(getId(node), node.type);
  }

  setActiveNode(nodeId, nodeType) {
    if (nodeType === 'root') {
      this.activeNode = this.roots.get(nodeId);
    } else if (nodeType === 'node') {
      this.activeNode = Array.from(this.nodes.values()).find(node => nodeId === getId(node));
    } else if (nodeType === 'response') {
      this.activeNode = this.branches.get(nodeId);
    }
  }

  getActiveNodeId() {
    if (!this.activeNode) return null;
    return getId(this.activeNode);
  }

  unselectActiveNode() {
    this.activeNode = null;
  }

  /*
  * ========================
  * || FOCUS NODE METHODS ||
  * ========================
  */
  setFocusedNode(node) {
    this.focusedNode = node;
  }

  removeFocusedNode() {
    this.focusedNode = null;
  }

  /*
  * ==================
  * || NODE METHODS ||
  * ==================
  */
  setNode(node) {
    const { type } = node;

    if (type === 'root') {
      this.roots.set(getId(node), node);
    } else if (type === 'node') {
      this.nodes.set(getId(node), node);
    } else if (type === 'response') {
      this.branches.set(getId(node), node);
    }
  }

  /* More optimal to provide node if available */
  getNode(nodeId, nodeType) {
    if (nodeType === undefined) {
      let node = this.roots.get(nodeId);
      if (node !== undefined && node !== null) return node;

      node = Array.from(this.nodes.values()).find(n => nodeId === getId(n));
      if (node !== undefined && node !== null) return node;

      node = this.branches.get(nodeId);
      if (node !== undefined && node !== null) return node;

      return null;
    }

    if (nodeType === 'root') {
      return this.roots.get(nodeId);
    } else if (nodeType === 'node') {
      return Array.from(this.nodes.values()).find(node => nodeId === getId(node.idRef));
    } else if (nodeType === 'response') {
      return this.branches.get(nodeId);
    }
    return null;
  }

  addNodeByParentId(parentId) {
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
    const { unsavedActiveConversationAsset } = dataStore;

    const root = createRoot();
    root.parentId = 0;
    unsavedActiveConversationAsset.Conversation.roots.push(root);

    this.roots.set(getId(root), root);

    this.updateActiveNode(root);
    this.setRebuild(true);
  }

  addNode(parent) {
    const { unsavedActiveConversationAsset } = dataStore;

    const nextNodeIndex = this.generateNextNodeIndex();
    const node = createNode(nextNodeIndex);
    node.parentId = getId(parent);
    parent.nextNodeIndex = node.index;

    if (parent.type === 'root') {
      replaceRoot(unsavedActiveConversationAsset, parent);
    } else if (parent.type === 'response') {
      const grandParentNode = this.getNode(parent.parentId);
      replaceResponse(unsavedActiveConversationAsset, grandParentNode, parent);
    }

    unsavedActiveConversationAsset.Conversation.nodes.push(node);

    this.nodes.set(node.index, node);

    this.updateActiveNode(node);
    this.setRebuild(true);
  }

  addResponse(parent) {
    const response = createResponse();
    response.parentId = getId(parent);
    parent.branches.push(response);

    this.branches.set(getId(response), response);

    this.updateActiveNode(response);
    this.setRebuild(true);
  }

  deleteNodeCascadeById(id, type) {
    const node = this.getNode(id, type);
    if (node) {
      this.deleteNodeCascade(node);
      this.setRebuild(true);
    }
  }

  /*
  * Ensures that any node that refers to an id specified now points to 'END OF DIALOG' (-1)
  */
  cleanUpDanglingResponseIndexes(idToClean) {
    this.roots.forEach((root) => {
      const { nextNodeIndex } = root;
      if (nextNodeIndex === idToClean) {
        root.nextNodeIndex = -1;
      }
    });

    this.branches.forEach((branch) => {
      const { nextNodeIndex } = branch;
      if (nextNodeIndex === idToClean) {
        branch.nextNodeIndex = -1;
      }
    });
  }

  deleteNodeCascade(node) {
    const { unsavedActiveConversationAsset } = dataStore;
    const { branches } = node;

    if (node.type === 'node') {
      const { index } = node;
      branches.forEach(branch => this.deleteBranchCascade(branch));

      remove(this.takenNodeIndexes, i => i === index);

      remove(
        unsavedActiveConversationAsset.Conversation.nodes,
        (convNode) => {
          const toDelete = (getId(convNode) === getId(node));
          return toDelete;
        },
      );

      if (this.activeNode && (getId(this.activeNode) === getId(node))) this.unselectActiveNode();
      this.nodes.delete(index);

      // Ensure all respones that link to this now deleted node have been cleaned
      // 'nextNodeId' of -1
      this.cleanUpDanglingResponseIndexes(index);
    } else if (node.type === 'response') {
      this.deleteBranchCascade(node);
    } else if (node.type === 'root') {
      this.deleteBranchCascade(node);

      remove(
        unsavedActiveConversationAsset.Conversation.roots,
        (convRoot) => {
          const toDelete = (getId(convRoot) === getId(node));
          return toDelete;
        },
      );

      if (this.activeNode && (getId(this.activeNode) === getId(node))) this.unselectActiveNode();
      this.roots.delete(getId(node));
    }
  }

  deleteBranchCascade(branch) {
    const { auxiliaryLink, parentIndex } = branch;
    const id = getId(branch.idRef);

    if (!auxiliaryLink) {
      const nextNode = this.nodes.get(branch.nextNodeIndex);
      if (nextNode) this.deleteNodeCascade(nextNode);
    }

    if (this.activeNode && (getId(this.activeNode) === getId(branch))) this.unselectActiveNode();
    this.branches.delete(id);
    const parentNode = this.nodes.get(parentIndex);
    if (parentNode) {
      remove(
        parentNode.branches,
        (nodeBranch) => {
          const toDelete = (getId(nodeBranch.idRef) === getId(branch.idRef));
          return toDelete;
        },
      );
    }
  }

  /*
  * ===========================
  * || DATA BUILDING METHODS ||
  * ===========================
  */
  buildRoots(roots) {
    roots.forEach((root) => {
      const id = getId(root);
      this.roots.set(id, root);
      root.type = 'root';
    });
  }

  buildNodes(nodes) {
    nodes.forEach((node) => {
      const { index } = node;
      this.takenNodeIndexes.push(index);
      this.nodes.set(index, node);
      node.type = 'node';
    });
  }

  buildBranches(parent, branches) {
    branches.forEach((branch) => {
      const id = getId(branch);
      this.branches.set(id, branch);
      branch.type = 'response';
      branch.parentId = getId(parent);
      branch.parentIndex = parent.index;
    });
  }

  getChildrenFromRoots(roots) {
    return roots.map(root => (
      {
        title: root.responseText,
        id: getId(root),
        parentId: null,
        type: 'root',
        expanded: true,
        children: this.getChildren(root),
      }
    ));
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
    if (!this.nodes.has(nextNodeIndex)) {
      console.error(`[Conversation Editor] Failed trying to find node ${nextNodeIndex}`);
      return null;
    }

    const childNode = this.nodes.get(nextNodeIndex);
    const childNodeId = getId(childNode);
    this.buildBranches(childNode, childNode.branches);

    return [
      {
        title: childNode.text,
        id: childNodeId,
        parentId: getId(node),
        type: 'node',
        expanded: true,

        children: childNode.branches.map((branch) => {
          const { auxiliaryLink } = branch;
          const branchNodeId = getId(branch);

          return {
            title: branch.responseText,
            id: branchNodeId,
            parentId: childNodeId,
            type: 'response',
            expanded: true,
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

  reset = () => {
    this.roots.clear();
    this.nodes.clear();
    this.branches.clear();
    this.focusedNode = null;
    this.takenNodeIndexes = [];
  }
}

decorate(NodeStore, {
  roots: observable,
  nodes: observable,
  branches: observable,
  activeNode: observable,
  focusedNode: observable,
  dirtyActiveNode: observable,
  rebuild: observable,

  setRebuild: action,
  build: action,
  updateActiveNode: action,
  setActiveNode: action,
  unselectActiveNode: action,
  setFocusedNode: action,
  removeFocusedNode: action,
  setNode: action,
  addNodeByParentId: action,
  addRoot: action,
  addNode: action,
  addResponse: action,
  deleteNodeCascadeById: action,
  cleanUpDanglingResponseIndexes: action,
  deleteNodeCascade: action,
  deleteBranchCascade: action,

  buildRoots: action,
  buildNodes: action,
  buildBranches: action,

  reset: action,
});

const nodeStore = new NodeStore();

export default nodeStore;
export { NodeStore };
