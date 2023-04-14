import { OperationCallType } from './OperationCallType';

export type OperationArgType = {
  type?: 'int' | 'float' | 'bool' | 'string' | 'operation';
  intValue: number;
  boolValue: boolean;
  floatValue: number;
  stringValue: string;
  callValue: OperationCallType | null;
  variableRefValue: null;
};
