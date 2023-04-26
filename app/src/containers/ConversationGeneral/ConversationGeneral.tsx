import React, { useState, useEffect, ChangeEvent } from 'react';
import PropTypes from 'prop-types';
import { Card, Row, Col, Input, Select, Tooltip, Icon, Checkbox } from 'antd';
import { SelectValue } from 'antd/lib/select';
import { CheckboxChangeEvent } from 'antd/lib/checkbox';
import { observer } from 'mobx-react';
import capitalize from 'lodash.capitalize';

import { getId, createId } from 'utils/conversation-utils';
import { useStore } from 'hooks/useStore';
import { ElementNodeType, PromptNodeType } from 'types';
import { NodeStore } from 'stores/nodeStore/node-store';

import './ConversationGeneral.css';

const { Option } = Select;

const colOneLayout = {
  xs: { span: 24 },
  sm: { span: 24 },
  md: { span: 8 },
  lg: { span: 5 },
  xxl: { span: 4 },
};

const colTwoLayout = {
  xs: { span: 24 },
  sm: { span: 24 },
  md: { span: 24 - colOneLayout.md.span },
  lg: { span: 24 - colOneLayout.lg.span },
  xxl: { span: 24 - colOneLayout.xxl.span },
};

type Props = {
  node: PromptNodeType | ElementNodeType;
};

function ConversationGeneral({ node }: Props) {
  const nodeStore = useStore<NodeStore>('node');

  const { idRef, type } = node;

  let speakerOverrideId = null;
  let sourceInSceneRef = null;
  if (type === 'node') {
    ({ speakerOverrideId, sourceInSceneRef } = node);
  }

  const castId: string | null = sourceInSceneRef && sourceInSceneRef.id ? sourceInSceneRef.id : null;
  const nodeSpeakerId = speakerOverrideId !== '' ? speakerOverrideId : null;
  const speakerType = castId !== null || nodeSpeakerId === null ? 'castId' : 'speakerId';
  const isRootOrResponse = type !== 'node';

  const [nodeId, setNodeId] = useState<string>(getId(idRef));
  const [selectedSpeakerType, setSelectedSpeakerType] = useState<string>(speakerType);

  const populateState = () => {
    setNodeId(getId(idRef));
    setSelectedSpeakerType(speakerType);
  };

  // onNodeChange
  useEffect(() => {
    populateState();
  }, [node]);

  const handleIdChange = (event: ChangeEvent<HTMLInputElement>) => {
    setNodeId(event.target.value.trim());
  };

  const handleIdBlur = () => {
    nodeStore.setNodeId(node, createId(node.idRef, nodeId));
  };

  const handleSpeakerChange = (value: SelectValue) => {
    const { type } = node;
    if (type !== 'node') return;
    if (value !== 'speakerId' && value !== 'castId') throw Error(`Invalid speaker change with value ${value as string}`);

    nodeStore.setPromptNodeSpeakerType(node, value);
    setSelectedSpeakerType(value);
  };

  const handleCastIdChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { type } = node;
    if (type !== 'node') return;

    const newCastId = event.target.value.trim();
    nodeStore.setPromptNodeSourceInSceneId(node, newCastId);
  };

  const handleSpeakerIdChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { type } = node;
    if (type !== 'node') return;

    const newSpeakerId = event.target.value.trim();
    nodeStore.setPromptNodeSpeakerId(node, newSpeakerId);
  };

  const handleCommentChange = (event: ChangeEvent<HTMLInputElement>) => {
    const newComment = event.target.value;
    nodeStore.setNodeComment(node, newComment);
  };

  const handleAvailbleOnceChange = (event: CheckboxChangeEvent) => {
    const { type } = node;
    if (type === 'node') return;

    const newAvailableOnlyOnce = event.target.checked;
    nodeStore.setElementNodeOnlyOnce(node, newAvailableOnlyOnce);
  };

  const handleHideIfUnavailableChange = (event: CheckboxChangeEvent) => {
    const { type } = node;
    if (type === 'node') return;

    const newAlwaysShow = event.target.checked;
    nodeStore.setElementNodeHideIfUnavailable(node, !newAlwaysShow);
  };

  return (
    <Card className="conversation-general" title={null}>
      <Row gutter={16}>
        <Col {...colOneLayout}>
          <div className="conversation-general__label">Type</div>
        </Col>
        <Col {...colTwoLayout}>
          <div>{capitalize(type)}</div>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col {...colOneLayout}>
          <div className="conversation-general__label">Id</div>
        </Col>
        <Col {...colTwoLayout}>
          <div>
            <Input value={nodeId} onChange={handleIdChange} onBlur={handleIdBlur} spellCheck="false" />
          </div>
        </Col>
      </Row>

      {type === 'node' && (
        <Row gutter={16}>
          <Col {...colOneLayout}>
            <div className="conversation-general__speaker-group-label">
              <Tooltip title="'Cast Id' will not be saved if 'Speaker Id' is selected">
                <Icon type="exclamation-circle-o" />
              </Tooltip>
              <div className="conversation-general__label">Speaker</div>
            </div>
          </Col>
          <Col {...colTwoLayout}>
            <div className="conversation-general__speaker-group">
              <Select
                className="conversation-general__speaker-select"
                value={selectedSpeakerType}
                style={{ width: 115 }}
                onChange={handleSpeakerChange}
              >
                <Option value="castId">Cast Id</Option>
                <Option value="speakerId">Speaker Id</Option>
              </Select>
              {selectedSpeakerType === 'castId' && (
                <Input
                  value={castId || undefined}
                  onChange={handleCastIdChange}
                  placeholder="e.g. DariusDefault (without 'castDef_')"
                  spellCheck="false"
                />
              )}
              {selectedSpeakerType === 'speakerId' && (
                <Input value={nodeSpeakerId || undefined} onChange={handleSpeakerIdChange} spellCheck="false" />
              )}
            </div>
          </Col>
        </Row>
      )}

      {isRootOrResponse && (
        <Row gutter={16}>
          <Col {...colOneLayout}>
            <div className="conversation-general__label">Only Once</div>
          </Col>
          <Col {...colTwoLayout}>
            <Checkbox onChange={handleAvailbleOnceChange} checked={node.onlyOnce} />
          </Col>
        </Row>
      )}

      {isRootOrResponse && (
        <Row gutter={16}>
          <Col {...colOneLayout}>
            <div className="conversation-general__label">Always Show</div>
          </Col>
          <Col {...colTwoLayout}>
            <Checkbox onChange={handleHideIfUnavailableChange} checked={!node.hideIfUnavailable} />
          </Col>
        </Row>
      )}

      <Row gutter={16}>
        <Col {...colOneLayout}>
          <div className="conversation-general__label last">Comment</div>
        </Col>
        <Col {...colTwoLayout}>
          <Input value={node.comment || undefined} onChange={handleCommentChange} spellCheck="false" />
        </Col>
      </Row>
    </Card>
  );
}

ConversationGeneral.propTypes = {
  node: PropTypes.object.isRequired,
};

export const ObservingConversationGeneral = observer(ConversationGeneral);
