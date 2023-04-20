import { OperationDefinitionType } from './OperationDefinitionType';
import { PresetDefinitionType } from './PresetDefinitionType';
import { TagDefinitionType } from './TagDefinitionType';

export type DefinitionsType = {
  operations: OperationDefinitionType[];
  presets: PresetDefinitionType[];
  tags: TagDefinitionType[];
};
