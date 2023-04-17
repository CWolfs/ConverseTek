import React from 'react';
import { observer } from 'mobx-react';

import { useStore } from 'hooks/useStore';
import { DefStore } from 'stores/defStore/def-store';
import { OperationCallType } from 'types/OperationCallType';
import { OperationArgType } from 'types/OperationArgType';

type Props = {
  logic: OperationCallType;
};

function ViewableLogic({ logic }: Props) {
  const defStore = useStore<DefStore>('def');

  const logicDef = defStore.getDefinition(logic);

  // GUARD
  if (logicDef == null) {
    console.error(`[ViewableLogic] No definition exists for ${JSON.stringify(logic)}`);
    return null;
  }

  const renderResult = (args: OperationArgType[]) => {
    const { value: key } = defStore.getArgValue(args.length > 0 ? args[0] : null);
    const { value } = defStore.getArgValue(args.length > 1 ? args[1] : null);

    if (key == null || value == null) throw Error('renderResult key and/or value are null or undefined');

    if (typeof key !== 'string') throw Error('Investigate: key should be a string');
    if (typeof value !== 'string') throw Error('Investigate: value should be a string');

    const presetValue = defStore.getPresetValue(key, value);
    return <span>{presetValue} </span>;
  };

  const { args } = logic;
  const { view, inputs } = logicDef;

  return (
    <span>
      {view.includes('label') && `${logicDef.label} `}
      {view.includes('inputs') &&
        args.map((arg, index) => {
          const argValue = defStore.getArgValue(arg);

          if (argValue == null) throw Error('argValue is null or undefined');

          const { type, value } = argValue;
          const input = inputs[index];
          const { viewLabel, values: inputValues } = input;

          if (type === 'operation' && value !== null) return <ObservingViewableLogic key={index} logic={value} />;

          const { value: valueFromArg } = argValue;
          let displayValue = valueFromArg;
          if (viewLabel) {
            if (viewLabel.includes('{value}')) {
              if (!displayValue) {
                return displayValue;
              }
              displayValue = viewLabel.replace('{value}', displayValue.toString());
            } else {
              displayValue = viewLabel;
            }
          }

          if (inputValues) {
            const inputVal = inputValues.find((inputValue) => {
              if (inputValue.value === valueFromArg) return true;
              if (Number(inputValue.value) === valueFromArg) return true;
              return false;
            });

            if (inputVal) {
              displayValue = inputVal.text;
              if (inputVal.viewlabel) {
                const inputValueViewLabel = inputVal.viewlabel;
                if (inputValueViewLabel.includes('{value}')) {
                  displayValue = inputValueViewLabel.replace('{value}', displayValue);
                } else {
                  displayValue = inputVal.viewlabel;
                }
              }
            }
          }

          return <span key={index}>{displayValue} </span>;
        })}
      {args.length <= 0 && <span>...</span>}
      {view.includes('result') && renderResult(args)}
    </span>
  );
}

export const ObservingViewableLogic = observer(ViewableLogic);
