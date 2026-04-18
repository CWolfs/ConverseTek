import { describe, it, expect } from 'vitest';

import { findInboundLinksToPromptNodeIndex } from 'utils/node-link-utils';
import { buildDeleteConfirmationContent } from 'utils/delete-confirmation-utils';
import type { ElementNodeType, PromptNodeType } from 'types';

function makeResponse(overrides: Partial<ElementNodeType> = {}): ElementNodeType {
  return {
    type: 'response',
    nextNodeIndex: -1,
    auxiliaryLink: false,
    responseText: '',
    ...overrides,
  } as ElementNodeType;
}

function makeRoot(overrides: Partial<ElementNodeType> = {}): ElementNodeType {
  return {
    type: 'root',
    nextNodeIndex: -1,
    auxiliaryLink: false,
    responseText: '',
    ...overrides,
  } as ElementNodeType;
}

function makePromptNode(index: number, branches: ElementNodeType[]): PromptNodeType {
  return {
    type: 'node',
    index,
    branches,
  } as PromptNodeType;
}

describe('CT-128: warn on prompt-node deletion when linked', () => {
  describe('findInboundLinksToPromptNodeIndex', () => {
    it('detects an inbound auxiliary link from a response branch', () => {
      const linker = makeResponse({ nextNodeIndex: 5, auxiliaryLink: true });
      const owner = makePromptNode(2, [linker]);
      const target = makePromptNode(5, []);

      const linkers = findInboundLinksToPromptNodeIndex([], [owner, target], 5);

      expect(linkers).toHaveLength(1);
      expect(linkers[0]).toBe(linker);
    });

    it('detects an inbound auxiliary link from a root', () => {
      const rootLinker = makeRoot({ nextNodeIndex: 7, auxiliaryLink: true });
      const target = makePromptNode(7, []);

      const linkers = findInboundLinksToPromptNodeIndex([rootLinker], [target], 7);

      expect(linkers).toHaveLength(1);
      expect(linkers[0]).toBe(rootLinker);
    });

    it("ignores a structural parent (nextNodeIndex matches but auxiliaryLink is false)", () => {
      const structural = makeResponse({ nextNodeIndex: 5, auxiliaryLink: false });
      const owner = makePromptNode(2, [structural]);
      const target = makePromptNode(5, []);

      const linkers = findInboundLinksToPromptNodeIndex([], [owner, target], 5);

      expect(linkers).toHaveLength(0);
    });

    it('returns an empty array when there are no inbound links', () => {
      const responseToElsewhere = makeResponse({ nextNodeIndex: 99, auxiliaryLink: true });
      const owner = makePromptNode(2, [responseToElsewhere]);
      const target = makePromptNode(5, []);

      const linkers = findInboundLinksToPromptNodeIndex([], [owner, target], 5);

      expect(linkers).toHaveLength(0);
    });
  });

  describe('buildDeleteConfirmationContent', () => {
    it('produces the inbound-link warning body when a prompt node has linkers (the #128 fix)', () => {
      const { title, body } = buildDeleteConfirmationContent({ isLink: false, inboundLinkCount: 2 });

      // Pre-fix: the production delete handler returns the generic single-line body
      // for every prompt-node deletion regardless of inbound links. This expectation
      // encodes the new contract — multi-paragraph body that calls out the linkers.
      expect(title).toBe('Are you sure you want to delete this node?');
      expect(Array.isArray(body)).toBe(true);
      const joined = (body as string[]).join(' ');
      expect(joined).toMatch(/2 response nodes link to this prompt node/i);
      expect(joined).toMatch(/End of Dialogue/);
    });

    it('uses singular phrasing when only one inbound link exists', () => {
      const { body } = buildDeleteConfirmationContent({ isLink: false, inboundLinkCount: 1 });

      const joined = (body as string[]).join(' ');
      expect(joined).toMatch(/1 response node links to this prompt node/i);
      expect(joined).toMatch(/break that link/i);
    });

    it('produces the original generic body when there are no inbound links', () => {
      const { title, body } = buildDeleteConfirmationContent({ isLink: false, inboundLinkCount: 0 });

      expect(title).toBe('Are you sure you want to delete this node?');
      expect(typeof body).toBe('string');
      expect(body).toMatch(/delete the node and all it's children/);
    });

    it('produces the link-only body when deleting a link', () => {
      const { title, body } = buildDeleteConfirmationContent({ isLink: true, inboundLinkCount: 0 });

      expect(title).toBe('Are you sure you want to delete this link?');
      expect(body).toBe('This action will delete the link and only this specific link.');
    });
  });
});
