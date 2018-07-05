import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { observer } from 'mobx-react';
import { Button, Icon, List, Collapse } from 'antd';
import classnames from 'classnames';
import CustomScroll from 'react-custom-scroll';

import 'react-custom-scroll/dist/customScroll.css';

// import ToggleEditable from '../../components/ToggleEditable';
import ViewableLogic from '../../components/ViewableLogic';

import './ConversationConditions.css';

// const { Option } = Select;
const { Panel } = Collapse;

@observer
class ConversationConditions extends Component {
  constructor(props) {
    super(props);

    this.dataSize = 0;

    this.renderPanel = this.renderPanel.bind(this);
    // this.renderListItem = this.renderListItem.bind(this);
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
      </Panel>
    );
  }

  /*
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
      </List.Item>
    );
  }
  */

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
        <CustomScroll heightRelativeToParent="calc(100% - 1px)">
          <Collapse>
            {conditions.map((condition, index) => this.renderPanel(condition, index))}
          </Collapse>
        </CustomScroll>
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
