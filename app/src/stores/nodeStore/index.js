import { observable, action } from 'mobx';
import defer from 'lodash.defer';
import { getId } from '../../utils/conversation-utils';

/* eslint-disable no-return-assign, no-param-reassign */
class NodeStore {
  @observable roots = observable.shallowMap();
  @observable nodes = observable.shallowMap();
  @observable branches = observable.shallowMap();
  @observable activeNode;
  @observable rebuild = false;

  constructor() {
    this.ownerId = null;
    this.activeNode = null;
  }

  @action setRebuild(flag) {
    this.rebuild = flag;
    if (this.rebuild) defer(() => this.rebuild = false);
  }

  @action build(conversationAsset) {
    const { roots, nodes } = conversationAsset.Conversation;

    const nextOwnerId = getId(conversationAsset.Conversation.idRef);

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

  @action setActiveNode(nodeId, nodeType) {
    if (nodeType === 'root') {
      this.activeNode = this.roots.get(nodeId);
    } else if (nodeType === 'node') {
      this.activeNode = this.nodes.values().find(node => nodeId === getId(node.idRef));
    } else if (nodeType === 'response') {
      this.activeNode = this.branches.get(nodeId);
    }
  }

  getActiveNodeId() {
    if (!this.activeNode) return null;
    return getId(this.activeNode.idRef);
  }

  getNode(nodeId, nodeType) {
    if (nodeType === 'root') {
      return this.roots.get(nodeId);
    } else if (nodeType === 'node') {
      return this.nodes.values().find(node => nodeId === getId(node.idRef));
    } else if (nodeType === 'response') {
      return this.branches.get(nodeId);
    }
    return null;
  }

  buildRoots(roots) {
    roots.forEach((root) => {
      const id = getId(root.idRef);
      this.roots.set(id, root);
      root.type = 'root';
    });
  }

  buildNodes(nodes) {
    nodes.forEach((node) => {
      const { index } = node;
      this.nodes.set(index, node);
      node.type = 'node';
    });
  }

  buildBranches(branches) {
    branches.forEach((branch) => {
      const id = getId(branch.idRef);
      this.branches.set(id, branch);
      branch.type = 'response';
    });
  }

  getChildrenFromRoots(roots) {
    return roots.map(root => (
      {
        title: root.responseText,
        id: getId(root.idRef),
        type: 'root',
        expanded: true,
        children: this.getChildren(root),
      }
    ));
  }

  getChildren(node) {
    const { nextNodeIndex } = node;

    // GUARD - End of branch so this would be tagged as a DIALOG END node
    if (nextNodeIndex === -1) return null;

    // GUARD - Error if there's a mistake in the file and
    //         no node exists of the index being looked for
    if (!this.nodes.has(nextNodeIndex)) {
      console.error(`[Conversation Editor] Failed trying to find node ${nextNodeIndex}`);
      return null;
    }

    const childNode = this.nodes.get(nextNodeIndex);
    this.buildBranches(childNode.branches);

    return [
      {
        title: childNode.text,
        id: getId(childNode.idRef),
        type: 'node',
        expanded: true,
        children: childNode.branches.map((branch) => {
          const { auxiliaryLink } = branch;
          const branchNodeId = getId(branch.idRef);

          return {
            title: branch.responseText,
            id: branchNodeId,
            type: 'response',
            expanded: true,
            children: (auxiliaryLink) ? [{ title: `[Link to NODE ${branch.nextNodeIndex}]` }] : this.getChildren(branch),
          };
        }),
      },
    ];
  }

  @action reset = () => {
    this.roots.clear();
    this.nodes.clear();
    this.branches.clear();
    // this.activeNode = null;
  }
}

const nodeStore = new NodeStore();

export default nodeStore;
export { NodeStore };
