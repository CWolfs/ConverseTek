import { observable, action, makeObservable } from 'mobx';
import keys from 'lodash.keys';
import values from 'lodash.values';

import { createArg } from 'utils/def-utils';
import { tryParseInt, tryParseFloat } from 'utils/number-utils';
import { ConversationAssetType } from 'types/ConversationAssetType';
import { OperationCallType } from 'types/OperationCallType';
import { OperationArgType } from 'types/OperationArgType';
import { DefinitionsType } from 'types/DefinitionsType';
import { OperationDefinitionType } from 'types/OperationDefinition';
import { PresetDefinitionType } from 'types/PresetDefinition';
import { TagDefinitionType } from 'types/TagDefinition';

/* eslint-disable class-methods-use-this, no-param-reassign */
class DefStore {
  public operations: OperationDefinitionType[] = [];
  public presets: PresetDefinitionType[] = [];
  public tags: TagDefinitionType[] = [];
  public definitionCount = 0;

  constructor() {
    makeObservable(this, {
      operations: observable,
      presets: observable,
      tags: observable,
      setLogicTypeByConversation: action,
      setLogicTypeByOperation: action,
      setDefinitions: action,
      getDefinition: action,
      getDefinitionByName: action,
      getOperations: action,
      setArgType: action,
      setArgValue: action,
      setOperation: action,
      getPresetValue: action,
      getPresetKeys: action,
      reset: action,
    });
  }

  setLogicTypeByConversation(conversationAsset: ConversationAssetType) {
    const { conversation } = conversationAsset;
    const { roots, nodes } = conversation;

    roots.forEach((root) => {
      // Root Operations
      if (root.conditions && root.conditions.ops) {
        const operations = root.conditions.ops;
        operations.forEach((operation): void => {
          this.setLogicTypeByOperation(operation);
        });
      }

      // Root Actions
      if (root.actions && root.actions.ops) {
        const operations = root.actions.ops;
        operations.forEach((operation): void => {
          this.setLogicTypeByOperation(operation);
        });
      }
    });

    nodes.forEach((node) => {
      // Node Actions
      if (node.actions && node.actions.ops) {
        const operations = node.actions.ops;
        operations.forEach((operation): void => {
          this.setLogicTypeByOperation(operation);
        });
      }

      if (node.branches) {
        const responses = node.branches;

        responses.forEach((response) => {
          // Branch Conditions
          if (response.conditions && response.conditions.ops) {
            const operations = response.conditions.ops;
            operations.forEach((operation): void => {
              this.setLogicTypeByOperation(operation);
            });
          }

          // Branch Actions
          if (response.actions && response.actions.ops) {
            const operations = response.actions.ops;
            operations.forEach((operation): void => {
              this.setLogicTypeByOperation(operation);
            });
          }
        });
      }
    });
  }

  setLogicTypeByOperation(operation: OperationCallType) {
    const { args } = operation;
    const logicDef = this.getDefinition(operation);
    const { Inputs: inputs } = logicDef;

    args.forEach((arg, index) => {
      let rawType = this.getRawArgType(arg);
      const input = inputs[index];
      const { Types: types } = input;

      types.some((type) => {
        if (type === 'operation') {
          // favour: operation, string, float, int
          rawType = 'operation';
          if (arg.callValue === null && types.length > 1) {
            return false; // favour another field if no operation is set but is a valid input type
          } else if (arg.callValue === null) {
            arg.callValue = {
              functionName: 'Get Preset Value (int)',
              args: [
                {
                  intValue: 0,
                  boolValue: false,
                  floatValue: 0.0,
                  stringValue: 'HasOrHasNot',
                  callValue: null,
                  variableRefValue: null,
                },
                {
                  intValue: 1,
                  boolValue: false,
                  floatValue: 0.0,
                  stringValue: '',
                  callValue: null,
                  variableRefValue: null,
                },
              ],
            }; // if not other valid input type - populate
          }
          return true;
        } else if (type === 'string') {
          rawType = 'string';
          return true;
        } else if (type === 'float') {
          rawType = 'float';
          return true;
        } else if (type === 'int') {
          rawType = 'int';
          return true;
        }
        return false;
      });

      /*
      if (!types.includes(rawType)) {
        if (types.includes('operation')) { // favour: operation, string, float, int
          rawType = 'operation';
          arg.callValue = { functionName: 'Get Preset Value (int)', args: [] };
          // this.setOperation(arg.callValue, arg.callValue.functionName);
        } else if (types.includes('string')) {
          rawType = 'string';
        } else if (types.includes('float')) {
          rawType = 'float';
        } else if (types.includes('int')) {
          rawType = 'int';
        }
      }
      */

      arg.type = rawType;

      if (rawType === 'operation' && arg.callValue !== null) {
        this.setLogicTypeByOperation(arg.callValue);
      }
    });
  }

  setDefinitions(definitions: DefinitionsType) {
    const { operations, presets, tags } = definitions;

    this.reset();

    if (operations) this.operations = operations;
    if (presets) this.presets = presets;
    if (tags) this.tags = tags;

    this.definitionCount = this.operations.length + this.presets.length + this.tags.length;
  }

  getDefinition(condition: OperationCallType) {
    const { functionName } = condition;
    return this.getDefinitionByName(functionName);
  }

  getDefinitionByName(functionName: string) {
    const definition = this.operations.find((operation) => operation.Key === functionName);
    if (!definition) {
      console.error(`No operation definition found with functionName '${functionName}'`);
    }
    return definition;
  }

