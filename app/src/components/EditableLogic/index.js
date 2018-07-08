import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { observer, inject } from 'mobx-react';
import classnames from 'classnames';

import EditableSelect from '../EditableSelect';
import EditableInput from '../EditbleInput';

import './EditableLogic.css';

@observer
/* eslint-disable react/no-array-index-key, no-param-reassign */
class EditableLogic extends Component {
  static fixBadInputTypes(argValue, input) {
    const { Types: types } = input;
    const { type: argType } = argValue;

    if (!types.includes(argType)) {
      if (types.includes('int')) { // favour: int, float, string, operation
        return { ...argValue, type: 'int' };
      } else if (types.includes('float')) {
        return { ...argValue, type: 'float' };
      } else if (types.includes('string')) {
        return { ...argValue, type: 'string' };
      } else if (types.includes('operation')) {
        return { ...argValue, type: 'operation' }
      }
    }

    return argValue;
  }

  renderLogic(logicDef, logic) {
    const {
      defStore,
      category,
      parentLogic,
      parentInput,
      parentArg,
    } = this.props;
    const operations = defStore.getOperations(category);
    const { functionName } = logic;
    const parentArgValue = defStore.getArgValue(parentArg);

    const typeSelector = (parentInput && parentArg) ? (
      <EditableSelect
        value={parentArgValue.type}
        options={parentInput.Types}
        placeholder="Select a type"
        style={{ width: 120 }}
        onChange={(value) => { defStore.setArgType(parentLogic, parentArg, value); }}
      />
    ) : null;

    const content = (
      <EditableSelect
        value={functionName}
        options={operations}
        placeholder="Select an operation"
        onChange={(value) => { defStore.setOperation(logic, value); }}
      />
    );

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
      const arg = (args.length > index) ? args[index] : null;
      let argValue = defStore.getArgValue(arg);
      let content = null;

      argValue = EditableLogic.fixBadInputTypes(argValue, input);
      const { type: argType, value: argVal } = argValue;

      let argsContainerClasses = classnames('editable-logic__args-container');

      const typeSelector = (input) ? (
        <EditableSelect
          value={argValue.type}
          options={input.Types}
          placeholder="Select a type"
          style={{ width: 120 }}
          onChange={(value) => { defStore.setArgType(logic, arg, value); }}
        />
      ) : null;

      if (argType === 'operation' && types.includes('operation')) {
        argsContainerClasses = classnames(argsContainerClasses, {
          'first-operation': index === 0,
        });
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
          if ((argType === 'string') && types.includes('string')) {
            if (logicDefKey.includes('Preset')) {
              content = (
                <section>
                  {content}
                  <EditableInput
                    value={argVal}
                    options={defStore.getPresetKeys()}
                    onChange={(value) => { defStore.setArgValue(logic, arg, value); }}
                  />
                </section>
              );
            } else {
              content = (
                <section>
                  {content}
                  <EditableInput
                    value={argVal}
                    onChange={(value) => { defStore.setArgValue(logic, arg, value); }}
                  />
                </section>
              );
            }
          } else if ((argType === 'float' && types.includes('float')) ||
            (argType === 'int' && types.includes('int'))) {
            content = (
              <section>
                {content}
                <EditableInput
                  value={argVal}
                  onChange={(value) => { defStore.setArgValue(logic, arg, value); }}
                />
              </section>
            );
          } else {
            console.error(`[EditableLogic] Argument and input type mismatch for ${label}`);
          }
        } else {
          content = (
            <section>
              {content}
            </section>
          );
        }
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
  category: PropTypes.string.isRequired,
  isEven: PropTypes.bool,
};

export default inject('defStore')(EditableLogic);
