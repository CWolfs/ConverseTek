import type { ConversationAssetType, ElementNodeType, InputType, OperationArgType, OperationCallType, OperationDefinitionType, PromptNodeType } from 'types';
import { getId } from './conversation-utils';

export type ConversationDiagnosticSeverity = 'error' | 'warning' | 'info';
export type ConversationDiagnosticCategory = 'content' | 'graph' | 'operation' | 'reference';

export type ConversationDiagnostic = {
  id: string;
  severity: ConversationDiagnosticSeverity;
  category: ConversationDiagnosticCategory;
  title: string;
  description: string;
  nodeId: string | null;
  nodeLabel: string;
};

export type ConversationDiagnosticsOptions = {
  conversationAsset: ConversationAssetType;
  operationDefinitions: OperationDefinitionType[];
  loadedConversationAssets?: ConversationAssetType[];
};

type NodeContext = {
  nodeId: string | null;
  nodeLabel: string;
};

type OperationContext = NodeContext & {
  logicKind: 'action' | 'condition';
  path: string;
};

const sideloadConversationOperation = 'Sideload Conversation';

export function buildConversationDiagnostics(options: ConversationDiagnosticsOptions): ConversationDiagnostic[] {
  const { conversationAsset, operationDefinitions, loadedConversationAssets = [] } = options;
  const diagnostics: ConversationDiagnostic[] = [];
  const operationDefinitionsByName = new Map(operationDefinitions.map((definition) => [definition.key, definition]));
  const promptNodesByRuntimeIndex = buildPromptNodeRuntimeIndexMap(conversationAsset.conversation.nodes, diagnostics);
  const loadedConversationsById = buildLoadedConversationsById([conversationAsset, ...loadedConversationAssets]);

  scanConversationShape(conversationAsset, diagnostics, promptNodesByRuntimeIndex);
  scanReachability(conversationAsset, diagnostics, promptNodesByRuntimeIndex);
  scanOperations(conversationAsset, diagnostics, operationDefinitionsByName, loadedConversationsById);

  return diagnostics;
}

function buildPromptNodeRuntimeIndexMap(nodes: PromptNodeType[], diagnostics: ConversationDiagnostic[]): Map<number, PromptNodeType> {
  const promptNodesByRuntimeIndex = new Map<number, PromptNodeType>();
  const promptNodeIndexes = new Map<number, PromptNodeType>();

  nodes.forEach((node, runtimeIndex) => {
    promptNodesByRuntimeIndex.set(runtimeIndex, node);

    if (node.index !== runtimeIndex) {
      diagnostics.push(
        createDiagnostic({
          severity: 'warning',
          category: 'graph',
          title: 'Prompt node index differs from its runtime position',
          description: `BattleTech resolves links by position in the prompt node list. This prompt is stored at position ${runtimeIndex}, but its own index field is ${node.index}. Saving in ConverseTek should rebuild this, but it is worth checking before testing in game.`,
          context: getPromptNodeContext(node),
        }),
      );
    }

    if (promptNodeIndexes.has(node.index)) {
      diagnostics.push(
        createDiagnostic({
          severity: 'warning',
          category: 'graph',
          title: 'Duplicate prompt node index',
          description: `Prompt node index ${node.index} is used more than once. BattleTech uses this field for conversation history and loop handling, so duplicates can make backtracking behaviour unreliable.`,
          context: getPromptNodeContext(node),
        }),
      );
      return;
    }

    promptNodeIndexes.set(node.index, node);
  });

  return promptNodesByRuntimeIndex;
}

function scanConversationShape(
  conversationAsset: ConversationAssetType,
  diagnostics: ConversationDiagnostic[],
  promptNodesByIndex: Map<number, PromptNodeType>,
): void {
  const { roots, nodes } = conversationAsset.conversation;

  if (roots.length <= 0) {
    diagnostics.push(
      createDiagnostic({
        severity: 'error',
        category: 'graph',
        title: 'Conversation has no roots',
        description: 'The conversation has no root response nodes, so BattleTech has no entry point into the dialogue.',
        context: getConversationContext(conversationAsset),
      }),
    );
  }

  roots.forEach((root, index) => {
    const context = getElementNodeContext(root, `Root ${index + 1}`);
    scanElementNodeTarget(root, context, diagnostics, promptNodesByIndex, true);
  });

  nodes.forEach((node) => {
    const context = getPromptNodeContext(node);

    if (node.text.trim() === '') {
      diagnostics.push(
        isEmptyPromptLikelyInert(node)
          ? createDiagnostic({
              severity: 'warning',
              category: 'content',
              title: 'Prompt node has no content or responses',
              description: 'This prompt has no speaker text, no response options, and no actions. Check that the player will not be left on stale or missing dialogue text.',
              context,
            })
          : createDiagnostic({
              severity: 'info',
              category: 'content',
              title: 'Prompt node has no text',
              description: 'This prompt has no speaker text, but it has response choices or actions. This is valid for continuation routing, chained commander response runs, and other intentional silent prompt nodes.',
              context,
            }),
      );
    }

    node.branches.forEach((response, index) => {
      const responseContext = getElementNodeContext(response, `Response ${index + 1} from ${context.nodeLabel}`);
      scanElementNodeTarget(response, responseContext, diagnostics, promptNodesByIndex, false);
    });
  });
}

