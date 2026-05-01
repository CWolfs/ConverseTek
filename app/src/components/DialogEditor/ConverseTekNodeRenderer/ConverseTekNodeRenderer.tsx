/* eslint-disable function-paren-newline */
/* eslint-disable indent */
import React, { CSSProperties, useEffect, useRef, useState } from 'react';
import classnames from 'classnames';
import { observer } from 'mobx-react';
import { Popover, Tooltip } from 'antd';
import {
  AntDesignOutlined,
  BranchesOutlined,
  EnterOutlined,
  LockOutlined,
  ProfileOutlined,
  QuestionCircleFilled,
  RightCircleFilled,
  VideoCameraOutlined,
} from '@ant-design/icons';
import defer from 'lodash.defer';
import tinycolor from 'tinycolor2';

import type { OnNodeContextMenuProps } from '../DialogEditor';
import type { ConversationTreeScaffoldLine } from '../conversation-tree-adapter';
import type { PromptNodeType, ElementNodeType, ColourConfigType, OperationArgType, OperationCallType, OperationDefinitionType } from 'types';

import { isDescendant } from 'utils/tree-data-utils';
import { detectType } from 'utils/node-utils';
import { getId } from 'utils/conversation-utils';
import { formatSpeakerIdLabel, type SpeakerProjection } from 'utils/speaker-projection-utils';
import type { CameraProjection } from 'utils/camera-projection-utils';

import { DataStore } from 'stores/dataStore/data-store';

import { ViewableLogic } from 'components/ViewableLogic';
import { LinkIcon } from '../../Svg';

import './ConverseTekNodeRenderer.css';

type NodeStateProps = {
  node: RSTNode;
  path: RSTPath;
  treeIndex: number;
};

export type ConversationTreeNodeStore = {
  getNode: (nodeId: string | undefined) => PromptNodeType | ElementNodeType | null;
  getPromptNodeByIndex: (index: number) => PromptNodeType | null;
  getTreeIndex: (nodeId: string) => number | undefined;
  setActiveNode: (nodeId: string) => void;
  initScrollToNode: (nodeId: string, direction: 'up' | 'down', cachedTree?: HTMLElement, skipHorizontalScroll?: boolean) => void;
  isNodeVisible: (nodeId: string) => boolean;
  setFocusedTreeNode: (node: RSTNode) => void;
  getMaxTreeHorizontalNodePosition: () => number;
  setNodeExpansion: (nodeId: string | undefined, flag: boolean) => void;
  isNodeExpanded: (nodeId: string | undefined) => boolean;
  getSpeakerRevision?: () => number;
};

export type ConverseTekNodeRendererProps = {
  dataStore: DataStore;
  nodeStore: ConversationTreeNodeStore;
  activeNodeId: string | null;
  previousNodeId: string | null;
  onNodeContextMenu: (props: OnNodeContextMenuProps) => void;
  isContextMenuVisible: boolean;
  scaffoldBlockPxWidth: number;
  toggleChildrenVisibility: (({ node, path, treeIndex }: NodeStateProps) => void) | null;
  connectDragPreview: (element: JSX.Element) => JSX.Element;
  connectDragSource: (element: JSX.Element, effect: { dropEffect: string }) => JSX.Element;
  isDragging: boolean;
  canDrop: boolean;
  canDrag: boolean;
  node: RSTNode;
  title: ((nodeState: NodeStateProps) => string | JSX.Element) | string | JSX.Element | null;
  subtitle: ((nodeState: NodeStateProps) => string | JSX.Element) | string | JSX.Element | null;
  draggedNode: RSTNode | null;
  path: RSTPath;
  treeIndex: number;
  isSearchMatch: boolean;
  isSearchFocus: boolean;
  buttons: JSX.Element[];
  className: string;
  style: CSSProperties;
  didDrop: boolean;
  treeId: string;
  isOver: boolean;
  parentNode: RSTNode | null;
  rowDirection: string;
  zoomLevel: number;
  scaffoldLines?: ConversationTreeScaffoldLine[];
  speakerProjectionByNodeId?: Map<string, SpeakerProjection>;
  cameraProjectionByNodeId?: Map<string, CameraProjection>;
  rowCommentTooltip?: string;
  operationDefinitions?: OperationDefinitionType[];
};

