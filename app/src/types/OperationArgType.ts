import { OperationCallType } from './OperationCallType';
import { InputTypeType } from './OperationDefinitionType';

export type OperationArgType = {
  type?: InputTypeType | null;
  intValue: number;
  boolValue: boolean;
  floatValue: number;
  stringValue: string;
  callValue: OperationCallType | null;
  variableRefValue: null;
};
