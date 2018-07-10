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
    return this.operations.find(operation => operation.Key === functionName);
  }

  @action getOperations(category) {
    return this.operations.filter(operation => operation.Category === category);
  }

  @action getArgValue(arg) {
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
    } else {
      let calculatedType = 'int';
      if (callValue) calculatedType = 'operation';
      if (stringValue !== '') calculatedType = 'string';
      if (floatValue !== 0 && intValue !== 0) calculatedType = 'float';
    }

    // Use same logic BT uses
    /*
    if (callValue) return { type: 'operation', value: callValue };
    if (stringValue !== '') return { type: 'string', value: stringValue };
    if (floatValue !== 0 && intValue !== 0) return { type: 'float', value: floatValue };
    return { type: 'int', value: intValue };
    */
  }

  @action setArgType(logic, arg, input, type) {
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
