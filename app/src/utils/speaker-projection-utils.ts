import type { ConversationAssetType, ElementNodeType, PromptNodeType } from 'types';
import { getId } from './conversation-utils';

export type SpeakerProjectionVariant = 'default' | 'multiple';

export type SpeakerProjection = {
  label: string;
  title: string;
  variant: SpeakerProjectionVariant;
};

type SpeakerReference = {
  type: 'castId' | 'speakerId';
  id: string;
};

const unknownSpeakerKey = 'unknown';

function getSpeakerKey(speaker: SpeakerReference | null): string {
  if (speaker == null) return unknownSpeakerKey;
  return `${speaker.type}:${speaker.id}`;
}

function parseSpeakerKey(key: string): SpeakerReference | null {
  if (key === unknownSpeakerKey) return null;

  const [type, ...idParts] = key.split(':');
  const id = idParts.join(':');
  if ((type === 'castId' || type === 'speakerId') && id) return { type, id };

  return null;
}

export function formatSpeakerIdLabel(speakerId: string): string {
  return (
    speakerId
      .replace(/^castDef_/i, '')
      .replace(/Default$/i, '')
      .replace(/[_-]+/g, ' ')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/\s+/g, ' ')
      .trim() || speakerId
  );
}

function formatSpeakerName(speaker: SpeakerReference | null): string {
  if (speaker == null) return 'unknown inherited speaker';

  return formatSpeakerIdLabel(speaker.id);
}

function formatSpeakerTitle(speaker: SpeakerReference | null): string {
  if (speaker == null) return 'unknown inherited speaker';

  return `${formatSpeakerName(speaker)} (${speaker.type} ${speaker.id})`;
}

function getExplicitSpeaker(node: PromptNodeType): SpeakerReference | null {
  const castId = node.sourceInSceneRef?.id || '';
  if (castId) return { type: 'castId', id: castId };

  const speakerId = node.speakerOverrideId || '';
  if (speakerId) return { type: 'speakerId', id: speakerId };

  return null;
}

function getTargetNode(conversationAsset: ConversationAssetType, link: ElementNodeType): PromptNodeType | null {
  if (link.nextNodeIndex < 0) return null;

  return conversationAsset.conversation.nodes[link.nextNodeIndex] || null;
}

function buildSingleProjection(speaker: SpeakerReference | null, isExplicit: boolean): SpeakerProjection {
  if (speaker == null) {
    return {
      label: 'Inherits',
      title: 'No node speaker; BattleTech reuses the current conversation speaker',
      variant: 'default',
    };
  }

  const label = formatSpeakerName(speaker);
  return {
    label,
    title: isExplicit ? `${speaker.type} ${speaker.id}` : `Projected speaker: ${formatSpeakerTitle(speaker)}`,
    variant: 'default',
  };
}

function buildProjectedProjection(speakerKeys: Set<string>): SpeakerProjection {
  const speakers = [...speakerKeys].map(parseSpeakerKey);

  if (speakers.length <= 1) return buildSingleProjection(speakers[0] || null, false);

  return {
    label: 'Multiple',
    title: `Possible speakers: ${speakers.map(formatSpeakerTitle).join(', ')}`,
    variant: 'multiple',
  };
}

export function buildPromptSpeakerProjectionMap(conversationAsset: ConversationAssetType): Map<string, SpeakerProjection> {
  const { nodes, roots } = conversationAsset.conversation;
  const possibleSpeakersByNodeId = new Map<string, Set<string>>();
  const visited = new Set<string>();
  const queue: { link: ElementNodeType; inheritedSpeaker: SpeakerReference | null }[] = roots.map((link) => ({
    link,
    inheritedSpeaker: null,
  }));

  while (queue.length > 0) {
    const { link, inheritedSpeaker } = queue.shift() as { link: ElementNodeType; inheritedSpeaker: SpeakerReference | null };
    const targetNode = getTargetNode(conversationAsset, link);
    if (targetNode == null) continue;

    const visitKey = `${getId(targetNode)}:${getSpeakerKey(inheritedSpeaker)}`;
    if (visited.has(visitKey)) continue;
    visited.add(visitKey);

    const explicitSpeaker = getExplicitSpeaker(targetNode);
    const resolvedSpeaker = explicitSpeaker || inheritedSpeaker;
    const targetNodeId = getId(targetNode);
    const possibleSpeakers = possibleSpeakersByNodeId.get(targetNodeId) || new Set<string>();
    possibleSpeakers.add(getSpeakerKey(resolvedSpeaker));
    possibleSpeakersByNodeId.set(targetNodeId, possibleSpeakers);

    targetNode.branches.forEach((branch) => {
      queue.push({
        link: branch,
        inheritedSpeaker: resolvedSpeaker,
      });
    });
  }

  const projections = new Map<string, SpeakerProjection>();
  nodes.forEach((node) => {
    const explicitSpeaker = getExplicitSpeaker(node);
    if (explicitSpeaker != null) {
      projections.set(getId(node), buildSingleProjection(explicitSpeaker, true));
      return;
    }

    projections.set(getId(node), buildProjectedProjection(possibleSpeakersByNodeId.get(getId(node)) || new Set([unknownSpeakerKey])));
  });

  return projections;
}
