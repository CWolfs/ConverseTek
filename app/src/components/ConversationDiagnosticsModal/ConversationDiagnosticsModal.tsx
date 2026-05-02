import { useEffect, useState } from 'react';
import type { ComponentProps } from 'react';
import { Button, Empty, Input, Select, Segmented, Tag } from 'antd';
import {
  AimOutlined,
  CheckCircleOutlined,
  CompressOutlined,
  DownOutlined,
  DownloadOutlined,
  ExclamationCircleOutlined,
  ExpandAltOutlined,
  InfoCircleOutlined,
  RightOutlined,
  SearchOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import classnames from 'classnames';
import { observer } from 'mobx-react';

import { useStore } from 'hooks/useStore';
import { DataStore } from 'stores/dataStore/data-store';
import { DefStore } from 'stores/defStore/def-store';
import { ModalStore } from 'stores/modalStore/modal-store';
import { NodeStore } from 'stores/nodeStore/node-store';
import { buildConversationDiagnostics } from 'utils/conversation-diagnostics-utils';
import type { ConversationDiagnostic, ConversationDiagnosticCategory, ConversationDiagnosticSeverity } from 'utils/conversation-diagnostics-utils';

import './ConversationDiagnosticsModal.css';

type Props = {
  globalModalId?: string;
  variant?: 'modal' | 'side-panel';
};

type FilterValue = 'all' | ConversationDiagnosticSeverity;
type CategoryFilterValue = 'all' | ConversationDiagnosticCategory;
type SegmentedOptions = NonNullable<ComponentProps<typeof Segmented>['options']>;

function getSeverityLabel(severity: ConversationDiagnosticSeverity): string {
  if (severity === 'error') return 'Error';
  if (severity === 'info') return 'Info';
  return 'Warning';
}

function getSeverityTagColour(severity: ConversationDiagnosticSeverity): string {
  if (severity === 'error') return 'error';
  if (severity === 'info') return 'processing';
  return 'warning';
}

function getCategoryLabel(category: ConversationDiagnostic['category']): string {
  if (category === 'graph') return 'Graph';
  if (category === 'operation') return 'Operation';
  if (category === 'reference') return 'Reference';
  return 'Content';
}

function ConversationDiagnosticsContent({ globalModalId, variant = 'modal' }: Props) {
  const dataStore = useStore<DataStore>('data');
  const defStore = useStore<DefStore>('def');
  const modalStore = useStore<ModalStore>('modal');
  const nodeStore = useStore<NodeStore>('node');
  const [filter, setFilter] = useState<FilterValue>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilterValue>('all');
  const [searchText, setSearchText] = useState('');
  const [expandedDiagnosticIds, setExpandedDiagnosticIds] = useState<Set<string>>(() => new Set());

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
  const infoCount = diagnostics.filter((diagnostic) => diagnostic.severity === 'info').length;
  const normalisedSearchText = searchText.trim().toLowerCase();
  const filteredDiagnostics = diagnostics.filter((diagnostic) => {
    if (filter !== 'all' && diagnostic.severity !== filter) return false;
    if (categoryFilter !== 'all' && diagnostic.category !== categoryFilter) return false;
    if (normalisedSearchText === '') return true;

    return [diagnostic.title, diagnostic.nodeLabel, diagnostic.description, getCategoryLabel(diagnostic.category), getSeverityLabel(diagnostic.severity)]
      .join(' ')
      .toLowerCase()
      .includes(normalisedSearchText);
  });

  const filterOptions: SegmentedOptions = [
    { label: `All (${diagnostics.length})`, value: 'all' },
    { label: `Errors (${errorCount})`, value: 'error' },
    { label: `Warnings (${warningCount})`, value: 'warning' },
    { label: `Info (${infoCount})`, value: 'info' },
  ];
  const allFilteredDiagnosticsExpanded =
    filteredDiagnostics.length > 0 && filteredDiagnostics.every((diagnostic) => expandedDiagnosticIds.has(diagnostic.id));
  const toggleVisibleDiagnosticsLabel = allFilteredDiagnosticsExpanded ? 'Collapse visible diagnostics' : 'Expand visible diagnostics';

  const toggleDiagnostic = (diagnosticId: string) => {
    setExpandedDiagnosticIds((currentIds) => {
      const nextIds = new Set(currentIds);
      if (nextIds.has(diagnosticId)) {
        nextIds.delete(diagnosticId);
      } else {
        nextIds.add(diagnosticId);
      }
      return nextIds;
    });
  };

  const toggleFilteredDiagnostics = () => {
    setExpandedDiagnosticIds((currentIds) => {
      const nextIds = new Set(currentIds);
      if (allFilteredDiagnosticsExpanded) {
        filteredDiagnostics.forEach((diagnostic) => nextIds.delete(diagnostic.id));
      } else {
        filteredDiagnostics.forEach((diagnostic) => nextIds.add(diagnostic.id));
      }
      return nextIds;
    });
  };

  const jumpToNode = (diagnostic: ConversationDiagnostic) => {
    if (diagnostic.nodeId == null) return;

    nodeStore.setActiveNode(diagnostic.nodeId);
    if (globalModalId != null) modalStore.closeModal(globalModalId);
    window.setTimeout(() => nodeStore.scrollToActiveNode(true), 50);
  };

  const exportReport = () => {
    const conversationName = conversationAsset?.conversation.uiName || conversationAsset?.conversation.idRef.id || 'Active Conversation';
    const report = [
      `Conversation Diagnostics - ${conversationName}`,
      '',
      `${diagnostics.length} diagnostic${diagnostics.length === 1 ? '' : 's'} found`,
      getSummaryCountsText(errorCount, warningCount, infoCount),
      '',
      ...diagnostics.flatMap((diagnostic, index) => [
        `${index + 1}. [${getSeverityLabel(diagnostic.severity)}] ${diagnostic.title}`,
        `   Area: ${getCategoryLabel(diagnostic.category)}`,
        `   Node: ${diagnostic.nodeLabel}`,
        `   Detail: ${diagnostic.description}`,
        '',
      ]),
    ].join('\n');

    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `conversetek-diagnostics-${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  useEffect(() => {
    if (globalModalId == null) return;

    modalStore.setTitle('Conversation Diagnostics', globalModalId);
    modalStore.setWidth('min(74rem, 86vw)', globalModalId);
    modalStore.setShowOkButton(false, globalModalId);
    modalStore.setShowCancelButton(true, globalModalId);
    modalStore.setCancelLabel('Close', globalModalId);
  }, []);

  useEffect(() => {
    const diagnosticIds = new Set(diagnostics.map((diagnostic) => diagnostic.id));
    setExpandedDiagnosticIds((currentIds) => {
      const nextIds = new Set([...currentIds].filter((diagnosticId) => diagnosticIds.has(diagnosticId)));
      return nextIds.size === currentIds.size ? currentIds : nextIds;
    });
  }, [diagnostics.map((diagnostic) => diagnostic.id).join('|')]);

  return (
    <div
      className={classnames('conversation-diagnostics', {
        'conversation-diagnostics--side-panel': variant === 'side-panel',
      })}
    >
      <section className={`conversation-diagnostics__summary conversation-diagnostics__summary--${getSummaryTone(errorCount, warningCount, infoCount)}`}>
        <div className="conversation-diagnostics__summary-icon" aria-hidden="true">
          {errorCount > 0 ? <ExclamationCircleOutlined /> : warningCount > 0 ? <WarningOutlined /> : infoCount > 0 ? <InfoCircleOutlined /> : <CheckCircleOutlined />}
        </div>
        <div className="conversation-diagnostics__summary-copy">
          <div className="conversation-diagnostics__summary-title">
            {diagnostics.length > 0
              ? `${diagnostics.length} diagnostic${diagnostics.length === 1 ? '' : 's'} found`
              : 'No diagnostics found'}
          </div>
          <div className="conversation-diagnostics__summary-description">
            {diagnostics.length > 0
              ? `${getSummaryCountsText(errorCount, warningCount, infoCount)}.`
              : 'The active conversation passed the current content, graph, operation, and reference checks.'}
          </div>
        </div>
        <Button icon={<DownloadOutlined />} onClick={exportReport} disabled={diagnostics.length <= 0}>
          Export Report
        </Button>
      </section>

      {diagnostics.length > 0 && (
        <div className="conversation-diagnostics__toolbar">
          <Segmented
            size="small"
            options={filterOptions}
            value={filter}
            onChange={(value) => setFilter(value as FilterValue)}
          />
          <div className="conversation-diagnostics__toolbar-controls">
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="Search diagnostics..."
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
            />
            <Select<CategoryFilterValue>
              className="conversation-diagnostics__category-select"
              classNames={{
                popup: {
                  root: classnames('conversation-diagnostics__category-dropdown', {
                    'conversation-diagnostics__category-dropdown--dark': variant === 'side-panel',
                  }),
                },
              }}
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={[
                { label: 'All areas', value: 'all' },
                { label: 'Content', value: 'content' },
                { label: 'Graph', value: 'graph' },
                { label: 'Operation', value: 'operation' },
                { label: 'Reference', value: 'reference' },
              ]}
            />
            <Button
              className="conversation-diagnostics__expand-toggle"
              icon={allFilteredDiagnosticsExpanded ? <CompressOutlined /> : <ExpandAltOutlined />}
              aria-label={variant === 'side-panel' ? toggleVisibleDiagnosticsLabel : undefined}
              title={variant === 'side-panel' ? toggleVisibleDiagnosticsLabel : undefined}
              onClick={toggleFilteredDiagnostics}
            >
              {variant === 'side-panel' ? null : allFilteredDiagnosticsExpanded ? 'Collapse Visible' : 'Expand Visible'}
            </Button>
          </div>
        </div>
      )}

      {filteredDiagnostics.length <= 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={diagnostics.length <= 0 ? 'No diagnostics found' : 'No diagnostics in this filter'} />
      ) : (
        <div className="conversation-diagnostics__list">
          {filteredDiagnostics.map((diagnostic) => {
            const isExpanded = expandedDiagnosticIds.has(diagnostic.id);

            return (
              <div key={diagnostic.id} className={`conversation-diagnostics__item conversation-diagnostics__item--${diagnostic.severity}`}>
                <div className="conversation-diagnostics__item-accent" aria-hidden="true" />
                <div className="conversation-diagnostics__item-panel">
                  <button
                    type="button"
                    className="conversation-diagnostics__item-summary"
                    aria-expanded={isExpanded}
                    onClick={() => toggleDiagnostic(diagnostic.id)}
                  >
                    <span className="conversation-diagnostics__item-toggle" aria-hidden="true">
                      {isExpanded ? <DownOutlined /> : <RightOutlined />}
                    </span>
                    <span className="conversation-diagnostics__item-summary-copy">
                      <span className="conversation-diagnostics__item-title">{diagnostic.title}</span>
                      <span className="conversation-diagnostics__item-node">{diagnostic.nodeLabel}</span>
                    </span>
                    <span className="conversation-diagnostics__item-tags">
                      <Tag color={getSeverityTagColour(diagnostic.severity)}>{getSeverityLabel(diagnostic.severity)}</Tag>
                      <Tag>{getCategoryLabel(diagnostic.category)}</Tag>
                    </span>
                  </button>
                  {isExpanded && (
                    <div className="conversation-diagnostics__item-body">
                      <div className="conversation-diagnostics__item-main">
                        <div className="conversation-diagnostics__item-description">{diagnostic.description}</div>
                      </div>
                      <aside className="conversation-diagnostics__item-details">
                        <MetaRow label="Severity" value={getSeverityLabel(diagnostic.severity)} />
                        <MetaRow label="Area" value={getCategoryLabel(diagnostic.category)} />
                        <MetaRow label="Node" value={diagnostic.nodeLabel} />
                        <Button
                          className="conversation-diagnostics__jump-button"
                          type="link"
                          icon={<AimOutlined />}
                          disabled={diagnostic.nodeId == null}
                          onClick={() => jumpToNode(diagnostic)}
                        >
                          View in Conversation
                        </Button>
                      </aside>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function getSummaryTone(errorCount: number, warningCount: number, infoCount: number): ConversationDiagnosticSeverity | 'success' {
  if (errorCount > 0) return 'error';
  if (warningCount > 0) return 'warning';
  if (infoCount > 0) return 'info';
  return 'success';
}

function getSummaryCountsText(errorCount: number, warningCount: number, infoCount: number): string {
  const errorText = `${errorCount} error${errorCount === 1 ? '' : 's'}`;
  const warningText = `${warningCount} warning${warningCount === 1 ? '' : 's'}`;
  const infoText = `${infoCount} info`;
  return `${errorText}, ${warningText}, and ${infoText}`;
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="conversation-diagnostics__meta-row">
      <div className="conversation-diagnostics__meta-label">{label}</div>
      <div className="conversation-diagnostics__meta-value">{value}</div>
    </div>
  );
}

export const ObservingConversationDiagnosticsModal = observer(ConversationDiagnosticsContent);

function ConversationDiagnosticsPanel() {
  return <ConversationDiagnosticsContent variant="side-panel" />;
}

export const ObservingConversationDiagnosticsPanel = observer(ConversationDiagnosticsPanel);
