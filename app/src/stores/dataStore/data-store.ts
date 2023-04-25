/* eslint-disable class-methods-use-this */
import { observable, action, makeObservable } from 'mobx';

import type { ConversationAssetType } from 'types';

import { deleteConversation } from 'services/api';
import { createConversation } from 'utils/conversation-utils';
import { defStore } from '../defStore';

class DataStore {
  public workingDirectory: string | null;
  public workingDirectoryName: string | null;
  public conversationAssets = observable.map<string, ConversationAssetType>(new Map(), { deep: false });
  public activeConversationAsset: ConversationAssetType | null;
  public unsavedActiveConversationAsset: ConversationAssetType | null;

  constructor() {
    makeObservable(this, {
      workingDirectory: observable,
      workingDirectoryName: observable,
      conversationAssets: observable,
      activeConversationAsset: observable,
      unsavedActiveConversationAsset: observable,
      setWorkingDirectory: action,
      createNewConversation: action,
      setConversations: action,
      setConversation: action,
      removeConversation: action,
      clearActiveConversation: action,
      deleteConversation: action,
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
    this.workingDirectoryName = null;
  }

  setWorkingDirectory(directoryPath: string, directoryName: string): void {
    if (directoryPath !== this.workingDirectory) this.clearActiveConversation();
    this.workingDirectory = directoryPath;
    this.workingDirectoryName = directoryName;
  }

  createNewConversation(): void {
    if (!this.workingDirectory) {
      throw Error('Working directory is not defined. This is unexpected');
    }

    const conversation = createConversation(this.workingDirectory);
    this.updateActiveConversation(conversation);
  }

  setConversations(conversationAssets: ConversationAssetType[]): void {
    this.conversationAssets.clear();
    conversationAssets.forEach((conversationAsset: ConversationAssetType) => {
      this.conversationAssets.set(conversationAsset.conversation.idRef.id, conversationAsset);
      defStore.setLogicTypeByConversation(conversationAsset);
    });
  }

  setConversation(conversationAsset: ConversationAssetType): void {
    this.conversationAssets.set(conversationAsset.conversation.idRef.id, conversationAsset);
  }

  removeConversation(id: string): void {
    this.conversationAssets.delete(id);
  }

  clearActiveConversation(): void {
    this.activeConversationAsset = null;
  }

  deleteConversation(id: string): void {
    const conversationAsset = this.conversationAssets.get(id);
    if (conversationAsset == null) return;

    this.removeConversation(id);
    void deleteConversation(conversationAsset.filepath);
  }

  updateActiveConversation(conversationAsset: ConversationAssetType): void {
    this.setConversation(conversationAsset);
    this.setActiveConversation(conversationAsset.conversation.idRef.id);
  }

  setActiveConversation(id: string): void {
    if (this.conversationAssets.has(id)) {
      const conversationAsset = this.conversationAssets.get(id);

      if (conversationAsset) {
        this.activeConversationAsset = conversationAsset;
        this.setUnsavedActiveConversation(this.activeConversationAsset);
      }
    }
  }

  setUnsavedActiveConversation(conversationAsset: ConversationAssetType): void {
    this.unsavedActiveConversationAsset = observable(conversationAsset);
  }

  setConversationId(conversationAsset: ConversationAssetType, id: string): void {
    conversationAsset.conversation.idRef.id = id;
  }

  setUnsavedConversationId(id: string): void {
    if (this.unsavedActiveConversationAsset) {
      this.unsavedActiveConversationAsset.conversation.idRef.id = id;
    } else {
      console.error('Attempting to set the id of a null unsavedActiveConversationAsset');
    }
  }

  setUnsavedConversationUIName(name: string): void {
    if (this.unsavedActiveConversationAsset) {
      this.unsavedActiveConversationAsset.conversation.uiName = name;
    } else {
      console.error('Attempting to set the uiName of a null unsavedActiveConversationAsset');
    }
  }

  reset = (): void => {
    this.conversationAssets.clear();
    this.activeConversationAsset = null;
    this.unsavedActiveConversationAsset = null;
    this.workingDirectory = null;
  };
}

export const dataStore = new DataStore();

export { DataStore };
