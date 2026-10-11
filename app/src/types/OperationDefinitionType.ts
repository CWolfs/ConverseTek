type ViewType = 'label' | 'inputs' | 'result';

export type InputTypeType = 'string' | 'int' | 'operation' | 'float' | 'bool';
export const InputTypeTypes = ['string', 'int', 'operation', 'float', 'bool'];

export type DefaultInputValueType = string | number | null;

export type InputValueType = {
  viewLabel?: string;
  text: string;
  value: string | number;
};

export type AiOperationExampleType = {
  description?: string;
  call?: unknown;
};

export type InputType = {
  label: string;
  types: InputTypeType[];
  tooltip?: string;
  viewLabel?: string;
  values?: InputValueType[];
  defaultValue?: DefaultInputValueType; // Maybe lock this down to string and parse int / float when required
  preferredType?: InputTypeType;
  aiHint?: string;
  aiExamples?: AiOperationExampleType[];
};

export type OperationDefinitionType = {
  key: string;
  label: string;
  view: ViewType[];
  scope: 'action' | 'condition';
  category: 'primary' | 'secondary';
  tooltip: string;
  inputs: InputType[];
  aiHint?: string;
  aiExamples?: AiOperationExampleType[];
};
