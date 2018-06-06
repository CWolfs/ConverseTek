import { get, post } from './rest';

import dataStore from '../stores/dataStore';

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
  return post('/conversations/put', { id }, { method: 'PUT', conversationAsset }).then((conversations) => {
    dataStore.setConversations(conversations);
    return conversations;
  });
}
