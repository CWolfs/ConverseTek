import { decorate, observable, action } from 'mobx';
import { createConversation } from '../../utils/conversation-utils';

class DataStore {
  constructor() {
    this.conversationAssets = observable.map(new Map(), { deep: false });
    this.activeConversationAsset = null;
    this.unsavedActiveConversationAsset = null;
    this.workingDirectory = null;
  }

  setWorkingDirectory(directoryPath) {
    this.workingDirectory = directoryPath;
  }

  createNewConversation() {
    const conversation = createConversation(this.workingDirectory);
    this.updateActiveConversation(conversation);
  }

  setConversations(conversationAssets) {
    this.conversationAssets.clear();
    conversationAssets.forEach(conversationAsset =>
      this.conversationAssets.set(conversationAsset.Conversation.idRef.id, conversationAsset));
  }

  setConversation(conversationAsset) {
    this.conversationAssets.set(conversationAsset.Conversation.idRef.id, conversationAsset);
  }

  removeConversation(id) {
    this.conversationAssets.delete(id);
  }

  updateActiveConversation(conversationAsset) {
    this.setConversation(conversationAsset);
    this.setActiveConversation(conversationAsset.Conversation.idRef.id);
  }

  setActiveConversation(id) {
    if (this.conversationAssets.has(id)) {
      this.activeConversationAsset = this.conversationAssets.get(id);
    }
  }

  setUnsavedActiveConversation(conversationAsset) {
    this.unsavedActiveConversationAsset = conversationAsset;
  }

  reset = () => {
    this.conversationAssets.clear();
    this.activeConversationAsset = null;
    this.unsavedActiveConversationAsset = null;
    this.workingDirectory = null;
  }
}

decorate(DataStore, {
  workingDirectory: observable,
  conversationAssets: observable,
  activeConversationAsset: observable,
  unsavedActiveConversationAsset: observable,

  setWorkingDirectory: action,
  createNewConversation: action,
  setConversations: action,
  setConversation: action,
  removeConversation: action,
  updateActiveConversation: action,
  setActiveConversation: action,
  setUnsavedActiveConversation: action,
  reset: action,
});

const dataStore = new DataStore();

export default dataStore;
export { DataStore };
