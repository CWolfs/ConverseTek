type ViewType = 'label' | 'inputs' | 'result';

export type InputTypeType = 'string' | 'int' | 'operation' | 'float' | 'bool';
export const InputTypeTypes = ['string', 'int', 'operation', 'float', 'bool'];

export type DefaultInputValueType = 'string' | 'number' | null;

export type InputValueType = {
  viewlabel?: string;
  text: string;
  value: string | number;
};

export type InputType = {
  label: string;
  types: InputTypeType[];
  tooltip?: string;
  viewLabel?: string;
  values?: InputValueType[];
  defaultValue?: DefaultInputValueType; // Maybe lock this down to string and parse int / float when required
};

export type OperationDefinitionType = {
  key: string;
  label: string;
  view: ViewType[];
  scope: 'action' | 'condition';
  category: 'primary' | 'secondary';
  tooltip: string;
  inputs: InputType[];
};
