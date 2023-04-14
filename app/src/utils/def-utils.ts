import { OperationArgType } from 'types/OperationArgType';

export function createArg(): OperationArgType {
  return {
    intValue: 0,
    boolValue: false,
    floatValue: 0.0,
    stringValue: '',
    callValue: null,
    variableRefValue: null,
    type: 'int',
  };
}
