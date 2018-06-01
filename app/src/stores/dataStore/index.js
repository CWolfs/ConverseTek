import { observable, action } from 'mobx';

class DataStore {
  @observable conversationAssets = observable.map();
  @observable activeConversationAsset;

  @action setConversations(conversationAssets) {
    conversationAssets.forEach(conversationAsset =>
      this.conversationAssets.set(conversationAsset.Conversation.idRef.id, conversationAsset));
  }

  @action setActiveConversation(id) {
    if (this.conversationAssets.has(id)) {
      this.activeConversationAsset = this.conversationAssets.get(id);
    }
  }

  @action reset = () => {
    this.organisation = null;
    this.teams = null;
    this.sensors = null;
  }
}

const dataStore = new DataStore();

export default dataStore;
export { DataStore };
