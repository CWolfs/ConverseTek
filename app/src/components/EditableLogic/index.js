import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { observer, inject } from 'mobx-react';
import { Select, Input, AutoComplete } from 'antd';
import classnames from 'classnames';

import './EditableLogic.css';

const { Option } = Select;

@observer
/* eslint-disable react/no-array-index-key */
class EditableLogic extends Component {
  static renderSelect(value, options, placeholder, style) {
    return (
      <Select
        defaultValue={value}
        style={style || { width: 230 }}
        placeholder={placeholder}
      >
        {options.map(option => (
          <Option
            key={option.Key || option}
          >
            {option.Key || option}
          </Option>
        ))}
      </Select>
    );
  }

  static renderInput(argValue, options) {
    const { value } = argValue;
    const isAutocomplete = !!options;

    const style = {
      width: '300px',
    };

    if (isAutocomplete) {
      return (
        <AutoComplete
          style={style}
          defaultValue={value}
          dataSource={options}
          filterOption={(inputValue, option) =>
            option.props.children.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1}
        />
      );
    }
    return (
      <Input
        style={style}
        placeholder="Basic usage"
        value={value}
      />
    );
  }

  renderLogic(logicDef, logic) {
    const {
      defStore,
      category,
      parentInput,
      parentArg,
    } = this.props;
    const operations = defStore.getOperations(category);
    const { functionName } = logic;

    const typeSelector = (parentInput && parentArg) ?
      EditableLogic.renderSelect(parentArg.type, parentInput.Types, 'Select a type', { width: 120 }) : null;
    const content = EditableLogic.renderSelect(functionName, operations, 'Select an operation');
    return (
      <div>
        {typeSelector && <span className="editable-logic__logic-type">{typeSelector}</span>}
        {content}
      </div>
    );
  }

  renderInputsAndArgs(logicDef, logic) {
    const {
      defStore,
      isEven,
    } = this.props;
    const { args } = logic;
    const { Key: logicDefKey, Inputs: inputs } = logicDef;

    return inputs.map((input, index) => {
      const { Label: label, Types: types } = input;
      const arg = args[index];
      const argValue = defStore.getArgValue(arg);
      const { type: argType, value: argVal } = argValue;
      let content = null;

      let argsContainerClasses = classnames('editable-logic__args-container');

      const typeSelector = (input && argValue) ?
        EditableLogic.renderSelect(argValue.type, input.Types, 'Select a type', { width: 120 }) : null;

      if (argType === 'operation' && types.includes('operation')) {
        argsContainerClasses = classnames(argsContainerClasses, {
          'first-operation': index === 0,
        });
        content = <EditableLogic defStore={defStore} logic={argVal} category="secondary" isEven={!isEven} parentInput={input} parentArg={argValue} />;
      } else if (argType === 'operation' && !types.includes('operation')) {
        console.error(`[EditableLogic] Argument and input type mismatch for ${label}`);
      } else if ((argType === 'string') && types.includes('string')) {
        if (logicDefKey.includes('Preset')) {
          content = (
            <div>
              {typeSelector && <span className="editable-logic__arg-type">{typeSelector}</span>}
              {EditableLogic.renderInput(argValue, defStore.getPresetKeys())}
            </div>
          );
        } else {
          content = EditableLogic.renderInput(argValue);
        }
      } else if ((argType === 'float' && types.includes('float')) ||
        (argType === 'int' && types.includes('int'))) {
        content = (
          <div>
            {typeSelector && <span className="editable-logic__arg-type">{typeSelector}</span>}
            {EditableLogic.renderInput(argValue)}
          </div>
        );
      } else {
        console.error(`[EditableLogic] Argument and input type mismatch for ${label}`);
      }

      if (!content) content = <div>Unprocessed Input: {input.Label}</div>;

      return <div className={argsContainerClasses} key={index}><span className="editable-logic__args-label">Argument {index + 1}</span> {content}</div>;
    });
  }

  render() {
    const { defStore, logic, isEven } = this.props;
    const logicDef = defStore.getDefinition(logic);
    const operationClasses = classnames('editable-logic__operation', {
      'editable-logic__operation--even': isEven,
    });
    const argClasses = classnames('editable-logic__args', {
      'editable-logic__args--even': isEven,
    });

    // GUARD
    if (!logicDef) {
      console.error(`[ViewableLogic] No definition exists for ${JSON.stringify(logic)}`);
      return null;
    }

    const content = this.renderLogic(logicDef, logic);
    const argContent = this.renderInputsAndArgs(logicDef, logic);

    return (
      <div className="editable-logic">
        <div className={operationClasses}>
          {content}
        </div>
        <div className={argClasses}>
          {argContent}
        </div>
      </div>
    );
  }
}

EditableLogic.defaultProps = {
  isEven: false,
  parentInput: null,
  parentArg: null,
};

EditableLogic.propTypes = {
  defStore: PropTypes.object.isRequired,
  parentInput: PropTypes.object,
  parentArg: PropTypes.object,
  logic: PropTypes.object.isRequired,
  category: PropTypes.string.isRequired,
  isEven: PropTypes.bool,
};

export default inject('defStore')(EditableLogic);
