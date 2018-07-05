import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { observer, inject } from 'mobx-react';
import { Select } from 'antd';

const { Option } = Select;

@observer
/* eslint-disable react/no-array-index-key */
class EditableLogic extends Component {
  static renderSelect(inputLabel, input, arg, options, index) {
    return (
      <Select
        key={index}
        mode="combobox"
        showSearch
        // onSearch={value => this.onSearch(condition, value)}
        // onChange={value => this.onChange(condition, value)}
        defaultValue={(arg) ? arg.functionName : null}
        filterOption={(inputData, option) => {
          const { key: optionKey, props: optionProps } = option;
          const { title: optionTitle } = optionProps;

          if (optionKey.toLowerCase().includes(inputData.toLowerCase()) ||
              optionTitle.toLowerCase().includes(inputData.toLowerCase())) {
            return true;
          }
          return false;
        }}
        style={{ width: 250 }}
      >
        {options.map(operation => (
          <Option
            key={operation.Key}
            title={operation.Label}
          >
            {operation.Key}
          </Option>
        ))}
      </Select>
    );
  }

  renderInputsAndArgs(logicDef, logic) {
    const { defStore } = this.props;
    const { operations } = defStore;
    const { args } = logic;
    const { Inputs: inputs } = logicDef;

    return inputs.map((input, index) => {
      const { Label: label, Types: types } = input;
      const arg = args[index];
      let content = null;

      if (label === 'Operation') {
        content = EditableLogic.renderSelect(logicDef.Label, input, arg, operations, index);
      }

      if (!content) content = <div key={index}>Input: {input.Label}</div>;

      return content;
    });
  }

  render() {
    const { defStore, logic } = this.props;
    const logicDef = defStore.getDefinition(logic);

    // GUARD
    if (!logicDef) {
      console.error(`[ViewableLogic] No definition exists for ${JSON.stringify(logic)}`);
      return null;
    }

    const content = this.renderInputsAndArgs(logicDef, logic);

    return (
      <div>
        {content}
      </div>
    );
  }
}

EditableLogic.propTypes = {
  defStore: PropTypes.object.isRequired,
  logic: PropTypes.object.isRequired,
};

export default inject('defStore')(EditableLogic);
