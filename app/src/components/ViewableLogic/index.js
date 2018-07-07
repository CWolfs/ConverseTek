import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { observer, inject } from 'mobx-react';

@observer
/* eslint-disable react/no-array-index-key */
class ViewableLogic extends Component {
  renderResult(args) {
    const { defStore } = this.props;

    const { value: key } = defStore.getArgValue((args.length > 0) ? args[0] : null);
    const { value } = defStore.getArgValue((args.length > 1) ? args[1] : null);
    const presetValue = defStore.getPresetValue(key, value);
    return <span>{presetValue} </span>;
  }

  render() {
    const { defStore, logic } = this.props;
    const logicDef = defStore.getDefinition(logic);

    // GUARD
    if (!logicDef) {
      console.error(`[ViewableLogic] No definition exists for ${JSON.stringify(logic)}`);
      return null;
    }

    const { args } = logic;
    const { View: view } = logicDef;

    return (
      <span>
        {(view.includes('label')) && `${logicDef.Label} `}
        {(view.includes('inputs')) && args.map((arg, index) => {
          const argValue = defStore.getArgValue(arg);
          const { type, value } = argValue;

          if (type === 'operation') return <ViewableLogic key={index} defStore={defStore} logic={value} />;
          return <span key={index}>{argValue.value} </span>;
        })}
        {(args.length <= 0) && <span>...</span>}
        {(view.includes('result')) && this.renderResult(args)}
      </span>
    );
  }
}

ViewableLogic.propTypes = {
  defStore: PropTypes.object.isRequired,
  logic: PropTypes.object.isRequired,
};

export default inject('defStore')(ViewableLogic);
