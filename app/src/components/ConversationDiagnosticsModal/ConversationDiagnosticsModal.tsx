import { useEffect, useState } from 'react';
import type { ComponentProps } from 'react';
import { Alert, Button, Empty, Segmented, Tag } from 'antd';
import { AimOutlined } from '@ant-design/icons';
import { observer } from 'mobx-react';

import { useStore } from 'hooks/useStore';
import { DataStore } from 'stores/dataStore/data-store';
import { DefStore } from 'stores/defStore/def-store';
import { ModalStore } from 'stores/modalStore/modal-store';
import { NodeStore } from 'stores/nodeStore/node-store';
import { buildConversationDiagnostics, ConversationDiagnostic, ConversationDiagnosticSeverity } from 'utils/conversation-diagnostics-utils';

import './ConversationDiagnosticsModal.css';

type Props = {
  globalModalId: string;
};

type FilterValue = 'all' | ConversationDiagnosticSeverity;
type SegmentedOptions = NonNullable<ComponentProps<typeof Segmented>['options']>;

function getSeverityLabel(severity: ConversationDiagnosticSeverity): string {
  if (severity === 'error') return 'Error';
  return 'Warning';
}

function getCategoryLabel(category: ConversationDiagnostic['category']): string {
  if (category === 'graph') return 'Graph';
  if (category === 'operation') return 'Operation';
  if (category === 'reference') return 'Reference';
  return 'Content';
}

function ConversationDiagnosticsModal({ globalModalId }: Props) {
  const dataStore = useStore<DataStore>('data');
  const defStore = useStore<DefStore>('def');
  const modalStore = useStore<ModalStore>('modal');
  const nodeStore = useStore<NodeStore>('node');
  const [filter, setFilter] = useState<FilterValue>('all');

  const conversationAsset = dataStore.unsavedActiveConversationAsset;
  const diagnostics =
    conversationAsset == null
      ? []
      : buildConversationDiagnostics({
          conversationAsset,
          operationDefinitions: defStore.operations,
          loadedConversationAssets: Array.from(dataStore.conversationAssets.values()),
        });

  const errorCount = diagnostics.filter((diagnostic) => diagnostic.severity === 'error').length;
  const warningCount = diagnostics.filter((diagnostic) => diagnostic.severity === 'warning').length;
  const filteredDiagnostics = diagnostics.filter((diagnostic) => filter === 'all' || diagnostic.severity === filter);

  const filterOptions: SegmentedOptions = [
    { label: `All (${diagnostics.length})`, value: 'all' },
    { label: `Errors (${errorCount})`, value: 'error' },
    { label: `Warnings (${warningCount})`, value: 'warning' },
  ];

  const jumpToNode = (diagnostic: ConversationDiagnostic) => {
    if (diagnostic.nodeId == null) return;

    nodeStore.setActiveNode(diagnostic.nodeId);
    modalStore.closeModal(globalModalId);
    window.setTimeout(() => nodeStore.scrollToActiveNode(true), 50);
  };

  useEffect(() => {
    modalStore.setTitle('Conversation Diagnostics', globalModalId);
    modalStore.setWidth('78vw', globalModalId);
    modalStore.setShowOkButton(false, globalModalId);
    modalStore.setShowCancelButton(true, globalModalId);
    modalStore.setCancelLabel('Close', globalModalId);
  }, []);

  return (
    <div className="conversation-diagnostics">
      <div className="conversation-diagnostics__summary">
        <Alert
          type={errorCount > 0 ? 'error' : warningCount > 0 ? 'warning' : 'success'}
          showIcon
          message={
            diagnostics.length > 0
              ? `${diagnostics.length} diagnostic${diagnostics.length === 1 ? '' : 's'} found`
              : 'No diagnostics found'
          }
          description={
            diagnostics.length > 0
              ? `${errorCount} error${errorCount === 1 ? '' : 's'} and ${warningCount} warning${warningCount === 1 ? '' : 's'} in the active conversation.`
              : 'The active conversation passed the current content, graph, operation, and reference checks.'
          }
        />
        {diagnostics.length > 0 && (
          <Segmented
            size="small"
            options={filterOptions}
            value={filter}
            onChange={(value) => setFilter(value as FilterValue)}
          />
        )}
      </div>

      {filteredDiagnostics.length <= 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No diagnostics in this filter" />
      ) : (
        <div className="conversation-diagnostics__list">
          {filteredDiagnostics.map((diagnostic) => (
            <div key={diagnostic.id} className={`conversation-diagnostics__item conversation-diagnostics__item--${diagnostic.severity}`}>
              <div className="conversation-diagnostics__item-main">
                <div className="conversation-diagnostics__item-title">
                  <Tag color={diagnostic.severity === 'error' ? 'error' : 'warning'}>{getSeverityLabel(diagnostic.severity)}</Tag>
                  <Tag>{getCategoryLabel(diagnostic.category)}</Tag>
                  <span>{diagnostic.title}</span>
                </div>
                <div className="conversation-diagnostics__item-node">{diagnostic.nodeLabel}</div>
                <div className="conversation-diagnostics__item-description">{diagnostic.description}</div>
              </div>
              <Button
                className="conversation-diagnostics__jump-button"
                size="small"
                type="primary"
                icon={<AimOutlined />}
                disabled={diagnostic.nodeId == null}
                onClick={() => jumpToNode(diagnostic)}
              >
                Select
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export const ObservingConversationDiagnosticsModal = observer(ConversationDiagnosticsModal);
