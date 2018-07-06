import { observable, action } from 'mobx';

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
    return this.operations.find(operation => operation.Key === functionName);
  }

  @action getOperations(category) {
    return this.operations.filter(operation => operation.Category === category);
  }

  @action getArgValue(arg) {
    if (arg === null) return { type: null, value: null };

    const {
      int_value: intValue,
      // bool_value: boolValue,
      float_value: floatValue,
      string_value: stringValue,
      call_value: callValue,
      // variableref_value: variableRefValue,
    } = arg;

    // Use same logic BT uses
    if (callValue) return { type: 'operation', value: callValue };
    if (stringValue !== '') return { type: 'string', value: stringValue };
    if (floatValue !== 0 && intValue !== 0) return { type: 'float', value: floatValue };
    return { type: 'int', value: intValue };
  }

  @action setArgValue(arg, value) {
    const argValue = this.getArgValue(arg);
    const { type } = argValue;

    if (type === 'operation') arg.call_value = value;
    if (type === 'string') arg.string_value = value;
    if (type === 'float') arg.float_value = value;
    if (type === 'int') arg.int_value = value;
  }

  @action getPresetValue(key, value) {
    const preset = this.presets.find(p => p.Key === key);
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
