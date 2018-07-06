import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { observer, inject } from 'mobx-react';
import { Select, Input } from 'antd';
import classnames from 'classnames';

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

  static renderInput(argValue, options) {
    const { key, value } = argValue;
    const isAutocomplete = !!options;

    const style = {
      width: '300px',
    };

    if (isAutocomplete) {

    } else {
      return (
        <Input
          style={style}
          placeholder="Basic usage"
          value={value}
        />
      );
    }
  }

  renderLogic(logicDef, logic) {
    const { defStore, category } = this.props;
    const operations = defStore.getOperations(category);

    const content = EditableLogic.renderSelect(logicDef.Label, logic, operations);
    return <div>{/* <span className="editable-logic__operation-label"> Logic: </span> */}{content}</div>;
  }

  renderInputsAndArgs(logicDef, logic) {
    const { defStore, isEven } = this.props;
    const { args } = logic;
    const { Inputs: inputs } = logicDef;

    return inputs.map((input, index) => {
      const { Label: label, Types: types } = input;
      const arg = args[index];
      const argValue = defStore.getArgValue(arg);
      const { type: argType, value: argVal } = argValue;
      let content = null;

      let argsContainerClasses = classnames('editable-logic__args-container');

      if (argType === 'operation' && types.includes('operation')) {
        argsContainerClasses = classnames(argsContainerClasses, {
          'first-operation': index === 0,
        });
        content = <EditableLogic defStore={defStore} logic={argVal} category="secondary" isEven={!isEven} />;
      } else if (argType === 'operation' && !types.includes('operation')) {
        console.error(`[EditableLogic] Argument and input type mismatch for ${label}`);
      } else if ((argType === 'string' && types.includes('string')) ||
        (argType === 'float' && types.includes('float')) ||
        (argType === 'int' && types.includes('int'))) {
        content = EditableLogic.renderInput(argValue);
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
};

EditableLogic.propTypes = {
  defStore: PropTypes.object.isRequired,
  logic: PropTypes.object.isRequired,
  category: PropTypes.string.isRequired,
  isEven: PropTypes.bool,
};

export default inject('defStore')(EditableLogic);
