/* eslint-disable class-methods-use-this */
import { observable, action, makeObservable } from 'mobx';

import { createConversation } from 'utils/conversation-utils';
import { defStore } from '../defStore';

class DataStore {
  workingDirectory;

  conversationAssets = observable.map(new Map(), { deep: false });

  activeConversationAsset;

  unsavedActiveConversationAsset;

  constructor() {
    makeObservable(this, {
      workingDirectory: observable,
      conversationAssets: observable,
      activeConversationAsset: observable,
      unsavedActiveConversationAsset: observable,
      setWorkingDirectory: action,
      createNewConversation: action,
      setConversations: action,
      setConversation: action,
      removeConversation: action,
      clearActiveConversation: action,
      updateActiveConversation: action,
      setActiveConversation: action,
      setUnsavedActiveConversation: action,
      setUnsavedConversationId: action,
      setConversationId: action,
      setUnsavedConversationUIName: action,
      reset: action,
    });

    this.activeConversationAsset = null;
    this.unsavedActiveConversationAsset = null;
    this.workingDirectory = null;
  }

  setWorkingDirectory(directoryPath) {
    if (directoryPath !== this.workingDirectory) this.clearActiveConversation();
    this.workingDirectory = directoryPath;
  }

  createNewConversation() {
    const conversation = createConversation(this.workingDirectory);
    this.updateActiveConversation(conversation);
  }

  setConversations(conversationAssets) {
    this.conversationAssets.clear();
    conversationAssets.forEach((conversationAsset) => {
      this.conversationAssets.set(conversationAsset.Conversation.idRef.id, conversationAsset);
      defStore.setLogicTypeByConversation(conversationAsset);
    });
  }

  setConversation(conversationAsset) {
    this.conversationAssets.set(conversationAsset.Conversation.idRef.id, conversationAsset);
  }

  removeConversation(id) {
    this.conversationAssets.delete(id);
  }

  clearActiveConversation() {
    this.activeConversationAsset = null;
  }

  updateActiveConversation(conversationAsset) {
    this.setConversation(conversationAsset);
    this.setActiveConversation(conversationAsset.Conversation.idRef.id);
  }

  setActiveConversation(id) {
    if (this.conversationAssets.has(id)) {
      this.activeConversationAsset = this.conversationAssets.get(id);
      this.setUnsavedActiveConversation(this.activeConversationAsset);
    }
  }

  setUnsavedActiveConversation(conversationAsset) {
    this.unsavedActiveConversationAsset = observable(conversationAsset);
  }

  setConversationId(conversationAsset, id) {
    // FIXME: Implement immutability
    conversationAsset.Conversation.idRef.id = id;
  }

  setUnsavedConversationId(id) {
    // FIXME: Implement immutability
    this.unsavedActiveConversationAsset.Conversation.idRef.id = id;
  }

  setUnsavedConversationUIName(name) {
    this.unsavedActiveConversationAsset.Conversation.ui_name = name;
  }

  reset = () => {
    this.conversationAssets.clear();
    this.activeConversationAsset = null;
    this.unsavedActiveConversationAsset = null;
    this.workingDirectory = null;
  };
}

export const dataStore = new DataStore();

export { DataStore };
