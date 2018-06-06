import { observable, action } from 'mobx';

class NodeStore {
  @observable roots = observable.shallowMap();
  @observable nodes = observable.shallowMap(); // NOT including roots

  constructor() {
    this.ownerId = null;
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

  @action reset = () => {
    this.roots.clear();
    this.roots.clear();
  }
}

const nodeStore = new NodeStore();

export default nodeStore;
export { NodeStore };
