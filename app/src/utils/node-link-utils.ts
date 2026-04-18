import type { ElementNodeType, PromptNodeType } from 'types';

export function findInboundLinksToPromptNodeIndex(
  roots: ElementNodeType[],
  nodes: PromptNodeType[],
  indexToFind: number,
): ElementNodeType[] {
  const linkers: ElementNodeType[] = [];

  roots.forEach((rootNode) => {
    if (rootNode.nextNodeIndex === indexToFind && rootNode.auxiliaryLink) {
      linkers.push(rootNode);
    }
  });

  nodes.forEach((promptNode) => {
    promptNode.branches.forEach((elementNode) => {
      if (elementNode.nextNodeIndex === indexToFind && elementNode.auxiliaryLink) {
        linkers.push(elementNode);
      }
    });
  });

  return linkers;
}
