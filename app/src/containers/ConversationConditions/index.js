import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { observer, inject } from 'mobx-react';
import { Button, Icon, List } from 'antd';
import classnames from 'classnames';

import ToggleEditable from '../../components/ToggleEditable';
import ViewableLogic from '../../components/ViewableLogic';

import './ConversationConditions.css';

// const { Option } = Select;

@observer
class ConversationConditions extends Component {
  constructor(props) {
    super(props);

    this.dataSize = 0;

    this.renderListItem = this.renderListItem.bind(this);
    // this.onItemRemoved = this.onItemRemoved.bind(this);
    // this.onSearch = this.onSearch.bind(this);
    // this.onChange = this.onChange.bind(this);
  }

  /*
  onItemRemoved(index) {

  }

  onSearch(condition, value) {
    condition.functionName = value;
  }

  onChange(condition, option) {
    condition.functionName = option.key;
  }
  */

  renderListItem(condition, index) {
    const key = index;

    const classes = classnames(
      'conversation-conditions__list-item',
      {
        first: index === 0,
        last: index === (this.dataSize - 1),
      },
    );

    return (
      <List.Item
        key={key}
        className={classes}
        actions={[
          <Button className="icon-button" onClick={() => this.onItemRemove(key)}>
            <Icon type="delete" />
          </Button>,
        ]}
      >
        <ToggleEditable>
          <ViewableLogic logic={condition} />
          <div>World 2</div>
        </ToggleEditable>
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

      </List.Item>
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

    return (
      <div className="conversation-conditions">
        <List
          dataSource={conditions}
          renderItem={this.renderListItem}
        />
      </div>
    );
  }
}

ConversationConditions.propTypes = {
  node: PropTypes.object.isRequired,
};

export default ConversationConditions;
