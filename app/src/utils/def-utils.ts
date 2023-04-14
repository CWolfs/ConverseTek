import { OperationType } from 'types/OperationType';

export function createArg(): OperationType {
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
