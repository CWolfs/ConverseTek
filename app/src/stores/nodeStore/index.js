import { observable, action } from 'mobx';

class NodeStore {
  @observable roots = observable.shallowMap();
  @observable nodes = observable.shallowMap();
  @observable branches = observable.shallowMap();
  @observable activeNode;

  static getId(idRef) {
    const { id } = idRef;
    return id.split(':')[1] || id;
  }

  constructor() {
    this.ownerId = null;
    this.activeNode = null;
  }

  @action build(conversationAsset) {
    const { roots, nodes } = conversationAsset.Conversation;
    this.ownerId = NodeStore.getId(conversationAsset.Conversation.idRef);

    this.reset();
    this.buildRoots(roots);
    this.buildNodes(nodes);
  }

  @action setActiveNode(nodeId, nodeType) {
    if (nodeType === 'root') {
      this.activeNode = this.roots.get(nodeId);
    } else if (nodeType === 'node') {
      this.activeNode = this.nodes.values().find(node => nodeId === NodeStore.getId(node.idRef));
    } else if (nodeType === 'branch') {
      this.activeNode = this.branches.get(nodeId);
    }
  }

  buildRoots(roots) {
    roots.forEach((root) => {
      const id = NodeStore.getId(root.idRef);
      this.roots.set(id, root);
    });
  }

  buildNodes(nodes) {
    nodes.forEach((node) => {
      const { index } = node;
      this.nodes.set(index, node);
    });
  }

  buildBranches(branches) {
    branches.forEach((branch) => {
      const id = NodeStore.getId(branch.idRef);
      this.branches.set(id, branch);
    });
  }

  getChildrenFromRoots(roots) {
    return roots.map(root => (
      {
        title: root.responseText,
        id: NodeStore.getId(root.idRef),
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
        id: NodeStore.getId(childNode.idRef),
        type: 'node',
        expanded: true,
        children: childNode.branches.map((branch) => {
          const { auxiliaryLink } = branch;
          const branchNodeId = NodeStore.getId(branch.idRef);

          return {
            title: branch.responseText,
            id: branchNodeId,
            type: 'branch',
            expanded: true,
            children: (auxiliaryLink) ? [{ title: `[Link to NODE ${branch.nextNodeIndex}]` }] : this.getChildren(branch),
          };
        }),
      },
    ];
  }

  @action reset = () => {
    this.roots.clear();
    this.roots.clear();
  }
}

const nodeStore = new NodeStore();

export default nodeStore;
export { NodeStore };
