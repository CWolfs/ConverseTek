import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button } from 'antd';

import { useStore } from 'hooks/useStore';
import { ModalStore } from 'stores/modalStore/modal-store';
import { formatAiDraftArtifactContent } from 'utils/ai-artifact-utils';

type Props = {
  globalModalId: string;
  title: string;
  path: string;
  content: string;
  truncated: boolean;
};

export function AiDraftArtifactViewer({ globalModalId, title, path, content, truncated }: Props) {
  const modalStore = useStore<ModalStore>('modal');
  const [viewMode, setViewMode] = useState<'formatted' | 'raw'>('formatted');
  const formattedContent = useMemo(() => formatAiDraftArtifactContent(content), [content]);
  const displayedContent = viewMode === 'formatted' ? formattedContent.formattedContent : content;

  useEffect(() => {
    modalStore.setTitle(title, globalModalId);
    modalStore.setWidth('72vw', globalModalId);
    modalStore.setShowOkButton(false, globalModalId);
    modalStore.setShowCancelButton(true, globalModalId);
    modalStore.setCancelLabel('Close', globalModalId);
  }, []);

  return (
    <div className="ai-draft-artifact-viewer">
      <div className="ai-draft-artifact-viewer__path">{path}</div>
      <div className="ai-draft-artifact-viewer__toolbar">
        <Button.Group>
          <Button
            size="small"
            type={viewMode === 'formatted' ? 'primary' : 'default'}
            disabled={!formattedContent.wasFormatted}
            onClick={() => setViewMode('formatted')}
          >
            Formatted
          </Button>
          <Button size="small" type={viewMode === 'raw' ? 'primary' : 'default'} onClick={() => setViewMode('raw')}>
            Raw
          </Button>
        </Button.Group>
        {viewMode === 'formatted' && formattedContent.notes.length > 0 && (
          <span>{formattedContent.notes.join(' ')}</span>
        )}
      </div>
      {truncated && (
        <Alert
          className="ai-draft-artifact-viewer__alert"
          type="warning"
          message="This diagnostics artifact is large, so ConverseTek is showing the first part only."
        />
      )}
      <pre>{displayedContent || '(empty)'}</pre>
    </div>
  );
}
