import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { observer } from 'mobx-react';
import { Button, Icon, Collapse } from 'antd';
import classnames from 'classnames';
// import CustomScroll from 'react-custom-scroll';

import 'react-custom-scroll/dist/customScroll.css';

import ViewableLogic from '../../components/ViewableLogic';

import './ConversationConditions.css';

const { Panel } = Collapse;

@observer
class ConversationConditions extends Component {
  constructor(props) {
    super(props);

    this.dataSize = 0;

    this.renderPanel = this.renderPanel.bind(this);
    this.resize = this.resize.bind(this);
  }

  componentDidMount() {
    window.addEventListener('resize', this.resize);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.resize);
  }

  resize() {
    this.forceUpdate();
  }

  renderPanel(condition, index) {
    const key = index;

    const classes = classnames(
      'conversation-conditions__panel',
      {
        first: index === 0,
        last: index === (this.dataSize - 1),
      },
    );

    const header = (
      <div className="conversation-conditions__panel-header">
        <div className="conversation-conditions__panel-header-logic">
          <ViewableLogic logic={condition} />
        </div>
        <Button
          size="small"
          type="caution"
          className="conversation-conditions__panel-header-delete-button"
        >
          <Icon type="delete" />
        </Button>
      </div>);

    return (
      <Panel key={key} className={classes} header={header}>
        <p>Here's where you'd edit the condition</p>
        {/*
        <Select
          mode="combobox"
          showSearch
          // onSearch={value => this.onSearch(condition, value)}
          // onChange={value => this.onChange(condition, value)}
          defaultValue={{ key: condition.functionName, label: 'test' }}
          filterOption={(input, option) => {
            const { key: optionKey, props: optionProps } = option;
            const { title: optionTitle } = optionProps;

            if (optionKey.toLowerCase().includes(input.toLowerCase()) ||
                optionTitle.toLowerCase().includes(input.toLowerCase())) {
              return true;
            }
            return false;
          }}
          style={{ width: 250 }}
          labelInValue
          optionLabelProp="title"
        >
          {operations.map(operation => (
            <Option
              key={operation.Key}
              title={operation.Label}
            >
              {operation.Label}
            </Option>
          ))}
        </Select>
        */} 
      </Panel>
    );
  }

  render() {
    const { node } = this.props;
    let { conditions } = node;
    if (conditions === null) {
      conditions = [];
    } else {
      conditions = conditions.ops;
    }

    this.dataSize = conditions.length;
    const height = window.document.getElementsByClassName('conversation-editor__details')[0].clientHeight - 22;

    return (
      <div className="conversation-conditions" style={{ height }}>
        {/*
        <CustomScroll heightRelativeToParent={`${height}px`}>
        </CustomScroll>
        */}
        <Collapse>
          {conditions.map((condition, index) => this.renderPanel(condition, index))}
        </Collapse>
        <div className="conversation-conditions__buttons">
          <Button
            type="secondary"
            size="small"
          >
            <Icon type="plus" />
          </Button>
        </div>
      </div>
    );
  }
}

ConversationConditions.propTypes = {
  node: PropTypes.object.isRequired,
};

export default ConversationConditions;
