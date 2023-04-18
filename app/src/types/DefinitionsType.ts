import { OperationDefinitionType } from './OperationDefinition';
import { PresetDefinitionType } from './PresetDefinition';
import { TagDefinitionType } from './TagDefinition';

export type DefinitionsType = {
  operations: OperationDefinitionType[];
  presets: PresetDefinitionType[];
  tags: TagDefinitionType[];
};
