import { observable, action } from 'mobx';

import { createArg } from '../../utils/def-utils';
import { tryParseInt, tryParseFloat } from '../../utils/number-utils';

/* eslint-disable class-methods-use-this, no-param-reassign */
class DefStore {
  @observable operations = [];
  @observable presets = [];
  @observable tags = [];

  constructor() {
    this.definitionCount = 0;
  }

  @action setLogicTypeByConversation(conversationAsset) {
    const { Conversation: conversation } = conversationAsset;
    const { roots, nodes } = conversation;

    roots.forEach((root) => {
      // Root Operations
      if (root.conditions && root.conditions.ops) {
        const operations = root.conditions.ops;
        operations.forEach((operation) => {
          this.setLogicTypeByOperation(operation);
        });
      }

      // Root Actions
      if (root.actions && root.actions.ops) {
        const operations = root.actions.ops;
        operations.forEach((operation) => {
          this.setLogicTypeByOperation(operation);
        });
      }
    });

    nodes.forEach((node) => {
      // Node Actions
      if (node.actions && node.actions.ops) {
        const operations = node.actions.ops;
        operations.forEach((operation) => {
          this.setLogicTypeByOperation(operation);
        });
      }

      if (node.branches) {
        const responses = node.branches;

        responses.forEach((response) => {
          // Branch Conditions
          if (response.conditions && response.conditions.ops) {
            const operations = response.conditions.ops;
            operations.forEach((operation) => {
              this.setLogicTypeByOperation(operation);
            });
          }

          // Branch Actions
          if (response.actions && response.actions.ops) {
            const operations = response.actions.ops;
            operations.forEach((operation) => {
              this.setLogicTypeByOperation(operation);
            });
          }
        });
      }
    });
  }

  @action setLogicTypeByOperation(operation) {
    const { args } = operation;
    const logicDef = this.getDefinition(operation);
    const { Inputs: inputs } = logicDef;

    args.forEach((arg, index) => {
      let rawType = this.getRawArgType(arg);
      const input = inputs[index];
      const { Types: types } = input;

      if (!types.includes(rawType)) {
        if (types.includes('int')) { // favour: int, float, string, operation
          rawType = 'int';
        } else if (types.includes('float')) {
          rawType = 'float';
        } else if (types.includes('string')) {
          rawType = 'string';
        } else if (types.includes('operation')) {
          rawType = 'operation';
        }
      }

      arg.type = rawType;

      if (rawType === 'operation') this.setLogicTypeByOperation(arg.call_value);
    });
  }

  @action setDefinitions(definitions) {
    const { operations, presets, tags } = definitions;

    this.reset();

    if (operations) this.operations = operations;
    if (presets) this.presets = presets;
    if (tags) this.tags = tags;

    this.definitionCount = this.operations.length + this.presets.length + this.tags.length;
  }

  @action getDefinition(condition) {
    const { functionName } = condition;
    return this.getDefinitionByName(functionName);
  }

  @action getDefinitionByName(functionName) {
    const definition = this.operations.find(operation => operation.Key === functionName);
    if (!definition) {
      console.error(`No operation definition found with functionName '${functionName}'`);
    }
    return definition;
  }

  @action getOperations(category, scope = 'all') {
    return this.operations.filter(operation =>
      (operation.Category === category) && ((operation.Scope === scope) || (scope === 'all')));
  }

  getRawArgType(arg) {
    const {
      int_value: intValue,
      // bool_value: boolValue,
      float_value: floatValue,
      string_value: stringValue,
      call_value: callValue,
      // variableref_value: variableRefValue,
    } = arg;

    // Use same logic BT uses
    if (callValue) return 'operation';
    if (stringValue !== '') return 'string';
    if (floatValue !== 0 && intValue !== 0) return 'float';
    return 'int';
  }

  getArgValue(arg) {
    if (arg === null || arg === undefined) return { type: null, value: null };

    const {
      int_value: intValue,
      // bool_value: boolValue,
      float_value: floatValue,
      string_value: stringValue,
      call_value: callValue,
      // variableref_value: variableRefValue,
      type,
    } = arg;

    if (type) {
      if (type === 'operation') return { type, value: callValue };
      if (type === 'string') return { type, value: stringValue };
      if (type === 'float') return { type, value: floatValue };
      if (type === 'int') return { type, value: intValue };
    }

    return null;
  }

  @action setArgType(logic, arg, type) {
    const { args } = logic;
    const argValue = this.getArgValue(arg);
    const { type: previousType, value: previousValue } = argValue;

    if (previousType !== type) {
      if (previousType === 'operation') arg.call_value = null;
      if (previousType === 'string') arg.string_value = '';
      if (previousType === 'float') arg.float_value = 0.0;
      if (previousType === 'int') arg.int_value = 0;

      if (type === 'operation') {
        arg.call_value = { functionName: 'Get Preset Value (int)', args: [] };
        this.setOperation(arg.call_value, arg.call_value.functionName);
      }

      if (type === 'string') arg.string_value = (previousValue && !previousValue.functionName) ? previousValue.toString() : '';

      if (previousType === 'float' || previousType === 'int' || previousType === 'string') {
        if (type === 'float') arg.float_value = tryParseFloat(previousValue);
        if (type === 'int') arg.int_value = tryParseInt(previousValue);
      }

      arg.type = type;

      logic.args.replace(args);
    }
  }

  @action setArgValue(logic, arg, value) {
    const { args } = logic;
    const argValue = this.getArgValue(arg);
    const { type } = argValue;

    if (type === 'operation') arg.call_value = value;
    if (type === 'string') arg.string_value = value;
    if (type === 'float') arg.float_value = value;
    if (type === 'int') arg.int_value = value;

    arg.type = type;

    logic.args.replace(args);
  }

  @action setOperation(logic, value) {
    const { args } = logic;
    const logicDef = this.getDefinitionByName(value);
    const { Inputs: inputs } = logicDef;

    logic.functionName = value;

    if (args.length > inputs.length) {
      logic.args = args.splice(0, inputs.length);
    } else if (args.length < inputs.length) {
      inputs.forEach((input, index) => {
        if (args.length <= index) {
          const newArg = createArg();

          const { Types: types } = input;
          const { type: argType } = newArg;

          if (!types.includes(argType)) {
            if (types.includes('int')) { // favour: int, float, string, operation
              newArg.type = 'int';
            } else if (types.includes('float')) {
              newArg.type = 'float';
            } else if (types.includes('string')) {
              newArg.type = 'string';
            } else if (types.includes('operation')) {
              newArg.type = 'operation';
            }
          }

          logic.args.push(newArg);
        }
      });
    }
  }

  @action getPresetValue(key, value) {
    const preset = this.presets.find(p => p.Key === key);
    if (preset === undefined) return '[BAD PRESET VALUE]';
    return preset.Values[value.toString()];
  }

  @action getPresetKeys() {
    return this.presets.map(p => p.Key);
  }

  @action reset = () => {
    this.operations.clear();
    this.presets.clear();
    this.tags.clear();
    this.definitionCount = 0;
  }
}

const defStore = new DefStore();

export default defStore;
export { DefStore };
