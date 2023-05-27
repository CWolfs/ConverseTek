import { runInAction } from 'mobx';

import { ConversationAssetType, DefinitionsType, FileSystemItemType, QuickLinkType, ColourConfigType } from 'types';
import { consolidateSpeaker, rebuildNodeIndexes, removeAllOldFillerNodes } from 'utils/conversation-utils';

import { get, post } from './rest';

import { dataStore, defStore } from '../stores';
import { JsonValue, fullConversationAssetMapping, lowercasePropertyNames, mapToType, reversedFullConversationAssetMapping } from './mappings/mapping';

/*
 * CHROMELY DOESN'T SUPPORT PUTS SO PUTS AND DELETES ARE CURRENTLY POSTS WITH method DATA
 * e.g. { method: 'DELETE' }
 */

/*
======================
 || UTILITY METHODS ||
 =====================
*/
export default function noop() {
  return {};
}

/*
=====================
 || STATUS METHODS ||
 ====================
*/
export function getDependencyStatus(): Promise<any> {
  return get('/dependency-status');
}

/*
============================
 || CONVERSATIONS METHODS ||
 ===========================
*/
export function getConversations(): Promise<any> {
  return get('/conversations').then((conversations: object[]): ConversationAssetType[] => {
    const typedConversations = conversations.map((conversation) => mapToType<ConversationAssetType>(conversation, fullConversationAssetMapping));
    dataStore.setConversations(typedConversations);
    return typedConversations;
  });
}

export function updateConversation(id: string, conversationAsset: ConversationAssetType): Promise<any> {
  runInAction(() => {
    consolidateSpeaker(conversationAsset);
    removeAllOldFillerNodes(conversationAsset); // This only exists to fix old conversations pre-v1.4
    rebuildNodeIndexes(conversationAsset);
  });

  const apiMappedConversation = mapToType<object>(conversationAsset, reversedFullConversationAssetMapping);

  return post('/conversations/put', { id }, { method: 'PUT', conversationAsset: apiMappedConversation }).then(
    (conversations: object[]): ConversationAssetType[] => {
      const typedConversations = conversations.map((conversation) => mapToType<ConversationAssetType>(conversation, fullConversationAssetMapping));
      dataStore.setConversations(typedConversations);
      return typedConversations;
    },
  );
}

export function exportConversation(id: string, conversationAsset: ConversationAssetType): Promise<any> {
  runInAction(() => {
    consolidateSpeaker(conversationAsset);
    removeAllOldFillerNodes(conversationAsset); // This only exists to fix old conversations pre-v1.4
    rebuildNodeIndexes(conversationAsset);
  });

  const apiMappedConversation = mapToType<object>(conversationAsset, reversedFullConversationAssetMapping);

  return post('/conversations/export', { id }, { method: 'PUT', conversationAsset: apiMappedConversation });
}

export function exportAllConversations(id: string, conversationAsset: ConversationAssetType): Promise<any> {
  if (conversationAsset) {
    runInAction(() => {
      consolidateSpeaker(conversationAsset);
      removeAllOldFillerNodes(conversationAsset); // This only exists to fix old conversations pre-v1.4
      rebuildNodeIndexes(conversationAsset);
    });
  }

  return post('/conversations/export-all', { id }, { method: 'PUT', conversationAsset });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function importConversation(path: string): Promise<any> {
  dataStore.clearActiveConversation();
  return post('/conversations/import', { path });
}

export function deleteConversation(path: string): Promise<any> {
  return post('/conversations/delete', { path });
}

/*
==========================
 || FILE SYSTEM METHODS ||
 =========================
*/
export function getRootDrives(): Promise<any> {
  return get('/filesystem').then((directories: JsonValue): FileSystemItemType[] => lowercasePropertyNames(directories, true) as FileSystemItemType[]);
}

export function getDirectories(path: string, includeFiles = false): Promise<any> {
  return get('/directories', { path, includeFiles }).then((directories: JsonValue) => lowercasePropertyNames(directories, true));
}

export function getQuickLinks() {
  return get('/quicklinks').then((quickLinks: [string, string]) => {
    const entries: QuickLinkType[] = [];
    for (const [key, value] of Object.entries(quickLinks)) {
      entries.push({ title: key, path: value } as QuickLinkType);
    }
    return entries;
  });
}

export function addQuickLink(title: string, path: string) {
  const modifiedPath = path.replaceAll('\\', '/');

  return post('/add-quicklink', { title, path: modifiedPath }).then((quickLinks: [string, string]) => {
    const entries: QuickLinkType[] = [];
    for (const [key, value] of Object.entries(quickLinks)) {
      entries.push({ title: key, path: value } as QuickLinkType);
    }
    return entries;
  });
}

export function removeQuickLink(title: string, path: string) {
  const modifiedPath = path.replaceAll('\\', '/');
  return post('/remove-quicklink', { title, path: modifiedPath }).then((quickLinks: [string, string]) => {
    const entries: QuickLinkType[] = [];
    for (const [key, value] of Object.entries(quickLinks)) {
      entries.push({ title: key, path: value } as QuickLinkType);
    }
    return entries;
  });
}

export function getColourConfig() {
  return get('/colour-config').then((colourConfig: ColourConfigType) => {
    dataStore.setColourConfig(colourConfig);
  });
}

export function saveWorkingDirectory(path: string, name: string) {
  dataStore.setWorkingDirectory(path, name);
  return post('/working-directory', { path });
}

/*
==========================
 || DEFINITIONS METHODS ||
 =========================
*/
export function getDefinitions(): Promise<any> {
  return get('/definitions').then((definitions: JsonValue): DefinitionsType => {
    const typedDefinitions = lowercasePropertyNames(definitions, true) as DefinitionsType;
    defStore.setDefinitions(typedDefinitions);
    return typedDefinitions;
  });
}