  getOperations(category, scope = 'all') {
    return this.operations.filter((operation) => operation.Category === category && (operation.Scope === scope || scope === 'all'));
  }

  getRawArgType(arg: OperationArgType) {
    const { intValue, boolValue, floatValue, stringValue, callValue, variableRefValue } = arg;

    // Use same logic BT uses
    if (callValue) return 'operation';
    if (stringValue !== '') return 'string';
    if (floatValue !== 0 && intValue !== 0) return 'float';
    return 'int';
  }

  getArgValue(arg: OperationArgType) {
    if (arg === null || arg === undefined) return { type: null, value: null };

    const { intValue, boolValue, floatValue, stringValue, callValue, variableRefValue, type } = arg;

    if (type) {
      if (type === 'operation') return { type, value: callValue };
      if (type === 'string') return { type, value: stringValue };
      if (type === 'float') return { type, value: floatValue };
      if (type === 'int') return { type, value: intValue };
    }

    return null;
  }

  createNewArg(type, defaultValue = null) {
    return {
      boolValue: false,
      callValue: null,
      floatValue: type === 'float' && defaultValue != null ? defaultValue : 0,
      intValue: type === 'int' && defaultValue != null ? defaultValue : 0,
      stringValue: type === 'string' && defaultValue != null ? defaultValue : '',
      type,
      variableRefValue: null,
    };
  }

  setArgType(logic, arg: OperationArgType, type) {
    const { args } = logic;
    const argValue = this.getArgValue(arg);
    const { type: previousType, value: previousValue } = argValue;

    if (previousType !== type) {
      if (previousType === 'operation') arg.callValue = null;
      if (previousType === 'string') arg.stringValue = '';
      if (previousType === 'float') arg.floatValue = 0.0;
      if (previousType === 'int') arg.intValue = 0;

      if (type === 'operation') {
        arg.callValue = { functionName: 'Get Preset Value (int)', args: [] };
        this.setOperation(arg.callValue, arg.callValue.functionName);
      }

      if (type === 'string') arg.stringValue = previousValue && !previousValue.functionName ? previousValue.toString() : '';

      if (previousType === 'float' || previousType === 'int' || previousType === 'string') {
        if (type === 'float') arg.floatValue = tryParseFloat(previousValue, 0.0);
        if (type === 'int') arg.intValue = tryParseInt(previousValue, 0);
      }

      arg.type = type;

      logic.args.replace(args);
    }
  }

  setArgValue(logic, arg: OperationArgType, value) {
    const { args } = logic;
    const argValue = this.getArgValue(arg);
    const { type } = argValue;

    if (type === 'operation') arg.callValue = value;
    if (type === 'string') arg.stringValue = value;
    if (type === 'float') arg.floatValue = value;
    if (type === 'int') arg.intValue = value;

    arg.type = type;

    // Workaround for bad code design in CT. Lack of immutability causes problems for newly introduced args
    if (!logic.args.find((storedArg) => storedArg === arg)) {
      args.push(arg);
    }

    logic.args.replace(args);
  }

  setOperation(logic, value) {
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

          if (types.includes('operation')) {
            // favour: operation, string, float, int
            newArg.type = 'operation';
            const opLogic = { functionName: 'Get Preset Value (int)', args: [] };
            newArg.callValue = this.setOperation(opLogic, opLogic.functionName);
          } else if (types.includes('string')) {
            newArg.type = 'string';
          } else if (types.includes('float')) {
            newArg.type = 'float';
          } else if (types.includes('int')) {
            newArg.type = 'int';
          }

          logic.args.push(newArg);
        }
      });
    }

    // Reset all args
    logic.args.forEach((arg, index) => {
      this.resetArg(inputs[index], arg);
    });

    return logic;
  }

  resetArg(input, arg: OperationArgType) {
    const { Types: types } = input;

    arg.callValue = null;
    arg.stringValue = '';
    arg.floatValue = 0.0;
    arg.intValue = 0;

    if (types.includes('operation')) {
      arg.type = 'operation';
      const opLogic = { functionName: 'Get Preset Value (int)', args: [] };
      arg.callValue = this.setOperation(opLogic, opLogic.functionName);
    } else if (types.includes('string')) {
      arg.type = 'string';
    } else if (types.includes('float')) {
      arg.type = 'float';
    } else if (types.includes('int')) {
      arg.type = 'int';
    }
  }

  getPresetValue(key, value) {
    const preset = this.presets.find((p) => p.Key === key);
    if (preset === undefined) return '[BAD PRESET VALUE]';
    return preset.Values[value.toString()];
  }

  getPresetValuePairs(key) {
    const preset = this.presets.find((p) => p.Key === key);
    if (preset === undefined) return null;
    return preset.Values;
  }

  getPresetValues(key) {
    const preset = this.presets.find((p) => p.Key === key);
    if (preset === undefined) return null;
    return values(preset.Values);
  }

  getPresetValuesForOptions(key) {
    const preset = this.presets.find((p) => p.Key === key);
    if (preset === undefined) return null;

    const presetKeys = keys(preset.Values);
    const presetValues = values(preset.Values);

    const options = presetKeys.map((k, index) => ({ text: presetValues[index], value: k }));

    return options;
  }

  getPresetKeys() {
    return this.presets.map((p) => p.Key);
  }

  reset = () => {
    this.operations.clear();
    this.presets.clear();
    this.tags.clear();
    this.definitionCount = 0;
  };
}

export const defStore = new DefStore();

export { DefStore };
