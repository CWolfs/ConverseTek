import { observable, action } from 'mobx';

class DataStore {
  @observable conversationAssets = observable.map();

  @action setConversations(conversationAssets) {
    conversationAssets.forEach(conversationAsset =>
      this.conversationAssets.set(conversationAsset.Conversation.idRef.id, conversationAsset));
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
