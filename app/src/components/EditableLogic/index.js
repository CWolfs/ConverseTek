import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { observer, inject } from 'mobx-react';
import { Select } from 'antd';

import './EditableLogic.css';

const { Option } = Select;

@observer
/* eslint-disable react/no-array-index-key */
class EditableLogic extends Component {
  static renderSelect(inputLabel, value, options) {
    return (
      <Select
        // mode="combobox"
        // showSearch
        // onSearch={value => this.onSearch(condition, value)}
        // onChange={value => this.onChange(condition, value)}
        defaultValue={(value) ? value.functionName : null}
        /*
        filterOption={(inputData, option) => {
          const { key: optionKey, props: optionProps } = option;
          const { title: optionTitle } = optionProps;

          if (optionKey.toLowerCase().includes(inputData.toLowerCase()) ||
              optionTitle.toLowerCase().includes(inputData.toLowerCase())) {
            return true;
          }
          return false;
        }}
        */
        style={{ width: 230 }}
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

  static renderInput(value, options) {
    const isAutocomplete = !!options;

    if (isAutocomplete) {

    } else {

    }
  }

  renderLogic(logicDef, logic) {
    const { defStore } = this.props;
    const operations = defStore.getOperations('primary');

    const content = EditableLogic.renderSelect(logicDef.Label, logic, operations);
    return <div><span className="editable-logic__operation-label"> Logic: </span>{content}</div>;
  }

  renderInputsAndArgs(logicDef, logic) {
    const { defStore } = this.props;
    const { args } = logic;
    const { Inputs: inputs } = logicDef;

    return inputs.map((input, index) => {
      const { Label: label, Types: types } = input;
      const arg = args[index];
      const argValue = defStore.getArgValue(arg);
      const { type: argType, value: argVal } = argValue;
      let content = null;

      if (argType === 'operation' && types.includes('operation')) {
        content = <EditableLogic defStore={defStore} logic={argVal} />;
      } else if (argType === 'operation' && !types.includes('operation')) {
        console.error(`[EditableLogic] Argument and input type mismatch for ${label}`);
      }

      if (!content) content = <div>Unprocessed Input: {input.Label}</div>;

      return <div className="editable-logic__args-container" key={index}><span className="editable-logic__args-label">Arg {index + 1}:</span> {content}</div>;
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

    const content = this.renderLogic(logicDef, logic);
    const argContent = this.renderInputsAndArgs(logicDef, logic);

    return (
      <div className="editable-logic">
        <div className="editable-logic__operation">
          {content}
        </div>
        <div className="editable-logic__args">
          {argContent}
        </div>
      </div>
    );
  }
}

EditableLogic.propTypes = {
  defStore: PropTypes.object.isRequired,
  logic: PropTypes.object.isRequired,
};

export default inject('defStore')(EditableLogic);
