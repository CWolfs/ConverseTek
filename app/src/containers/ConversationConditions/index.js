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

    const header = (<ViewableLogic logic={condition} />);

    return (
      <Panel key={key} className={classes} header={header}>
        <p>1</p>
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
          <Collapse defaultActiveKey={['1']}>
            {conditions.map((condition, index) => this.renderPanel(condition, index))}
            {/*
            <Panel header="This is panel header 1" key="1">
              <p>1</p>
            </Panel>
            <Panel header="This is panel header 2" key="2">
              <p>2</p>
            </Panel>
            <Panel className="last" header="This is panel header 3" key="3">
              <p>3</p>
            </Panel>
            */}
          </Collapse>
        </CustomScroll>
        {/*
          <List
            dataSource={conditions}
            renderItem={this.renderListItem}
          />
        */}
      </div>
    );
  }
}

ConversationConditions.propTypes = {
  node: PropTypes.object.isRequired,
};

export default ConversationConditions;
