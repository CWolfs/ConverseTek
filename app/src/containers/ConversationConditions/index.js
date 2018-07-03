import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { observer, inject } from 'mobx-react';
import { Button, Icon, List, Select } from 'antd';
import classnames from 'classnames';

const { Option } = Select;

@observer
class ConversationConditions extends Component {
  constructor(props) {
    super(props);

    this.renderListItem = this.renderListItem.bind(this);
    this.onItemRemoved = this.onItemRemoved.bind(this);
    this.onSearch = this.onSearch.bind(this);
    this.onChange = this.onChange.bind(this);
  }

  onItemRemoved(index) {

  }

  onSearch(condition, value) {
    condition.functionName = value;
  }

  onChange(condition, option) {
    condition.functionName = option.key;
  }

  renderListItem(condition, index) {
    const { defStore } = this.props;
    const { operations } = defStore;
    const key = index;

    const classes = classnames({
      first: index === 0,
      last: index === (this.dataSize - 1),
    });

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
        <Select
          mode="combobox"
          showSearch
          onSearch={value => this.onSearch(condition, value)}
          onChange={value => this.onChange(condition, value)}
          value={{ key: condition.functionName, label: 'test' }}
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

    return (
      <div>
        <List
          dataSource={conditions}
          renderItem={this.renderListItem}
        />
      </div>
    );
  }
}

ConversationConditions.propTypes = {
  dataStore: PropTypes.object.isRequired,
  defStore: PropTypes.object.isRequired,
  node: PropTypes.object.isRequired,
};

export default inject('dataStore', 'defStore')(ConversationConditions);
