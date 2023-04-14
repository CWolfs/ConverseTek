import { consolidateSpeaker, fillIndexGaps } from 'utils/conversation-utils';

import { get, post } from './rest';

import { dataStore, defStore } from '../stores';
import { fullConversationAssetMapping, mapToType } from './mappings/mapping';
import { ConversationAssetType } from 'types/ConversationAssetType';

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
    console.log('typed conversations are: ', typedConversations);
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
  return get('/filesystem');
}

export function getDirectories(path: string, includeFiles = false): Promise<any> {
  return get('/directories', { path, includeFiles });
}

export function getQuickLinks() {
  return get('/quicklinks');
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
  return get('/definitions').then((definitions): any[] => {
    defStore.setDefinitions(definitions);
    return definitions;
  });
}
