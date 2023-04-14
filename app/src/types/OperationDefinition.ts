/*
{
    "key": "Add BattleTech Float",
    "label": "Add a stat float",
    "view": ["inputs"],
    "scope": "action",
    "category": "primary",
    "tooltip": "WARNING: This vanilla method is bugged. It truncates it to an 'int' so floats DON'T WORK",
    "inputs": [
      {
        "label": "Type",
        "types": ["int"],
        "values": [
          { "viewlabel": "Add company stat", "text": "Company Stats", "value": 1 },
          { "viewlabel": "Add commander stat", "text": "Commander Stats", "value": 2 },
          { "viewlabel": "Add current system stat", "text": "Current System Stats", "value": 3 },
          { "viewlabel": "Add flashpoint stat", "text": "Flashpoint Stats", "value": 4 }
        ]
      },
      {
        "label": "Stat Key",
        "types": ["string"],
        "viewlabel": "'{value}'"
      },
      {
        "label": "Stat Value",
        "types": ["float"],
        "viewlabel": "with the value '{value}'"
      }
    ]
  }
  */
type ViewType = 'label' | 'inputs' | 'result';

type InputTypeType = 'string' | 'int' | 'operation' | 'float';

type InputValueType = {
  viewlabel?: string;
  text: string;
  value: number;
};

type InputType = {
  label: string;
  types: InputTypeType[];
  viewLabel?: string;
  values?: InputValueType[];
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
