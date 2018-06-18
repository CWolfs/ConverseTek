import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Card, Row, Col, Input } from 'antd';
import { observer, inject } from 'mobx-react';
import capitalize from 'lodash.capitalize';

import './ConversationGeneral.css';

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

@observer
class ConversationGeneral extends Component {
  constructor(props) {
    super(props);

    this.handleIdChange = this.handleIdChange.bind(this);
  }

  handleIdChange(event) {
    const { nodeStore, node } = this.props;
    node.idRef.id = event.target.value.trim();
    nodeStore.setRebuild(true);
  }

  render() {
    const { node } = this.props;
    const { type } = node;

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
                value={node.idRef.id}
                onChange={this.handleIdChange}
                spellCheck="false"
              />
            </div>
          </Col>
        </Row>

        {type === 'node' && (
        <Row gutter={16}>
          <Col {...colOneLayout}>
            <div className="conversation-general__label">Index</div>
          </Col>
          <Col {...colTwoLayout}>
            <div>{node.index}</div>
          </Col>
        </Row>
        )}

        <Row gutter={16}>
          <Col {...colOneLayout}>
            <div className="conversation-general__label">Speaker Id</div>
          </Col>
          <Col {...colTwoLayout}>
            <div>{node.speaker_override_id}</div>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col {...colOneLayout}>
            <div className="conversation-general__label">Comment</div>
          </Col>
          <Col {...colTwoLayout}>
            <div>{node.comment}</div>
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

export default inject('nodeStore')(ConversationGeneral);
