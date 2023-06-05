/* eslint-disable react/no-array-index-key */
/* eslint-disable react/jsx-one-expression-per-line */
/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable operator-linebreak */
import React from 'react';
import { observer } from 'mobx-react';
import classnames from 'classnames';
import { Icon, Tooltip } from 'antd';
import { SelectValue } from 'antd/lib/select';

import { useStore } from 'hooks/useStore';
import { DefStore } from 'stores/defStore/def-store';
import { OperationCallType, OperationArgType, InputType, InputTypeType, InputTypeTypes, InputValueType, OperationDefinitionType } from 'types';
import { tryParseInt } from 'utils/number-utils';

import { EditableSelect } from '../EditableSelect';
import { EditableInput } from '../EditbleInput';

import './EditableLogic.css';

type Props = {
  scope?: 'all' | 'action' | 'condition';
  category: 'primary' | 'secondary';
  logic: OperationCallType;
  isEven?: boolean;
  parentLogic?: OperationCallType | null;
  parentInput?: InputType | null;
  parentArg?: OperationArgType | null;
};

type ValueProps = {
  optionLabelProp: string | null;
  options: ({ text: string; value: string | number } | string)[] | null;
};

function getValueProps(values: InputValueType[] | undefined): ValueProps {
  const valueProps: ValueProps = {
    optionLabelProp: null,
    options: null,
  };

  if (values) {
    valueProps.optionLabelProp = 'value';
    valueProps.options = values.map((value) => ({ text: value.text, value: value.value })) || null;
  }

  return valueProps;
}

function EditableLogic({ scope = 'all', category, logic, isEven = false, parentLogic = null, parentInput = null, parentArg = null }: Props) {
  const defStore = useStore<DefStore>('def');

  const renderLogic = (logicDef: OperationDefinitionType) => {
    const operations = defStore.getOperations(category, scope);
    const { functionName } = logic;
    const { tooltip } = logicDef;

    const parentArgValue = defStore.getArgValue(parentArg);

    const tooltipContent = tooltip ? (
      <Tooltip title={tooltip}>
        <Icon type="exclamation-circle-o" />
      </Tooltip>
    ) : undefined;

    const typeSelector =
      parentInput && parentArg ? (
        <EditableSelect
          value={parentArgValue ? parentArgValue.type : parentArgValue}
          options={parentInput.types}
          placeholder="Select a type"
          style={{ width: 120 }}
          onChange={(value: SelectValue) => {
            if (typeof value === 'string' && InputTypeTypes.includes(value as InputTypeType)) {
              if (parentLogic) defStore.setArgType(parentLogic, parentArg, value as InputTypeType);
            }
          }}
        />
      ) : null;

    const content = (
      <EditableSelect
        value={functionName}
        options={operations}
        placeholder="Select an operation"
        onChange={(value: SelectValue) => {
          if (typeof value === 'string') defStore.setOperation(logic, value);
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
  };

  const renderInputsAndArgs = (logicDef: OperationDefinitionType) => {
    const { functionName, args } = logic;
    const { key: logicDefKey, inputs } = logicDef;

    return inputs.map((input, index) => {
      const { label, types, values, tooltip, defaultValue = null } = input;
      const arg = args.length > index ? args[index] : defStore.createNewArg(types[0], defaultValue);
      const argValue = defStore.getArgValue(arg);
      let content = null;

      if (argValue == null) throw Error('Arg value is null or undefined');

      const { type: argType, value: argVal } = argValue;

      if (argVal == null) throw Error("Arg value is null or undefined. This shouldn't be the case");

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
          options={input.types}
          placeholder="Select a type"
          style={{ width: 120 }}
          onChange={(value: SelectValue) => {
            if (typeof value === 'string' && InputTypeTypes.includes(value as InputTypeType)) {
              defStore.setArgType(logic, arg, value as InputTypeType);
            }
          }}
        />
      ) : null;

      if (argType === 'operation' && types.includes('operation')) {
        content = (
          <ObservingEditableLogic logic={argVal} category="secondary" isEven={!isEven} parentLogic={logic} parentInput={input} parentArg={arg} />
        );
      } else if (argType === 'operation' && !types.includes('operation')) {
        console.error(`[EditableLogic] Argument and input type mismatch for ${label}`);
      } else {
        if (typeSelector) content = <span className="editable-logic__logic-type">{typeSelector}</span>;

        if (argVal !== null) {
          if (argType === 'string' && types.includes('string')) {
            if (logicDefKey.includes('Preset')) {
              if (parentLogic == null) throw Error('parentLogic is null or undefined. This should not happen');

              const presetKey = `${parentLogic.functionName}-${functionName}`.replace(/\s/g, '');
              content = (
                <section className="editable-logic__arg">
                  {content}
                  <EditableInput
                    key={presetKey}
                    value={argVal}
                    options={defStore.getPresetKeys()}
                    onChange={(value) => {
                      defStore.setArgValue(logic, arg, value as string);
                    }}
                  />
                </section>
              );
            } else {
              const valueProps = getValueProps(values);

              content = (
                <section className="editable-logic__arg">
                  {content}
                  <EditableInput
                    value={argVal}
                    onChange={(value) => {
                      defStore.setArgValue(logic, arg, value as string);
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

              if (presetArgValue == null) throw Error('Present Arg Value is null or undefined');

              const { value: presetValue } = presetArgValue;

              content = (
                <section className="editable-logic__arg">
                  {content}
                  <EditableInput
                    value={typeof argVal === 'number' ? argVal.toString() : argVal}
                    options={defStore.getPresetValuesForOptions(presetValue as string)}
                    onChange={(value) => {
                      if (typeof value === 'string') {
                        const parsedValue = tryParseInt(value, 0);
                        defStore.setArgValue(logic, arg, parsedValue);
                      } else {
                        defStore.setArgValue(logic, arg, value as number);
                      }
                    }}
                    optionLabelProp="value"
                    valueLabel={defStore.getPresetValue(presetValue as string, argVal)}
                  />
                </section>
              );
            } else {
              const valueProps = getValueProps(values);

              content = (
                <section className="editable-logic__arg">
                  {content}
                  <EditableInput
                    value={typeof argVal === 'number' ? argVal.toString() : argVal}
                    onChange={(value) => {
                      if (typeof value === 'string') {
                        if (value === '' && valueProps.optionLabelProp != null && valueProps.options != null) {
                          defStore.setArgValue(logic, arg, value); // Let's autocomplete occur for ints/floats with text/value
                        } else {
                          const parsedValue = tryParseInt(value, 0);
                          defStore.setArgValue(logic, arg, parsedValue);
                        }
                      } else {
                        defStore.setArgValue(logic, arg, value as number);
                      }
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

      if (!content) content = <div>Unprocessed Input: {input.label}</div>;

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
  };

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

  const content = renderLogic(logicDef);
  const argContent = renderInputsAndArgs(logicDef);

  return (
    <div className="editable-logic">
      <div className={operationClasses}>{content}</div>
      <div className={argClasses}>{argContent}</div>
    </div>
  );
}

export const ObservingEditableLogic = observer(EditableLogic);
