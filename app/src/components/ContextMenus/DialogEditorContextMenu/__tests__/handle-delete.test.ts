import { vi, describe, it, expect } from 'vitest';

// The real ModalConfirmation pulls in antd, which we don't want to load in a
// Node test environment. It's only used as a component reference passed to
// modalStore.setModelContent, so a stub is fine.
vi.mock('components/Modals/ModalConfirmation', () => ({
  ModalConfirmation: 'ModalConfirmationStub',
}));

// utils/node-utils transitively loads the MobX store singletons (which touch
// `document` at construction time). The handler only uses detectType, so we
// stub it directly here.
vi.mock('utils/node-utils', () => ({
  detectType: (type: string | null) => ({
    isCore: false,
    isBaseCore: false,
    isIsolatedCore: false,
    isRoot: type === 'root',
    isNode: type === 'node',
    isResponse: type === 'response',
    isLink: type === 'link',
  }),
}));

import { handleDeleteIntent } from '../handle-delete';
import type { NodeStore } from 'stores/nodeStore/node-store';
import type { ModalStore } from 'stores/modalStore/modal-store';
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

function makePromptNode(index: number, branches: ElementNodeType[] = []): PromptNodeType {
  return { type: 'node', index, branches } as PromptNodeType;
}

function buildFakes(promptNode: PromptNodeType, inboundLinks: ElementNodeType[]) {
  const nodeStore = {
    getNode: vi.fn((_id: string) => promptNode),
    getInboundLinksToPromptNodeIndex: vi.fn((_i: number) => inboundLinks),
    deleteNodeCascadeById: vi.fn(),
    deleteLink: vi.fn(),
  };
  const modalStore = { setModelContent: vi.fn() };
  return { nodeStore, modalStore };
}

describe('CT-128: delete flow opens the confirmation modal', () => {
  it('opens the modal with an inbound-link warning when deleting a linked-to prompt node', () => {
    const linker = makeResponse({ nextNodeIndex: 5, auxiliaryLink: true });
    const target = makePromptNode(5, []);
    const { nodeStore, modalStore } = buildFakes(target, [linker]);

    handleDeleteIntent({
      props: { id: 'prompt-5-id', type: 'node', parentId: 'parent-id' },
      nodeStore: nodeStore as unknown as NodeStore,
      modalStore: modalStore as unknown as ModalStore,
    });

    expect(modalStore.setModelContent).toHaveBeenCalledTimes(1);
    const [componentArg, modalProps, globalModalId] = modalStore.setModelContent.mock.calls[0];

    expect(componentArg).toBe('ModalConfirmationStub');
    expect(globalModalId).toBe('global1');

    const body = (modalProps as { body: string | string[] }).body;
    expect(Array.isArray(body)).toBe(true);
    const joined = (body as string[]).join(' ');
    expect(joined).toMatch(/1 response node links to this prompt node/i);
    expect(joined).toMatch(/End of Dialogue/);

    // Confirming the modal must still trigger the cascade delete.
    const buttons = (modalProps as { buttons: { onPositive: () => void } }).buttons;
    buttons.onPositive();
    expect(nodeStore.deleteNodeCascadeById).toHaveBeenCalledWith('prompt-5-id');
    expect(nodeStore.deleteLink).not.toHaveBeenCalled();
  });

  it('opens the modal with the generic body when the prompt node has no inbound links', () => {
    const target = makePromptNode(5, []);
    const { nodeStore, modalStore } = buildFakes(target, []);

    handleDeleteIntent({
      props: { id: 'prompt-5-id', type: 'node', parentId: 'parent-id' },
      nodeStore: nodeStore as unknown as NodeStore,
      modalStore: modalStore as unknown as ModalStore,
    });

    const modalProps = modalStore.setModelContent.mock.calls[0][1] as { body: string | string[] };
    expect(typeof modalProps.body).toBe('string');
    expect(modalProps.body).toMatch(/delete the node and all it's children/);
  });

  it('opens the link-only modal and calls deleteLink when deleting a link', () => {
    const target = makePromptNode(5, []);
    const { nodeStore, modalStore } = buildFakes(target, []);

    handleDeleteIntent({
      props: { id: 'link-id', type: 'link', parentId: 'response-owner-id' },
      nodeStore: nodeStore as unknown as NodeStore,
      modalStore: modalStore as unknown as ModalStore,
    });

    const modalProps = modalStore.setModelContent.mock.calls[0][1] as {
      body: string | string[];
      buttons: { onPositive: () => void };
    };
    expect(modalProps.body).toBe('This action will delete the link and only this specific link.');

    modalProps.buttons.onPositive();
    expect(nodeStore.deleteLink).toHaveBeenCalledWith('response-owner-id');
    expect(nodeStore.deleteNodeCascadeById).not.toHaveBeenCalled();
  });
});