function isEmptyPromptLikelyInert(node: PromptNodeType): boolean {
  return node.branches.length <= 0 && (node.actions?.ops?.length ?? 0) <= 0;
}

function scanElementNodeTarget(
  elementNode: ElementNodeType,
  context: NodeContext,
  diagnostics: ConversationDiagnostic[],
  promptNodesByIndex: Map<number, PromptNodeType>,
  isRoot: boolean,
): void {
  if (elementNode.nextNodeIndex === -1) {
    if (isRoot) {
      diagnostics.push(
        createDiagnostic({
          severity: 'warning',
          category: 'graph',
          title: 'Root has no target prompt node',
          description: 'This root points to End of Dialogue. If this is not intentional, connect it to a prompt node.',
          context,
        }),
      );
    }
    return;
  }

  if (!promptNodesByIndex.has(elementNode.nextNodeIndex)) {
    diagnostics.push(
      createDiagnostic({
        severity: 'error',
        category: 'graph',
        title: 'Link target is missing',
        description: `${context.nodeLabel} points to prompt node position ${elementNode.nextNodeIndex}, but the prompt node list does not have that position. BattleTech will treat this as End Conversation.`,
        context,
      }),
    );
  }
}

function scanReachability(
  conversationAsset: ConversationAssetType,
  diagnostics: ConversationDiagnostic[],
  promptNodesByIndex: Map<number, PromptNodeType>,
): void {
  const reachableIndexes = new Set<number>();
  const visitPromptIndex = (index: number): void => {
    if (index === -1 || reachableIndexes.has(index)) return;

    const node = promptNodesByIndex.get(index);
    if (node == null) return;

    reachableIndexes.add(index);
    node.branches.forEach((branch) => visitPromptIndex(branch.nextNodeIndex));
  };

  conversationAsset.conversation.roots.forEach((root) => visitPromptIndex(root.nextNodeIndex));

  conversationAsset.conversation.nodes.forEach((node, runtimeIndex) => {
    if (reachableIndexes.has(runtimeIndex)) return;

    diagnostics.push(
      createDiagnostic({
        severity: 'warning',
        category: 'graph',
        title: 'Prompt node is not reachable from a root',
        description: 'This prompt node cannot be reached by following roots and responses in this conversation. If it is only used as an explicit sideload entry, this can be intentional.',
        context: getPromptNodeContext(node),
      }),
    );
  });
}

function scanOperations(
  conversationAsset: ConversationAssetType,
  diagnostics: ConversationDiagnostic[],
  operationDefinitionsByName: Map<string, OperationDefinitionType>,
  loadedConversationsById: Map<string, ConversationAssetType>,
): void {
  const { roots, nodes } = conversationAsset.conversation;

  roots.forEach((root, index) => {
    const context = getElementNodeContext(root, `Root ${index + 1}`);
    scanOperationList(root.conditions?.ops, { ...context, logicKind: 'condition', path: 'root conditions' }, diagnostics, operationDefinitionsByName, loadedConversationsById);
    scanOperationList(root.actions?.ops, { ...context, logicKind: 'action', path: 'root actions' }, diagnostics, operationDefinitionsByName, loadedConversationsById);
  });

  nodes.forEach((node) => {
    const context = getPromptNodeContext(node);
    scanOperationList(node.actions?.ops, { ...context, logicKind: 'action', path: 'prompt actions' }, diagnostics, operationDefinitionsByName, loadedConversationsById);

    node.branches.forEach((response, index) => {
      const responseContext = getElementNodeContext(response, `Response ${index + 1} from ${context.nodeLabel}`);
      scanOperationList(
        response.conditions?.ops,
        { ...responseContext, logicKind: 'condition', path: 'response conditions' },
        diagnostics,
        operationDefinitionsByName,
        loadedConversationsById,
      );
      scanOperationList(
        response.actions?.ops,
        { ...responseContext, logicKind: 'action', path: 'response actions' },
        diagnostics,
        operationDefinitionsByName,
        loadedConversationsById,
      );
    });
  });
}

