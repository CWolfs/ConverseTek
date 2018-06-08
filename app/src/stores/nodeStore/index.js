import { observable, action } from 'mobx';

/* eslint-disable class-methods-use-this */
class NodeStore {
  @observable roots = observable.shallowMap();
  @observable nodes = observable.shallowMap(); // NOT including roots

  constructor() {
    this.ownerId = null;
    this.idMap = new Map();
  }

  @action build(conversationAsset) {
    const { roots, nodes } = conversationAsset.Conversation;
    this.ownerId = conversationAsset.Conversation.idRef.id;

    this.reset();
    this.buildRoots(roots);
    this.buildNodes(nodes);
  }

  buildRoots(roots) {
    roots.forEach((root) => {
      const id = root.idRef.id.split(':')[1];
      this.roots.set(id, root);
    });
  }

  buildNodes(nodes) {
    nodes.forEach((node) => {
      const { index } = node;
      this.nodes.set(index, node);
    });
  }

  getChildrenFromRoots(roots) {
    return roots.map(root => (
      {
        title: root.responseText,
        id: root.idRef.id.split(':')[1],
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
    const childNodeId = childNode.idRef.id.split(':')[1] || childNode.idRef.id;

    return [
      {
        title: childNode.text,
        id: childNodeId,
        expanded: true,
        children: childNode.branches.map((branch) => {
          const { auxiliaryLink } = branch;
          const branchNodeId = branch.idRef.id.split(':')[1];

          return {
            title: branch.responseText,
            id: branchNodeId,
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
