import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { observer, inject } from 'mobx-react';
import { Button, Icon, List } from 'antd';
import classnames from 'classnames';

@observer
class ConversationConditions extends Component {
  constructor(props) {
    super(props);

    this.renderListItem = this.renderListItem.bind(this);
    this.onItemRemoved = this.onItemRemoved(this);
  }

  onItemRemoved(index) {

  }

  renderListItem(item, index) {
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
        {item.functionName}
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
  nodeStore: PropTypes.object.isRequired,
  node: PropTypes.object.isRequired,
};

export default inject('dataStore', 'nodeStore')(ConversationConditions);
