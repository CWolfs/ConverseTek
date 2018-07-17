import { get, post } from './rest';

import dataStore from '../stores/dataStore';
import defStore from '../stores/defStore';

import { consolidateSpeaker } from '../utils/conversation-utils';

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
export function getConversations() {
  return get('/conversations').then((conversations) => {
    dataStore.setConversations(conversations);
  });
}

export function updateConversation(id, conversationAsset) {
  consolidateSpeaker(conversationAsset);
  return post('/conversations/put', { id }, { method: 'PUT', conversationAsset }).then((conversations) => {
    dataStore.setConversations(conversations);
    return conversations;
  });
}

export function exportConversation(id, conversationAsset) {
  consolidateSpeaker(conversationAsset);
  return post('/conversations/export', { id }, { method: 'PUT', conversationAsset });
}

/*
==========================
 || FILE SYSTEM METHODS ||
 =========================
*/
export function getRootDrives() {
  return get('/filesystem');
}

export function getDirectories(path) {
  return get('/directories', { path });
}

export function saveWorkingDirectory(path) {
  dataStore.setWorkingDirectory(path);
  return post('/working-directory', { path });
}

/*
==========================
 || DEFINITIONS METHODS ||
 =========================
*/
export function getDefinitions() {
  return get('/definitions')
    .then((definitions) => {
      defStore.setDefinitions(definitions);
      return definitions;
    });
}
