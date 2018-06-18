import { observable, action } from 'mobx';

class DataStore {
  @observable conversationAssets = observable.shallowMap();
  @observable activeConversationAsset;
  @observable unsavedActiveConversationAsset;

  constructor() {
    this.activeConversationAsset = null;
    this.unsavedActiveConversationAsset = null;
  }

  @action setConversations(conversationAssets) {
    this.conversationAssets.clear();
    conversationAssets.forEach(conversationAsset =>
      this.conversationAssets.set(conversationAsset.Conversation.idRef.id, conversationAsset));
  }

  @action setConversation(conversationAsset) {
    this.conversationAssets.set(conversationAsset.Conversation.idRef.id, conversationAsset);
  }

  @action removeConversation(id) {
    this.conversationAssets.delete(id);
  }

  @action updateActiveConversation(conversationAsset) {
    this.setConversation(conversationAsset);
    this.setActiveConversation(conversationAsset.Conversation.idRef.id);
  }

  @action setActiveConversation(id) {
    if (this.conversationAssets.has(id)) {
      this.activeConversationAsset = this.conversationAssets.get(id);
    }
  }

  @action setUnsavedActiveConversation(conversationAsset) {
    this.unsavedActiveConversationAsset = conversationAsset;
  }

  @action reset = () => {
    this.conversationAssets.clear();
    this.activeConversationAsset = null;
    this.unsavedActiveConversationAsset = null;
  }
}

const dataStore = new DataStore();

export default dataStore;
export { DataStore };
