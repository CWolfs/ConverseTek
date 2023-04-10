import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Card, Row, Col, Input, Select, Tooltip, Icon, Checkbox } from 'antd';
import { observer, inject } from 'mobx-react';
import capitalize from 'lodash.capitalize';

import { getId, createId } from '../../utils/conversation-utils';

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

class ConversationGeneral extends Component {
  constructor(props) {
    super(props);

    const { node } = this.props;
    this.populateState(node, true);

    this.handleIdChange = this.handleIdChange.bind(this);
    this.handleIdBlur = this.handleIdBlur.bind(this);
    this.handleSpeakerChange = this.handleSpeakerChange.bind(this);
    this.handleCastIdChange = this.handleCastIdChange.bind(this);
    this.handleSpeakerIdChange = this.handleSpeakerIdChange.bind(this);
    this.handleCommentChange = this.handleCommentChange.bind(this);
    this.handleAvailbleOnceChange = this.handleAvailbleOnceChange.bind(this);
    this.handleHideIfUnavailableChange = this.handleHideIfUnavailableChange.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    const { node: stateNode } = this.state;
    const { node: propNode } = nextProps;

    if (propNode !== stateNode) {
      this.populateState(propNode);
    }
  }

  populateState(node, init = false) {
    const { speaker_override_id: speakerOverrideId, sourceInSceneRef } = node;
    const castId = (sourceInSceneRef && sourceInSceneRef.id) ? sourceInSceneRef.id : null;
    const speakerId = (speakerOverrideId !== '') ? speakerOverrideId : null;
    const defaultSpeaker = (castId !== null || speakerId === null) ? 'castId' : 'speakerId';

    if (init) {
      this.state = {
        nodeId: getId(node.idRef),
        selectedSpeaker: defaultSpeaker,
        castId,
        speakerId,
      };
    } else {
      this.setState({
        nodeId: getId(node.idRef),
        selectedSpeaker: defaultSpeaker,
        castId,
        speakerId,
      });
    }
  }

  handleIdChange(event) {
    this.setState({ nodeId: event.target.value.trim() });
  }

  handleIdBlur() {
    const { nodeStore, node } = this.props;
    const { nodeId } = this.state;
    node.idRef.id = createId(node.idRef, nodeId);
    nodeStore.setRebuild(true);
  }

  handleSpeakerChange(value) {
    const { node } = this.props;

    node.speakerType = value;

    this.setState({ selectedSpeaker: value });
  }

  handleCastIdChange(event) {
    const { node } = this.props;
    const castId = event.target.value.trim();
    if (!node.sourceInSceneRef) {
      node.sourceInSceneRef = { id: castId };
    } else {
      node.sourceInSceneRef.id = castId;
    }

    this.setState({
      castId,
    });
  }

  handleSpeakerIdChange(event) {
    const { node } = this.props;
    const speakerId = event.target.value.trim();
    node.speaker_override_id = speakerId;

    this.setState({
      speakerId,
    });
  }

  handleCommentChange(event) {
    const { node } = this.props;
    const comment = event.target.value;
    node.comment = comment;
  }

  handleAvailbleOnceChange(event) {
    const { node } = this.props;
    const availableOnlyOnce = event.target.checked;
    node.onlyOnce = availableOnlyOnce;
  }

  handleHideIfUnavailableChange(event) {
    const { node } = this.props;
    const alwaysShow = event.target.checked;
    node.hideIfUnavailable = !alwaysShow;
  }

  render() {
    const { node } = this.props;
    const {
      nodeId,
      selectedSpeaker,
      castId,
      speakerId,
    } = this.state;
    const { type } = node;
    const isRootOrResponse = (type !== 'node');

    return (
      <Card className="conversation-general" title={null}>
        <Row gutter={16}>
          <Col {...colOneLayout}>
            <div className="conversation-general__label">Type</div>
          </Col>
          <Col {...colTwoLayout}>
            <div>
              {capitalize(type)}
            </div>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col {...colOneLayout}>
            <div className="conversation-general__label">Id</div>
          </Col>
          <Col {...colTwoLayout}>
            <div>
              <Input
                value={nodeId}
                onChange={this.handleIdChange}
                onBlur={this.handleIdBlur}
                spellCheck="false"
              />
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
                value={selectedSpeaker}
                style={{ width: 115 }}
                onChange={this.handleSpeakerChange}
              >
                <Option value="castId">Cast Id</Option>
                <Option value="speakerId">Speaker Id</Option>
              </Select>
              {(selectedSpeaker === 'castId' &&
                <Input
                  value={castId}
                  onChange={this.handleCastIdChange}
                  placeholder="e.g. DariusDefault (without 'castDef_')"
                  spellCheck="false"
                />
              )}
              {(selectedSpeaker === 'speakerId' &&
                <Input
                  value={speakerId}
                  onChange={this.handleSpeakerIdChange}
                  spellCheck="false"
                />
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
            <Checkbox
              onChange={this.handleAvailbleOnceChange}
              checked={node.onlyOnce}
            />
          </Col>
        </Row>
        )}

        {isRootOrResponse && (
        <Row gutter={16}>
          <Col {...colOneLayout}>
            <div className="conversation-general__label">Always Show</div>
          </Col>
          <Col {...colTwoLayout}>
            <Checkbox
              onChange={this.handleHideIfUnavailableChange}
              checked={!node.hideIfUnavailable}
            />
          </Col>
        </Row>
        )}

        <Row gutter={16}>
          <Col {...colOneLayout}>
            <div className="conversation-general__label last">Comment</div>
          </Col>
          <Col {...colTwoLayout}>
            <Input
              value={node.comment}
              onChange={this.handleCommentChange}
              spellCheck="false"
            />
          </Col>
        </Row>
      </Card>
    );
  }
}

ConversationGeneral.propTypes = {
  nodeStore: PropTypes.object.isRequired,
  node: PropTypes.object.isRequired,
};

export default inject('nodeStore')(observer(ConversationGeneral));