function scanOperationList(
  operations: OperationCallType[] | null | undefined,
  context: OperationContext,
  diagnostics: ConversationDiagnostic[],
  operationDefinitionsByName: Map<string, OperationDefinitionType>,
  loadedConversationsById: Map<string, ConversationAssetType>,
): void {
  operations?.forEach((operation, index) => {
    scanOperation(operation, { ...context, path: `${context.path} > ${context.logicKind} ${index + 1}` }, diagnostics, operationDefinitionsByName, loadedConversationsById);
  });
}

function scanOperation(
  operation: OperationCallType,
  context: OperationContext,
  diagnostics: ConversationDiagnostic[],
  operationDefinitionsByName: Map<string, OperationDefinitionType>,
  loadedConversationsById: Map<string, ConversationAssetType>,
): void {
  const definition = operationDefinitionsByName.get(operation.functionName);

  if (definition == null) {
    diagnostics.push(
      createDiagnostic({
        severity: 'error',
        category: 'operation',
        title: 'Missing operation definition',
        description: `${context.path} uses '${operation.functionName}', but no matching operation definition is installed.`,
        context,
      }),
    );
    return;
  }

  if (operation.args.length < definition.inputs.length) {
    diagnostics.push(
      createDiagnostic({
        severity: 'warning',
        category: 'operation',
        title: 'Operation has missing inputs',
        description: `${operation.functionName} expects ${definition.inputs.length} input(s), but this call only has ${operation.args.length}.`,
        context,
      }),
    );
  }

  operation.args.forEach((arg, index) => {
    const input = definition.inputs[index];
    if (input == null) {
      diagnostics.push(
        createDiagnostic({
          severity: 'warning',
          category: 'operation',
          title: 'Operation has extra input data',
          description: `${operation.functionName} has an extra input at position ${index + 1}. It may have been created with an older or mismatched definition.`,
          context,
        }),
      );
      return;
    }

    scanOperationArg(operation, arg, input, index, context, diagnostics, operationDefinitionsByName, loadedConversationsById);
  });

  if (operation.functionName === sideloadConversationOperation) {
    scanSideloadConversationOperation(operation, context, diagnostics, loadedConversationsById);
  }
}

function scanOperationArg(
  operation: OperationCallType,
  arg: OperationArgType,
  input: InputType,
  inputIndex: number,
  context: OperationContext,
  diagnostics: ConversationDiagnostic[],
  operationDefinitionsByName: Map<string, OperationDefinitionType>,
  loadedConversationsById: Map<string, ConversationAssetType>,
): void {
  const argType = getEffectiveArgType(arg);
  const inputPath = `${operation.functionName} input '${input.label || inputIndex + 1}'`;

  if (argType != null && !input.types.includes(argType)) {
    diagnostics.push(
      createDiagnostic({
        severity: 'warning',
        category: 'operation',
        title: 'Operation input type looks wrong',
        description: `${inputPath} is stored as ${argType}, but the definition allows ${input.types.join(', ')}.`,
        context,
      }),
    );
  }

  if (!isInputOptional(operation.functionName, input) && isEmptyRequiredArg(arg, input)) {
    const severity = isInformationalEmptyArg(operation.functionName, input) ? 'info' : 'warning';
    diagnostics.push(
      createDiagnostic({
        severity,
        category: 'operation',
        title: 'Operation input is empty',
        description:
          severity === 'info'
            ? `${inputPath} is empty. This is valid, but check that the missing value is intentional.`
            : `${inputPath} is empty. This may fail or do nothing at runtime.`,
        context,
      }),
    );
  }

  if (arg.callValue != null) {
    scanOperation(
      arg.callValue,
      { ...context, path: `${context.path} > ${operation.functionName}.${input.label || inputIndex + 1}` },
      diagnostics,
      operationDefinitionsByName,
      loadedConversationsById,
    );
  }
}

