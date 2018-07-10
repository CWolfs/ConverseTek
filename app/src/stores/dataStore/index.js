import { observable, action } from 'mobx';
import { createConversation } from '../../utils/conversation-utils';
import defStore from '../defStore';

class DataStore {
  @observable workingDirectory;
  @observable conversationAssets = observable.map(new Map(), { deep: false });
  @observable activeConversationAsset;
  @observable unsavedActiveConversationAsset;

  constructor() {
    this.activeConversationAsset = null;
    this.unsavedActiveConversationAsset = null;
    this.workingDirectory = null;
  }

  @action setWorkingDirectory(directoryPath) {
    if (directoryPath !== this.workingDirectory) this.clearActiveConversation();
    this.workingDirectory = directoryPath;
  }

  @action createNewConversation() {
    const conversation = createConversation(this.workingDirectory);
    this.updateActiveConversation(conversation);
  }

  @action setConversations(conversationAssets) {
    this.conversationAssets.clear();
    conversationAssets.forEach((conversationAsset) => {
      this.conversationAssets.set(conversationAsset.Conversation.idRef.id, conversationAsset);
      defStore.setLogicTypeByConversation(conversationAsset);
    });
  }

  @action setConversation(conversationAsset) {
    this.conversationAssets.set(conversationAsset.Conversation.idRef.id, conversationAsset);
  }

  @action removeConversation(id) {
    this.conversationAssets.delete(id);
  }

  @action clearActiveConversation() {
    this.activeConversationAsset = null;
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
    this.unsavedActiveConversationAsset = observable(conversationAsset);
  }

  @action reset = () => {
    this.conversationAssets.clear();
    this.activeConversationAsset = null;
    this.unsavedActiveConversationAsset = null;
    this.workingDirectory = null;
  }
}

const dataStore = new DataStore();

export default dataStore;
export { DataStore };
