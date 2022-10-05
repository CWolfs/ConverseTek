import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { observer, inject } from 'mobx-react';
import classnames from 'classnames';
import { Icon, Tooltip } from 'antd';

import EditableSelect from '../EditableSelect';
import EditableInput from '../EditbleInput';

import './EditableLogic.css';

@observer
/* eslint-disable react/no-array-index-key, no-param-reassign */
class EditableLogic extends Component {
  renderLogic(logicDef, logic) {
    const { defStore, scope, category, parentLogic, parentInput, parentArg } = this.props;
    const operations = defStore.getOperations(category, scope);
    const { functionName } = logic;
    const parentArgValue = defStore.getArgValue(parentArg);
    const { Tooltip: tooltip } = logicDef;

    const tooltipContent = tooltip ? (
      <Tooltip title={tooltip}>
        <Icon type="exclamation-circle-o" />
      </Tooltip>
    ) : undefined;

    const typeSelector =
      parentInput && parentArg ? (
        <EditableSelect
          value={parentArgValue.type}
          options={parentInput.Types}
          placeholder="Select a type"
          style={{ width: 120 }}
          onChange={(value) => {
            defStore.setArgType(parentLogic, parentArg, value);
          }}
        />
      ) : null;

    const content = (
      <EditableSelect
        value={functionName}
        options={operations}
        placeholder="Select an operation"
        onChange={(value) => {
          defStore.setOperation(logic, value);
        }}
      />
    );

    return (
      <div>
        {typeSelector && <span className="editable-logic__logic-type">{typeSelector}</span>}
        {content}
        {tooltipContent}
      </div>
    );
  }

  renderInputsAndArgs(logicDef, logic) {
    const { defStore, isEven, parentLogic } = this.props;
    const { functionName, args } = logic;
    const { Key: logicDefKey, Inputs: inputs } = logicDef;

    return inputs.map((input, index) => {
      const { Label: label, Types: types, Values: values, Tooltip: tooltip } = input;
      const arg = args.length > index ? args[index] : null;
      const argValue = defStore.getArgValue(arg);
      let content = null;

      const { type: argType, value: argVal } = argValue;

      let argsContainerClasses = classnames('editable-logic__args-container');
      argsContainerClasses = classnames(argsContainerClasses, {
        'first-arg': index === 0,
      });

      const tooltipContent = tooltip ? (
        <Tooltip title={tooltip}>
          <Icon type="exclamation-circle-o" />
        </Tooltip>
      ) : undefined;

      const key = `${functionName}-${index}-type`.replace(/\s/g, '');

      const typeSelector = input ? (
        <EditableSelect
          key={key}
          value={argValue.type}
          options={input.Types}
          placeholder="Select a type"
          style={{ width: 120 }}
          onChange={(value) => {
            defStore.setArgType(logic, arg, value);
          }}
        />
      ) : null;

      if (argType === 'operation' && types.includes('operation')) {
        content = (
          <EditableLogic
            defStore={defStore}
            logic={argVal}
            category="secondary"
            isEven={!isEven}
            parentLogic={logic}
            parentInput={input}
            parentArg={arg}
          />
        );
      } else if (argType === 'operation' && !types.includes('operation')) {
        console.error(`[EditableLogic] Argument and input type mismatch for ${label}`);
      } else {
        if (typeSelector) content = <span className="editable-logic__logic-type">{typeSelector}</span>;

        if (argVal !== null) {
          if (argType === 'string' && types.includes('string')) {
            if (logicDefKey.includes('Preset')) {
              const presetKey = `${parentLogic.functionName}-${functionName}`.replace(/\s/g, '');
              content = (
                <section className="editable-logic__arg">
                  {content}
                  <EditableInput
                    key={presetKey}
                    value={argVal}
                    options={defStore.getPresetKeys()}
                    onChange={(value) => {
                      defStore.setArgValue(logic, arg, value);
                    }}
                  />
                </section>
              );
            } else {
              const valueProps = {};

              if (values) {
                valueProps.optionLabelProp = 'value';
                valueProps.options = values.map((value) => ({ text: value.Text, value: value.Value }));
              }

              content = (
                <section className="editable-logic__arg">
                  {content}
                  <EditableInput
                    value={argVal}
                    onChange={(value) => {
                      defStore.setArgValue(logic, arg, value);
                    }}
                    {...valueProps}
                  />
                </section>
              );
            }
          } else if ((argType === 'float' && types.includes('float')) || (argType === 'int' && types.includes('int'))) {
            if (logicDefKey.includes('Preset')) {
              const presetArg = args[0];
              const presetArgValue = defStore.getArgValue(presetArg);
              const { value: presetValue } = presetArgValue;

              content = (
                <section className="editable-logic__arg">
                  {content}
                  <EditableInput
                    value={typeof argVal === 'number' ? argVal.toString() : argVal}
                    options={defStore.getPresetValuesForOptions(presetValue)}
                    onChange={(value) => {
                      defStore.setArgValue(logic, arg, value);
                    }}
                    optionLabelProp="value"
                    valueLabel={defStore.getPresetValue(presetValue, argVal)}
                  />
                </section>
              );
            } else {
              const valueProps = {};

              if (values) {
                valueProps.optionLabelProp = 'value';
                valueProps.options = values.map((value) => ({ text: value.Text, value: value.Value }));
              }

              content = (
                <section className="editable-logic__arg">
                  {content}
                  <EditableInput
                    value={typeof argVal === 'number' ? argVal.toString() : argVal}
                    onChange={(value) => {
                      defStore.setArgValue(logic, arg, value);
                    }}
                    {...valueProps}
                  />
                </section>
              );
            }
          } else {
            console.error(`[EditableLogic] Argument and input type mismatch for ${label}`);
          }
        } else {
          content = <section className="editable-logic__arg">{content}</section>;
        }
      }

      if (!content) content = <div>Unprocessed Input: {input.Label}</div>;

      return (
        <div className={argsContainerClasses} key={index}>
          <span className="editable-logic__args-label">
            {label}
            {tooltipContent}
          </span>{' '}
          {content}
        </div>
      );
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
        <div className={operationClasses}>{content}</div>
        <div className={argClasses}>{argContent}</div>
      </div>
    );
  }
}

EditableLogic.defaultProps = {
  scope: 'all',
  isEven: false,
  parentLogic: null,
  parentInput: null,
  parentArg: null,
};

EditableLogic.propTypes = {
  defStore: PropTypes.object.isRequired,
  parentLogic: PropTypes.object,
  parentInput: PropTypes.object,
  parentArg: PropTypes.object,
  logic: PropTypes.object.isRequired,
  scope: PropTypes.string,
  category: PropTypes.string.isRequired,
  isEven: PropTypes.bool,
};

export default inject('defStore')(EditableLogic);
