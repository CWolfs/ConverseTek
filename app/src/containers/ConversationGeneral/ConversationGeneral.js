import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Card, Row, Col, Input, Select, Tooltip, Icon, Checkbox } from 'antd';
import { observer } from 'mobx-react';
import capitalize from 'lodash.capitalize';

import { getId, createId } from 'utils/conversation-utils';
import { useStore } from 'hooks/useStore';

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

function ConversationGeneral({ node }) {
  const nodeStore = useStore('node');

  const { idRef, speakerOverrideId, sourceInSceneRef, type } = node;
  const sceneRefCastId = sourceInSceneRef && sourceInSceneRef.id ? sourceInSceneRef.id : null;
  const nodeSpeakerId = speakerOverrideId !== '' ? speakerOverrideId : null;
  const defaultSpeaker = sceneRefCastId !== null || nodeSpeakerId === null ? 'castId' : 'speakerId';
  const isRootOrResponse = type !== 'node';

  const [nodeId, setNodeId] = useState(idRef);
  const [selectedSpeaker, setSelectedSpeaker] = useState(defaultSpeaker);
  const [castId, setCastId] = useState(sceneRefCastId);
  const [speakerId, setSpeakerId] = useState(nodeSpeakerId);

  const populateState = () => {
    setNodeId(getId(idRef));
    setSelectedSpeaker(selectedSpeaker);
    setCastId(castId);
    setSpeakerId(speakerId);
  };

  // onNodeChange
  // Maybe only this useEffect is needed. Test it.
  useEffect(() => {
    populateState(node);
  }, [node]);

  const handleIdChange = (event) => {
    setNodeId(event.target.value.trim());
  };

  const handleIdBlur = () => {
    // FIXME: Add immutability
    node.idRef.id = createId(node.idRef, nodeId);
    nodeStore.setRebuild(true);
  };

  const handleSpeakerChange = (value) => {
    // FIXME: Add immutability
    node.speakerType = value;
    setSelectedSpeaker(value);
  };

  const handleCastIdChange = (event) => {
    const newCastId = event.target.value.trim();

    if (!node.sourceInSceneRef) {
      // FIXME: Add immutability
      node.sourceInSceneRef = { id: newCastId };
    } else {
      // FIXME: Add immutability
      node.sourceInSceneRef.id = newCastId;
    }

    setCastId(newCastId);
  };

  const handleSpeakerIdChange = (event) => {
    const newSpeakerId = event.target.value.trim();
    // FIXME: Add immutability
    node.speakerOverrideId = newSpeakerId;

    setSpeakerId(newSpeakerId);
  };

  const handleCommentChange = (event) => {
    const newComment = event.target.value;
    // FIXME: Add immutability
    node.comment = newComment;
  };

  const handleAvailbleOnceChange = (event) => {
    const newAvailableOnlyOnce = event.target.checked;
    // FIXME: Add immutability
    node.onlyOnce = newAvailableOnlyOnce;
  };

  const handleHideIfUnavailableChange = (event) => {
    const newAlwaysShow = event.target.checked;
    // FIXME: Add immutability
    node.hideIfUnavailable = !newAlwaysShow;
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
              <Select className="conversation-general__speaker-select" value={selectedSpeaker} style={{ width: 115 }} onChange={handleSpeakerChange}>
                <Option value="castId">Cast Id</Option>
                <Option value="speakerId">Speaker Id</Option>
              </Select>
              {selectedSpeaker === 'castId' && (
                <Input value={castId} onChange={handleCastIdChange} placeholder="e.g. DariusDefault (without 'castDef_')" spellCheck="false" />
              )}
              {selectedSpeaker === 'speakerId' && <Input value={speakerId} onChange={handleSpeakerIdChange} spellCheck="false" />}
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
          <Input value={node.comment} onChange={handleCommentChange} spellCheck="false" />
        </Col>
      </Row>
    </Card>
  );
}

ConversationGeneral.propTypes = {
  node: PropTypes.object.isRequired,
};

export const ObservingConversationGeneral = observer(ConversationGeneral);
