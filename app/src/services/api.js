import { get, post } from './rest';

import dataStore from '../stores/dataStore';

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
