import { consolidateSpeaker, fillIndexGaps } from 'utils/conversation-utils';

import { get, post } from './rest';

import { ConversationAssetType } from 'types/ConversationAssetType';
import { DefinitionsType } from 'types/DefinitionsType';

import { dataStore, defStore } from '../stores';
import { JsonValue, fullConversationAssetMapping, lowercasePropertyNames, mapToType } from './mappings/mapping';
import { FileSystemItemType } from 'types/FileSystemItemType';
import { QuickLinkType } from 'types/QuickLinkType';

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
  consolidateSpeaker(conversationAsset);
  fillIndexGaps(conversationAsset);
  return post('/conversations/put', { id }, { method: 'PUT', conversationAsset }).then((conversations: object[]): ConversationAssetType[] => {
    const typedConversations = conversations.map((conversation) => mapToType<ConversationAssetType>(conversation, fullConversationAssetMapping));
    dataStore.setConversations(typedConversations);
    return typedConversations;
  });
}

export function exportConversation(id: string, conversationAsset: ConversationAssetType): Promise<any> {
  consolidateSpeaker(conversationAsset);
  return post('/conversations/export', { id }, { method: 'PUT', conversationAsset });
}

export function exportAllConversations(id: string, conversationAsset: ConversationAssetType): Promise<any> {
  if (conversationAsset) consolidateSpeaker(conversationAsset);
  return post('/conversations/export-all', { id }, { method: 'PUT', conversationAsset });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function importConversation(path: string): Promise<any> {
  dataStore.clearActiveConversation();
  return post('/conversations/import', { path });
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

export function saveWorkingDirectory(path: string) {
  dataStore.setWorkingDirectory(path);
  return post('/working-directory', { path });
}

/*
==========================
 || DEFINITIONS METHODS ||
 =========================
*/
export function getDefinitions(): Promise<any> {
  return get('/definitions').then((definitions: JsonValue): DefinitionsType => {
    const typedDefinitions = lowercasePropertyNames(definitions) as DefinitionsType;
    defStore.setDefinitions(typedDefinitions);
    return typedDefinitions;
  });
}