function scanSideloadConversationOperation(
  operation: OperationCallType,
  context: OperationContext,
  diagnostics: ConversationDiagnostic[],
  loadedConversationsById: Map<string, ConversationAssetType>,
): void {
  const conversationId = getStringArgValue(operation.args[0]);
  const entryNodeId = getStringArgValue(operation.args[1]);

  if (conversationId == null || conversationId.trim() === '') return;

  const sideloadedConversation = loadedConversationsById.get(conversationId) ?? loadedConversationsById.get(getComparableId(conversationId));
  if (sideloadedConversation == null) {
    diagnostics.push(
      createDiagnostic({
        severity: 'warning',
        category: 'reference',
        title: 'Sideload conversation target is not loaded',
        description: `Sideload Conversation references '${conversationId}', but no loaded conversation with that id was found in the current folder.`,
        context,
      }),
    );
    return;
  }

  if (entryNodeId == null || entryNodeId.trim() === '') return;

  if (!conversationContainsNodeId(sideloadedConversation, entryNodeId)) {
    diagnostics.push(
      createDiagnostic({
        severity: 'warning',
        category: 'reference',
        title: 'Sideload entry node is missing',
        description: `Sideload Conversation enters '${entryNodeId}', but that node id was not found in '${sideloadedConversation.conversation.uiName || conversationId}'.`,
        context,
      }),
    );
  }
}

function createDiagnostic({
  severity,
  category,
  title,
  description,
  context,
}: {
  severity: ConversationDiagnosticSeverity;
  category: ConversationDiagnosticCategory;
  title: string;
  description: string;
  context: NodeContext;
}): ConversationDiagnostic {
  return {
    id: `${severity}-${category}-${context.nodeId || 'conversation'}-${title}-${description}`,
    severity,
    category,
    title,
    description,
    nodeId: context.nodeId,
    nodeLabel: context.nodeLabel,
  };
}

function getPromptNodeContext(node: PromptNodeType): NodeContext {
  return {
    nodeId: getId(node),
    nodeLabel: `Prompt #${node.index + 1}`,
  };
}

function getElementNodeContext(node: ElementNodeType, fallbackLabel: string): NodeContext {
  return {
    nodeId: getId(node),
    nodeLabel: fallbackLabel,
  };
}

function getConversationContext(conversationAsset: ConversationAssetType): NodeContext {
  return {
    nodeId: null,
    nodeLabel: conversationAsset.conversation.uiName || getId(conversationAsset.conversation),
  };
}

function getEffectiveArgType(arg: OperationArgType): 'operation' | 'string' | 'float' | 'int' | 'bool' | null {
  if (arg.type != null) return arg.type;
  if (arg.callValue != null) return 'operation';
  if (arg.stringValue !== '') return 'string';
  if (arg.floatValue !== 0) return 'float';
  if (arg.boolValue) return 'bool';
  if (arg.intValue !== 0) return 'int';
  return null;
}

function getStringArgValue(arg: OperationArgType | undefined): string | null {
  if (arg == null || arg.callValue != null) return null;
  if (arg.type != null && arg.type !== 'string') return null;
  return arg.stringValue;
}

function isEmptyRequiredArg(arg: OperationArgType, input: InputType): boolean {
  if (input.types.includes('operation') && input.types.length === 1) return arg.callValue == null;
  if (input.types.includes('string') && !input.types.includes('operation')) return arg.stringValue.trim() === '';
  if (input.types.includes('string') && input.types.includes('operation')) return arg.callValue == null && arg.stringValue.trim() === '';
  return false;
}

function isInputOptional(functionName: string, input: InputType): boolean {
  const inputText = `${input.label || ''} ${input.tooltip || ''}`.toLowerCase();
  if (inputText.includes('optional')) return true;
  if (functionName === sideloadConversationOperation && input.label.toLowerCase() === 'entry node id') return true;
  return false;
}

function isInformationalEmptyArg(functionName: string, input: InputType): boolean {
  return functionName === 'Start Conversation Custom' && input.label.toLowerCase() === 'conversation sub header';
}

function buildLoadedConversationsById(conversationAssets: ConversationAssetType[]): Map<string, ConversationAssetType> {
  const conversationsById = new Map<string, ConversationAssetType>();

  conversationAssets.forEach((conversationAsset) => {
    const rawId = conversationAsset.conversation.idRef.id;
    conversationsById.set(rawId, conversationAsset);
    conversationsById.set(getComparableId(rawId), conversationAsset);
  });

  return conversationsById;
}

function getComparableId(id: string): string {
  return id.split(':')[1] || id;
}

function conversationContainsNodeId(conversationAsset: ConversationAssetType, nodeId: string): boolean {
  const comparableNodeId = getComparableId(nodeId);
  const matchesNode = (node: ElementNodeType | PromptNodeType) => node.idRef.id === nodeId || getId(node) === comparableNodeId;

  return (
    conversationAsset.conversation.roots.some(matchesNode) ||
    conversationAsset.conversation.nodes.some((node) => matchesNode(node) || node.branches.some(matchesNode))
  );
}
