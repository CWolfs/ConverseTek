import { observable, action } from 'mobx';

class DataStore {
  @observable conversations = observable.map();

  @action setConversations(conversations) {
    conversations.forEach(conversation =>
      this.conversations.set(conversation.idRef.id, conversation));
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