function hasActionsAndConditions(node: PromptNodeType | ElementNodeType | null): { hasActions: boolean; hasConditions: boolean } {
  let hasActions = false;
  let hasConditions = false;

  if (node == null) return { hasActions, hasConditions };

  const { type } = node;
  if (type === 'node') {
    const { actions } = node;
    hasActions = actions != null && actions.ops != null && actions.ops.length > 0;
  } else if (type === 'root' || type === 'response') {
    const { actions, conditions } = node;
    hasActions = actions != null && actions.ops != null && actions.ops.length > 0;
    hasConditions = conditions != null && conditions.ops != null && conditions.ops.length > 0;
  }

  return { hasActions, hasConditions };
}

function getHighlightColour(colourConfig: ColourConfigType, nodeType: string): string {
  switch (nodeType) {
    case 'core':
      return colourConfig.coreNode.highlight;
    case 'isolatedcore':
      return colourConfig.coreNode.highlight;
    case 'root':
      return colourConfig.rootNode.highlight;
    case 'node':
      return colourConfig.promptNode.highlight;
    case 'response':
      return colourConfig.responseNode.highlight;
    case 'link':
      return colourConfig.linkNode.highlight;
  }
  return '';
}

function getTruncatedLinkText(nodeStore: ConversationTreeNodeStore, linkIndex: number, maxLength: number) {
  const linkedPromptNode = nodeStore.getPromptNodeByIndex(linkIndex);
  if (linkedPromptNode == null) return '';

  const text = linkedPromptNode.text;
  return text.length < maxLength ? text : `${text.substring(0, maxLength)}...`;
}

function getPromptSpeakerBadge(
  node: PromptNodeType | ElementNodeType | null,
  speakerProjectionByNodeId?: Map<string, SpeakerProjection>,
): SpeakerProjection | null {
  if (node == null || node.type !== 'node') return null;

  const projectedSpeaker = speakerProjectionByNodeId?.get(getId(node));
  if (projectedSpeaker) return projectedSpeaker;

  const castId = node.sourceInSceneRef?.id || '';
  const speakerId = node.speakerOverrideId || '';
  const speakerType = castId ? 'castId' : speakerId ? 'speakerId' : null;
  const speaker = castId || speakerId;

  if (!speaker) {
    return {
      label: 'Inherits',
      title: 'No node speaker; BattleTech reuses the current conversation speaker',
      variant: 'default',
    };
  }

  return {
    label: formatSpeakerIdLabel(speaker),
    title: `${speakerType || 'speaker'} ${speaker}`,
    variant: 'default',
  };
}

function getMoveHandleIcon(isRoot: boolean, isNode: boolean, isResponse: boolean): JSX.Element | null {
  const handleIconStyle = { color: 'white', fontSize: '20px' };

  if (isRoot) return <AntDesignOutlined style={handleIconStyle} />;
  if (isNode || isResponse) return null;

  return null;
}

function getActionsTooltip(isRoot: boolean, isNode: boolean, isResponse: boolean): string {
  if (isNode) return 'Prompt actions run when this node is entered, before its text is shown.';
  if (isRoot) return 'Root actions run when this conversation entry link is resolved, before the target prompt is shown.';
  if (isResponse) return 'Response actions run after this response is selected, before the target prompt is shown.';

  return 'Actions are configured on this item.';
}

function getOperationArgRawValue(arg: OperationArgType): string | number | boolean {
  if (arg.callValue != null) return formatOperationCall(arg.callValue);

  switch (arg.type) {
    case 'bool':
      return arg.boolValue;
    case 'float':
      return Number.isFinite(arg.floatValue) ? arg.floatValue : 0;
    case 'int':
      return Number.isFinite(arg.intValue) ? arg.intValue : 0;
    case 'operation':
      return arg.callValue != null ? formatOperationCall(arg.callValue) : 'operation';
    case 'string':
    default:
      return arg.stringValue || '';
  }
}

