import type { ConversationAssetType, ElementNodeType, OperationCallType, PromptNodeType } from 'types';
import { getId } from './conversation-utils';
import { formatSpeakerIdLabel } from './speaker-projection-utils';

export type CameraProjectionVariant = 'default' | 'multiple' | 'hardLock';

export type CameraProjection = {
  label: string;
  title: string;
  variant: CameraProjectionVariant;
};

type CameraReference = {
  cameraLockTarget: string | null;
  hardLockTarget: string | null;
};

type EffectiveCameraReference = {
  target: string;
  hardLock: boolean;
};

const cameraLockAction = 'Set BattleTech Camera Lock';
const cameraHardLockAction = 'Set BattleTech Camera Hard Lock';
const noCameraKey = 'none';

const validCameraTargets = new Set([
  'UNSET',
  'ALEXANDER',
  'DARIUS',
  'FARAH',
  'KAMEA',
  'SUMIRE',
  'YANG',
  'MONITOR',
  'NAVSCREEN',
  'DEFAULT',
  'CONTRACTS',
  'MECHWARRIORS',
  'MEMORIAL',
  'ARGOUPGRADE',
  'MECHLAB',
  'BREAKDOWN',
  'COMMANDER',
  'HOLOGRAM',
  'HERALDRY',
]);

const cameraTargetLabels = new Map([
  ['UNSET', 'Unset'],
  ['ALEXANDER', 'Alexander'],
  ['DARIUS', 'Darius'],
  ['FARAH', 'Farah'],
  ['KAMEA', 'Kamea'],
  ['SUMIRE', 'Sumire'],
  ['YANG', 'Yang'],
  ['MONITOR', 'Monitor'],
  ['NAVSCREEN', 'Navscreen'],
  ['DEFAULT', 'Default'],
  ['CONTRACTS', 'Contracts'],
  ['MECHWARRIORS', 'Mechwarriors'],
  ['MEMORIAL', 'Memorial'],
  ['ARGOUPGRADE', 'Argo Upgrade'],
  ['MECHLAB', 'Mechlab'],
  ['BREAKDOWN', 'Breakdown'],
  ['COMMANDER', 'Commander'],
  ['HOLOGRAM', 'Hologram'],
  ['HERALDRY', 'Heraldry'],
]);

function normaliseCameraTarget(target: string): string {
  return target.trim().toUpperCase();
}

function getArgStringValue(op: OperationCallType): string {
  const arg = op.args[0];
  if (arg == null) return '';

  return arg.stringValue || '';
}

function getCameraKey(camera: CameraReference | null): string {
  if (camera == null) return noCameraKey;

  return `${camera.cameraLockTarget || ''}:${camera.hardLockTarget || ''}`;
}

function parseCameraKey(key: string): EffectiveCameraReference | null {
  if (key === noCameraKey) return null;

  const [cameraLockTarget, hardLockTarget] = key.split(':');
  if (hardLockTarget) {
    return {
      target: hardLockTarget,
      hardLock: true,
    };
  }
  if (cameraLockTarget) {
    return {
      target: cameraLockTarget,
      hardLock: false,
    };
  }

  return null;
}

function formatCameraTarget(target: string): string {
  return cameraTargetLabels.get(target) || formatSpeakerIdLabel(target);
}

function applyOperation(op: OperationCallType, camera: CameraReference | null): CameraReference | null {
  if (op.functionName === cameraLockAction) {
    const target = normaliseCameraTarget(getArgStringValue(op));
    if (!validCameraTargets.has(target)) {
      if (camera?.hardLockTarget) {
        return {
          ...camera,
          cameraLockTarget: null,
        };
      }

      return null;
    }

    return {
      cameraLockTarget: target,
      hardLockTarget: camera?.hardLockTarget || null,
    };
  }

  if (op.functionName === cameraHardLockAction) {
    const target = normaliseCameraTarget(getArgStringValue(op));
    if (!target) return camera;

    return {
      cameraLockTarget: validCameraTargets.has(target) ? target : null,
      hardLockTarget: target,
    };
  }

  return camera;
}

