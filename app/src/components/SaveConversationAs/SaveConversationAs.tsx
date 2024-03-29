import React, { useState, useEffect, ChangeEvent } from 'react';
import { observer } from 'mobx-react';
import { message, Input } from 'antd';

import { updateConversation } from 'services/api';
import { useStore } from 'hooks/useStore';
import { DataStore } from 'stores/dataStore/data-store';
import { ModalStore } from 'stores/modalStore/modal-store';

import './SaveConversationAs.css';

function SaveConversationAs() {
  const dataStore = useStore<DataStore>('data');
  const modalStore = useStore<ModalStore>('modal');
  const globalModalId = 'global1';

  const { unsavedActiveConversationAsset: conversationAsset } = dataStore;
  if (!conversationAsset) return null;

  const [suggestedFileName] = useState(`${conversationAsset.conversation.idRef.id}.convo.bytes`);
  const [modifiedFileName, setModifiedFileName] = useState<string | null>(null);

  const onOk = () => {
    const { filename: previousFileName, filepath: previousFilePath } = conversationAsset;

    conversationAsset.filename = (modifiedFileName || suggestedFileName).replace('.bytes', '');
    conversationAsset.filepath = previousFilePath.replace(previousFileName, conversationAsset.filename);

    void updateConversation(conversationAsset.conversation.idRef.id, conversationAsset).then(() => {
      void message.success('Save successful');
    });
    dataStore.updateActiveConversation(conversationAsset); // local update for speed

    modalStore.closeModal(globalModalId);
  };

  const setupModal = () => {
    modalStore.setOnOk(onOk, globalModalId);
    modalStore.setTitle('Save Conversation As...', globalModalId);
    modalStore.setOkLabel('Save', globalModalId);
    modalStore.setDisableOk(false, globalModalId);
    modalStore.setWidth('40vw', globalModalId);
    modalStore.setShowCancelButton(true, globalModalId);
  };

  const handleFileNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    const newFileName = event.target.value.trim();
    setModifiedFileName(newFileName);
  };

  useEffect(() => {
    setupModal();
  });

  return (
    <div className="save-conversation-as">
      <Input value={modifiedFileName || suggestedFileName} onChange={handleFileNameChange} />
    </div>
  );
}

export const ObservingSaveConversationAs = observer(SaveConversationAs);