function formatOperationCall(operation: OperationCallType): string {
  const args = (operation.args || []).map((arg) => formatPlainOperationValue(getOperationArgRawValue(arg))).join(', ');
  return `${operation.functionName || 'operation'}(${args})`;
}

function formatPlainOperationValue(value: string | number | boolean): string {
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return Number.isInteger(value) ? value.toLocaleString('en-GB') : String(value);
  return value === '' ? '(blank)' : value;
}

function getOperationDefinition(
  operation: OperationCallType,
  operationDefinitions: OperationDefinitionType[] = [],
): OperationDefinitionType | null {
  return operationDefinitions.find((definition) => definition.key === operation.functionName) || null;
}

function getOperationDetailsTooltip(
  heading: string,
  operations: OperationCallType[] | null | undefined,
  fallback: string,
  operationDefinitions: OperationDefinitionType[] = [],
): JSX.Element | string {
  if (operations == null || operations.length <= 0) return fallback;

  return (
    <div className="node-renderer__logic-tooltip">
      <div className="node-renderer__logic-tooltip-heading">
        <strong>{heading}</strong>
        <span>{operations.length}</span>
      </div>
      {operations.map((operation, index) => {
        const definition = getOperationDefinition(operation, operationDefinitions);
        return (
          <div key={`${operation.functionName}-${index}`} className="node-renderer__logic-tooltip-operation">
            <div className="node-renderer__logic-tooltip-operation-header">
              <span className="node-renderer__logic-tooltip-operation-name">{definition?.label || operation.functionName || 'Operation'}</span>
              <code>{operation.functionName || 'operation'}</code>
            </div>
            {definition != null ? (
              <div className="node-renderer__logic-tooltip-sentence">
                <ViewableLogic logic={operation} />
              </div>
            ) : (
              <code className="node-renderer__logic-tooltip-fallback">{formatOperationCall(operation)}</code>
            )}
            {definition?.tooltip && <p>{definition.tooltip}</p>}
          </div>
        );
      })}
    </div>
  );
}

function getConditionsTooltip(node: PromptNodeType | ElementNodeType | null, operationDefinitions: OperationDefinitionType[]): JSX.Element | string {
  if (node == null || node.type === 'node') return 'Conditions gate whether this item is available.';
  return getOperationDetailsTooltip('Conditions', node.conditions?.ops, 'Conditions gate whether this response or root is available.', operationDefinitions);
}

function getActionsTooltipTitle(
  node: PromptNodeType | ElementNodeType | null,
  isRoot: boolean,
  isNode: boolean,
  isResponse: boolean,
  operationDefinitions: OperationDefinitionType[],
): JSX.Element | string {
  return getOperationDetailsTooltip('Actions', node?.actions?.ops, getActionsTooltip(isRoot, isNode, isResponse), operationDefinitions);
}