function applyActions(actions: { ops: OperationCallType[] | null } | null, camera: CameraReference | null): CameraReference | null {
  if (actions?.ops == null) return camera;

  return actions.ops.reduce((currentCamera, op) => applyOperation(op, currentCamera), camera);
}

function hasCameraAction(linkOrNode: ElementNodeType | PromptNodeType): boolean {
  return !!linkOrNode.actions?.ops?.some((op) => op.functionName === cameraLockAction || op.functionName === cameraHardLockAction);
}

function getTargetNode(conversationAsset: ConversationAssetType, link: ElementNodeType): PromptNodeType | null {
  if (link.nextNodeIndex < 0) return null;

  return conversationAsset.conversation.nodes[link.nextNodeIndex] || null;
}

function buildProjection(camera: EffectiveCameraReference): CameraProjection {
  const target = formatCameraTarget(camera.target);

  return {
    label: target,
    title: camera.hardLock
      ? `Camera hard-locked to ${target}. Useful for 1-on-1 conversations and keeping the camera on one target while another character speaks. ExtendedConversations keeps this hard lock until conversation end or another hard lock changes it.`
      : `Camera locked to ${target}. BattleTech uses this target instead of following the current speaker while the lock is active.`,
    variant: camera.hardLock ? 'hardLock' : 'default',
  };
}

function buildProjectedProjection(cameraKeys: Set<string>): CameraProjection | null {
  const cameras = [...cameraKeys].map(parseCameraKey);
  const activeCameras = cameras.filter((camera): camera is EffectiveCameraReference => camera != null);

  if (activeCameras.length === 0) return null;
  if (cameras.length === 1 && activeCameras.length === 1) return buildProjection(activeCameras[0]);

  return {
    label: 'Multiple',
    title: `Possible camera states: ${cameras
      .map((camera) => {
        if (camera == null) return 'unlocked';

        return `${camera.hardLock ? 'hard lock' : 'lock'} ${formatCameraTarget(camera.target)}`;
      })
      .join(', ')}`,
    variant: 'multiple',
  };
}

export function buildPromptCameraProjectionMap(conversationAsset: ConversationAssetType): Map<string, CameraProjection> {
  const { nodes, roots } = conversationAsset.conversation;
  const possibleCamerasByNodeId = new Map<string, Set<string>>();
  const directCameraByElementId = new Map<string, CameraReference | null>();
  const visited = new Set<string>();
  const queue: { link: ElementNodeType; inheritedCamera: CameraReference | null }[] = roots.map((link) => ({
    link,
    inheritedCamera: null,
  }));

  while (queue.length > 0) {
    const { link, inheritedCamera } = queue.shift() as { link: ElementNodeType; inheritedCamera: CameraReference | null };
    const cameraAfterLink = applyActions(link.actions, inheritedCamera);
    if (hasCameraAction(link)) directCameraByElementId.set(getId(link), cameraAfterLink);

    const targetNode = getTargetNode(conversationAsset, link);
    if (targetNode == null) continue;

    const cameraAfterNode = applyActions(targetNode.actions, cameraAfterLink);
    const visitKey = `${getId(targetNode)}:${getCameraKey(cameraAfterNode)}`;
    if (visited.has(visitKey)) continue;
    visited.add(visitKey);

    const targetNodeId = getId(targetNode);
    const possibleCameras = possibleCamerasByNodeId.get(targetNodeId) || new Set<string>();
    possibleCameras.add(getCameraKey(cameraAfterNode));
    possibleCamerasByNodeId.set(targetNodeId, possibleCameras);

    targetNode.branches.forEach((branch) => {
      queue.push({
        link: branch,
        inheritedCamera: cameraAfterNode,
      });
    });
  }

  const projections = new Map<string, CameraProjection>();
  directCameraByElementId.forEach((camera, elementId) => {
    const projection = buildProjectedProjection(new Set([getCameraKey(camera)]));
    if (projection) projections.set(elementId, projection);
  });

  nodes.forEach((node) => {
    const projection = buildProjectedProjection(possibleCamerasByNodeId.get(getId(node)) || new Set([noCameraKey]));
    if (projection) projections.set(getId(node), projection);
  });

  return projections;
}
