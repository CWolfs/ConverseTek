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
    const { View: view, Inputs: inputs } = logicDef;

    return (
      <span>
        {(view.includes('label')) && `${logicDef.Label} `}
        {(view.includes('inputs')) && args.map((arg, index) => {
          const argValue = defStore.getArgValue(arg);
          const { type, value } = argValue;
          const input = inputs[index];
          const { Viewlabel: viewLabel, Values: inputValues } = input;

          if (type === 'operation') return <ViewableLogic key={index} defStore={defStore} logic={value} />;

          const { value: valueFromArg } = argValue;
          let displayValue = valueFromArg;
          if (viewLabel) {
            if (viewLabel.includes('{value}')) {
              displayValue = viewLabel.replace('{value}', displayValue);
            } else {
              displayValue = viewLabel;
            }
          }

          if (inputValues) {
            const inputVal = inputValues.find((inputValue) => {
              if (inputValue.Value === valueFromArg) return true;
              if (Number(inputValue.Value) === valueFromArg) return true;
              return false;
            });
            if (inputVal) {
              displayValue = inputVal.Text;
              if (inputVal.Viewlabel) {
                const inputValueViewLabel = inputVal.Viewlabel;
                if (inputValueViewLabel.includes('{value}')) {
                  displayValue = inputValueViewLabel.replace('{value}', displayValue);
                } else {
                  displayValue = inputVal.Viewlabel;
                }
              }
            }
          }

          return <span key={index}>{displayValue} </span>;
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