/* eslint-disable jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */
export const ConverseTekNodeRenderer = observer(
  ({
    dataStore,
    nodeStore,
    activeNodeId = null,
    previousNodeId = null,
    onNodeContextMenu,
    isContextMenuVisible,
    scaffoldBlockPxWidth,
    toggleChildrenVisibility = null,
    connectDragPreview,
    connectDragSource,
    isDragging,
    canDrop = false,
    canDrag = false,
    node,
    title = null,
    subtitle = null,
    draggedNode = null,
    path,
    treeIndex,
    isSearchMatch = false,
    isSearchFocus = false,
    buttons = [],
    className = '',
    style = {},
    didDrop,
    treeId,
    isOver, // Not needed, but preserved for other renderers
    parentNode = null, // Needed for dndManager
    rowDirection = 'ltr',
    zoomLevel,
    scaffoldLines = [],
    speakerProjectionByNodeId,
    cameraProjectionByNodeId,
    rowCommentTooltip = '',
    operationDefinitions = [],
    ...otherProps
  }: ConverseTekNodeRendererProps) => {
    const nodeRef = useRef<HTMLDivElement>(null);

    const nodeSubtitle = subtitle || node.subtitle;
    const rowDirectionClass = rowDirection === 'rtl' ? 'rst__rtl' : null;
    const isAnyNodeActive = !!activeNodeId;
    const isActiveNode = activeNodeId === node.id;
    const wasPreviousActiveNode = previousNodeId === node.id;
    const storedNode = nodeStore.getNode(node.id);
    const speakerRevision = nodeStore.getSpeakerRevision ? nodeStore.getSpeakerRevision() : 0;
    const { type: nodeType } = node;
    const canNodeBeDragged = !(node.canDrag === false);
    const [isHoveringOver, setIsHoveringOver] = useState<boolean>(false);
    const { colourConfig } = dataStore;
    const rendererOnlyProps = [canDrag, treeId, isOver, parentNode];
    void rendererOnlyProps;
    void speakerRevision;

    if (colourConfig == null) return null;

    const { hasActions, hasConditions } = hasActionsAndConditions(storedNode);
    const isDraggedDescendant = draggedNode && isDescendant(draggedNode, node);
    const isLandingPadActive = !didDrop && isDragging && isOver;

    const { isCore, isBaseCore, isIsolatedCore, isRoot, isNode, isResponse, isLink } = detectType(nodeType);
    const hasVisibleChildren = node.children && (node.children.length > 0 || typeof node.children === 'function');
    const showRootConnector = isCore && !!toggleChildrenVisibility && !!hasVisibleChildren;

    const contextMenuId = node.id || Math.random().toString();
    const { parentId } = node;

    let nodeTitle: ((nodeState: NodeStateProps) => string | JSX.Element) | JSX.Element | string = '';
    if (storedNode === null || storedNode === undefined) {
      nodeTitle = title || node.title;
    } else {
      if (storedNode.type === 'node') {
        nodeTitle = storedNode.text;
      } else {
        nodeTitle = storedNode.responseText;
      }
    }

    const alpha = zoomLevel <= 0.55 ? 1 : 1 - zoomLevel / 3;
    const highlightConfigValue = getHighlightColour(colourConfig, nodeType);
    const highlightColour = tinycolor(highlightConfigValue);
    highlightColour.setAlpha(alpha);

    const hoverActiveBoxShadowStyle = `0px 2px 10px ${highlightColour.toRgbString()},
                                        0px -2px 10px ${highlightColour.toRgbString()},
                                        2px 0px 10px ${highlightColour.toRgbString()},
                                        -2px 0px 10px ${highlightColour.toRgbString()}`;

    const moveHandleClasses = classnames('conversation-node-renderer__move-handle', 'rst__moveHandle', {
      'node-renderer__root-handle': isRoot,
      'node-renderer__node-handle': isNode,
      'node-renderer__response-handle': isResponse,
      'node-renderer__comment-handle': !!rowCommentTooltip,
    });

    const labelClasses = classnames('conversation-node-renderer__row-label', 'rst__rowLabel', rowDirectionClass, {
      'node-renderer__root-label': isRoot,
      'node-renderer__node-label': isNode,
      'node-renderer__response-label': isResponse,
      'node-renderer__link-label': isLink,
      'node-renderer__core-label': isCore,
    });

    const titleClasses = classnames('conversation-node-renderer__row-title', 'rst__rowTitle', node.subtitle && 'rst__rowTitleWithSubtitle', {
      'node-renderer__root-title': isRoot,
      'node-renderer__node-title': isNode,
      'node-renderer__response-title': isResponse,
      'node-renderer__link-title': isLink,
    });

    const rowContentsClasses = classnames(
      'conversation-node-renderer__row-contents',
      'rst__rowContents',
      'node-renderer__row-contents',
      {
        'node-renderer__root-row-contents': isRoot,
        'node-renderer__node-row-contents': isNode,
        'node-renderer__response-row-contents': isResponse,
        'node-renderer__link-row-contents': isLink,
      },
      !canNodeBeDragged && 'rst__rowContentsDragDisabled',
      rowDirectionClass,
    );

    const rowClasses = classnames(
      'conversation-node-renderer__row',
      'rst__row',
      'node-renderer__row',
      {
        'node-renderer__root-row': isRoot,
        'node-renderer__node-row': isNode,
        'node-renderer__response-row': isResponse,
        'node-renderer__link-row': isLink,
      },
      (isActiveNode || (!isAnyNodeActive && wasPreviousActiveNode)) && {
        'node-renderer__root-row--active': isRoot,
        'node-renderer__node-row--active': isNode,
        'node-renderer__response-row--active': isResponse,
        'node-renderer__link-row--active': isLink,
      },
      isLandingPadActive && 'conversation-node-renderer__row--drop-target',
      isLandingPadActive && !canDrop && 'conversation-node-renderer__row--drop-target-invalid',
      isSearchMatch && 'rst__rowSearchMatch',
      isSearchFocus && 'rst__rowSearchFocus',
      rowDirectionClass,
      className,
    );

    let handle;
    if (canNodeBeDragged) {
      if (typeof node.children === 'function' && node.expanded) {
        // Show a loading symbol on the handle when the children are expanded
        //  and yet still defined by a function (a callback to fetch the children)
        handle = (
          <div className="rst__loadingHandle">
            <div className="rst__loadingCircle">
              {/* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment */}
              {[...new Array(12)].map((_, index) => (
                <div
                  // eslint-disable-next-line react/no-array-index-key
                  key={index}
                  className={classnames('rst__loadingCirclePoint', rowDirectionClass)}
                />
              ))}
            </div>
          </div>
        );
      } else {
        // Show the handle used to initiate a drag-and-drop
        handle = connectDragSource(
          <div className={moveHandleClasses} data-comment={rowCommentTooltip || undefined}>
            {rowCommentTooltip && (
              <>
                <span className="node-renderer__comment-corner" />
                <span className="node-renderer__comment-tooltip">{rowCommentTooltip}</span>
              </>
            )}
            {getMoveHandleIcon(isRoot, isNode, isResponse)}
          </div>,
          {
            dropEffect: 'copy',
          },
        );
      }
    }

    let buttonStyle: { left?: number; right?: number } = { left: -0.5 * scaffoldBlockPxWidth };
    if (rowDirection === 'rtl') {
      buttonStyle = { right: -0.5 * scaffoldBlockPxWidth };
    }

    const coreStyle: { color: string; fontSize: string; paddingRight?: string } = {
      color: isBaseCore ? '#2f71d4' : '#f75d00',
      fontSize: '18px',
      paddingRight: '8px',
    };

    const logicStyle: { color: string; fontSize: string; paddingRight?: string } = {
      color: isResponse ? 'white' : '#2f71d4',
      fontSize: '18px',
    };

    if (nodeTitle && typeof nodeTitle === 'string' && nodeTitle.length > 0) {
      logicStyle.paddingRight = '8px';
    }

    const actionsIconStyle = {
      ...logicStyle,
    };

    const responseContinueStyle = {
      ...logicStyle,
      transform: 'rotate(270deg)',
    };

    if ((!nodeTitle || (typeof nodeTitle === 'string' && nodeTitle.length <= 0)) && hasActions) {
      logicStyle.paddingRight = '8px';
    }

    const resolvedNodeTitle =
      typeof nodeTitle === 'function'
        ? nodeTitle({
            node,
            path,
            treeIndex,
          })
        : nodeTitle;
    const hasNodeTitle = typeof resolvedNodeTitle === 'string' && resolvedNodeTitle.length > 0;
    const speakerBadge = getPromptSpeakerBadge(storedNode, speakerProjectionByNodeId);
    const speakerBadgeClasses = classnames('node-renderer__speaker-badge', {
      'node-renderer__speaker-badge--multiple': speakerBadge?.variant === 'multiple',
    });
    const cameraBadge = storedNode ? cameraProjectionByNodeId?.get(getId(storedNode)) : null;
    const cameraBadgeClasses = classnames('node-renderer__camera-badge', {
      'node-renderer__camera-badge--multiple': cameraBadge?.variant === 'multiple',
      'node-renderer__camera-badge--hard-lock': cameraBadge?.variant === 'hardLock',
    });

    const rowContents = (
      <div
        onContextMenu={(event) => {
          nodeStore.setFocusedTreeNode(node);
          onNodeContextMenu({ event, contextMenuId, type: nodeType, parentId });
        }}
        className={rowContentsClasses}
        onClick={() => {
          const { id, type } = node;
          if (type === 'link') {
            const { linkId } = node;
            if (!linkId) throw Error(`Link has no link id. Link: ${node.title}`);

            const linkTreeIndex = nodeStore.getTreeIndex(linkId);

            if (linkTreeIndex == null) throw Error(`link tree index is not found for linkId ${linkId}`);

            const direction = linkTreeIndex < treeIndex ? 'up' : 'down';
            nodeStore.setActiveNode(linkId);
            nodeStore.initScrollToNode(linkId, direction);
          } else {
            if (!id) throw Error('id should be valid but it is not defined');
            nodeStore.setActiveNode(id);

            defer(() => {
              if (!nodeStore.isNodeVisible(id)) {
                const nodeTreeIndex = nodeStore.getTreeIndex(id);
                if (nodeTreeIndex == null) throw Error(`node tree index is not found for nodeId ${id}`);
                const direction = nodeTreeIndex < treeIndex ? 'up' : 'down';

                setTimeout(() => nodeStore.initScrollToNode(id, direction, undefined, true), 250);
              }
            });
          }
        }}
        onMouseEnter={() => !isContextMenuVisible && nodeStore.setFocusedTreeNode(node)}
      >
        {isLink && (
          <div className="node-renderer__link">
            <div className="node-renderer__link-row-icon">
              <LinkIcon />
            </div>

            {node.linkIndex != null && (
              <div className={labelClasses}>
                <span className={titleClasses}>{getTruncatedLinkText(nodeStore, node.linkIndex, 40)}</span>
              </div>
            )}
          </div>
        )}
        {!isLink && (
          <section>
            <div className="node-renderer__row-contents-logic">
              {isBaseCore && <ProfileOutlined style={coreStyle} />}
              {isIsolatedCore && <BranchesOutlined style={coreStyle} />}
              {hasConditions && (
                <Popover
                  classNames={{ root: 'node-renderer__logic-popover' }}
                  content={getConditionsTooltip(storedNode, operationDefinitions)}
                  mouseEnterDelay={0.35}
                  destroyOnHidden
                  trigger="hover"
                >
                  <QuestionCircleFilled style={logicStyle} />
                </Popover>
              )}
              {hasActions && (
                <Popover
                  classNames={{ root: 'node-renderer__logic-popover' }}
                  content={getActionsTooltipTitle(storedNode, isRoot, isNode, isResponse, operationDefinitions)}
                  mouseEnterDelay={0.35}
                  destroyOnHidden
                  trigger="hover"
                >
                  <RightCircleFilled style={actionsIconStyle} />
                </Popover>
              )}
              {!hasNodeTitle && (
                <EnterOutlined
                  className={classnames('node-renderer__continue-icon', {
                    'node-renderer__continue-icon--before-badge': speakerBadge || cameraBadge,
                  })}
                  style={responseContinueStyle}
                />
              )}
            </div>

            <div className={labelClasses}>
              <span className="node-renderer__title-strip">
                {speakerBadge && (
                  <Tooltip title={speakerBadge.title} mouseEnterDelay={0.35}>
                    <span className={speakerBadgeClasses}>{speakerBadge.label}</span>
                  </Tooltip>
                )}
                {cameraBadge && (
                  <Tooltip title={cameraBadge.title} mouseEnterDelay={0.35}>
                    <span className={cameraBadgeClasses}>
                      {cameraBadge.variant !== 'multiple' && <LockOutlined />}
                      <VideoCameraOutlined />
                      <span className="node-renderer__camera-badge-label">{cameraBadge.label}</span>
                    </span>
                  </Tooltip>
                )}
                <span className={titleClasses}>{resolvedNodeTitle}</span>
              </span>

              {nodeSubtitle && (
                <span className="rst__rowSubtitle">
                  {typeof nodeSubtitle === 'function'
                    ? nodeSubtitle({
                        node,
                        path,
                        treeIndex,
                      })
                    : nodeSubtitle}
                </span>
              )}
            </div>

            <div className="rst__rowToolbar">
              {buttons.map((btn, index) => (
                <div
                  key={index} // eslint-disable-line react/no-array-index-key
                  className="rst__toolbarButton"
                >
                  {btn}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    );

    const [spacerLeftPosition, setSpacerLeftPosition] = useState<number>(0);
    const maxTreeHorPos = nodeStore.getMaxTreeHorizontalNodePosition();
    useEffect(() => {
      if (nodeRef.current) {
        const parentElement = nodeRef.current.parentElement;
        if (parentElement) {
          setSpacerLeftPosition(nodeStore.getMaxTreeHorizontalNodePosition() - nodeRef.current.offsetLeft);
        }
      }
    }, [maxTreeHorPos, nodeRef.current]);

    return (
      <div
        ref={nodeRef}
        className="conversation-node-renderer"
        style={{
          height: '100%',
          ...style,
        }}
        data-node-id={node.id}
        {...otherProps}
      >
        <div className="conversation-node-renderer__node-content">
          {scaffoldLines.map((line) => (
            <span
              key={line.key}
              className={classnames(
                'conversation-node-renderer__scaffold-line',
                `conversation-node-renderer__scaffold-line--${line.kind}`,
              )}
              style={{ left: line.left }}
            />
          ))}
          {(scaffoldLines.length > 0 || showRootConnector) && (
            <span className="conversation-node-renderer__scaffold-horizontal" style={{ left: -0.5 * scaffoldBlockPxWidth }} />
          )}

          {toggleChildrenVisibility && hasVisibleChildren && (
            <div>
            <button
              type="button"
              aria-label={node.expanded ? 'Collapse' : 'Expand'}
              className={classnames(
                'conversation-node-renderer__toggle-button',
                node.expanded ? 'rst__collapseButton' : 'rst__expandButton',
                rowDirectionClass,
              )}
              style={buttonStyle}
              onClick={() => {
                const isNodeExpanded = nodeStore.isNodeExpanded(node.id);

                toggleChildrenVisibility({
                  node,
                  path,
                  treeIndex,
                });

                nodeStore.setNodeExpansion(node.id, !isNodeExpanded);
              }}
            />

            {node.expanded && !isDragging && (
              <div
                style={{ width: scaffoldBlockPxWidth }}
                className={classnames('conversation-node-renderer__line-children', 'rst__lineChildren', rowDirectionClass)}
              />
            )}
            </div>
          )}

          <div className={classnames('conversation-node-renderer__row-wrapper', 'rst__rowWrapper', rowDirectionClass)} style={{ display: 'inline-block' }}>
          {/* Set the row preview to be used during drag and drop */}
          {connectDragPreview(
            <div
              className={rowClasses}
              style={{
                opacity: isDraggedDescendant
                  ? 0.5
                  : activeNodeId == null || isActiveNode || isHoveringOver
                  ? 1
                  : colourConfig.dialogueNodeTree.nonActiveOpacity,
                boxShadow: isActiveNode || (!isAnyNodeActive && wasPreviousActiveNode) || isHoveringOver ? hoverActiveBoxShadowStyle : undefined,
              }}
              onMouseEnter={() => setIsHoveringOver(true)}
              onMouseLeave={() => setIsHoveringOver(false)}
            >
              {handle}

              {rowContents}
            </div>,
          )}
          </div>

          <div className="faker" style={{ position: 'absolute', display: 'inline-block', visibility: 'hidden', left: spacerLeftPosition }}>
          spacer
          </div>
        </div>
      </div>
    );
  },
);
