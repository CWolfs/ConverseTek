/* eslint-disable function-paren-newline */
/* eslint-disable indent */
import React from 'react';
import classnames from 'classnames';
import { observer } from 'mobx-react';
import { Icon } from 'antd';

import { OnNodeContextMenuProps } from '../DialogEditor';
import { PromptNodeType, ElementNodeType } from 'types';

import { isDescendant } from 'utils/tree-data-utils';
import { detectType } from 'utils/node-utils';

import { NodeStore } from 'stores/nodeStore/node-store';

import { LinkIcon } from '../../Svg';

import './ConverseTekNodeRenderer.css';

type NodeStateProps = {
  node: RSTNode;
  path: RSTPath;
  treeIndex: number;
};

type Props = {
  nodeStore: NodeStore;
  activeNodeId: string | null;
  onNodeContextMenu: (props: OnNodeContextMenuProps) => void;
  isContextMenuVisible: boolean;
  scaffoldBlockPxWidth: number;
  toggleChildrenVisibility: (({ node, path, treeIndex }: NodeStateProps) => void) | null;
  connectDragPreview: (element: JSX.Element) => void;
  connectDragSource: (element: JSX.Element, effect: { dropEffect: string }) => void;
  isDragging: boolean;
  canDrop: boolean;
  canDrag: boolean;
  node: RSTNode;
  title: ((nodeState: NodeStateProps) => string | JSX.Element) | JSX.Element | null;
  subtitle: ((nodeState: NodeStateProps) => string | JSX.Element) | JSX.Element | null;
  draggedNode: RSTNode | null;
  path: RSTPath;
  treeIndex: number;
  isSearchMatch: boolean;
  isSearchFocus: boolean;
  buttons: JSX.Element[];
  className: string;
  style: object;
  didDrop: boolean;
  treeId: string;
  isOver: boolean;
  parentNode: RSTNode | null;
  rowDirection: string;
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

/* eslint-disable jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */
export const ConverseTekNodeRenderer = observer(
  ({
    nodeStore,
    activeNodeId = null,
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
    ...otherProps
  }: Props) => {
    const nodeSubtitle = subtitle || node.subtitle;
    const rowDirectionClass = rowDirection === 'rtl' ? 'rst__rtl' : null;
    const isActiveNode = activeNodeId === node.id;
    const storedNode = nodeStore.getNode(node.id);
    const { type: nodeType } = node;
    const canNodeBeDragged = !(node.canDrag === false);

    const { hasActions, hasConditions } = hasActionsAndConditions(storedNode);
    const isDraggedDescendant = draggedNode && isDescendant(draggedNode, node);
    const isLandingPadActive = !didDrop && isDragging;

    const { isRoot, isNode, isResponse, isLink } = detectType(nodeType);

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

    const moveHandleClasses = classnames('rst__moveHandle', {
      'node-renderer__root-handle': isRoot,
      'node-renderer__node-handle': isNode,
      'node-renderer__response-handle': isResponse,
    });

    const labelClasses = classnames('rst__rowLabel', rowDirectionClass, {
      'node-renderer__root-label': isRoot,
      'node-renderer__node-label': isNode,
      'node-renderer__response-label': isResponse,
      'node-renderer__link-label': isLink,
    });

    const titleClasses = classnames('rst__rowTitle', node.subtitle && 'rst__rowTitleWithSubtitle', {
      'node-renderer__root-title': isRoot,
      'node-renderer__node-title': isNode,
      'node-renderer__response-title': isResponse,
    });

    const rowContentsClasses = classnames(
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
      'rst__row',
      'node-renderer__row',
      {
        'node-renderer__root-row': isRoot,
        'node-renderer__node-row': isNode,
        'node-renderer__response-row': isResponse,
        'node-renderer__link-row': isLink,
      },
      isActiveNode && {
        'node-renderer__root-row--active': isRoot,
        'node-renderer__node-row--active': isNode,
        'node-renderer__response-row--active': isResponse,
        'node-renderer__link-row--active': isLink,
      },
      isLandingPadActive && 'rst__rowLandingPad',
      isLandingPadActive && !canDrop && 'rst__rowCancelPad',
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
          <div className={moveHandleClasses}>{isRoot && <Icon type="ant-design" style={{ color: 'white', fontSize: '20px' }} />}</div>,
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
      fontSize: 22,
      paddingRight: 4,
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

            if (!linkTreeIndex) throw Error(`link tree index is not found for linkId ${linkId}`);

            const direction = linkTreeIndex < treeIndex ? 'up' : 'down';
            nodeStore.setActiveNode(linkId);
            nodeStore.scrollToNode(linkId, direction);
          } else {
            if (!id) throw Error('id should be valid but it is not defined');
            nodeStore.setActiveNode(id);
          }
        }}
        onMouseEnter={() => !isContextMenuVisible && nodeStore.setFocusedTreeNode(node)}
      >
        {isLink && (
          <div className="node-renderer__link-row-icon">
            <LinkIcon />
          </div>
        )}
        {!isLink && (
          <section>
            <div className="node-renderer__row-contents-logic">
              {hasConditions && <Icon type="question-circle" theme="filled" style={logicStyle} />}
              {hasActions && <Icon type="right-circle" theme="filled" style={actionsIconStyle} />}
              {!hasNodeTitle && <Icon type="enter" style={responseContinueStyle} />}
            </div>

            <div className={labelClasses}>
              <span className={titleClasses}>{resolvedNodeTitle}</span>

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

    return (
      <div style={{ height: '100%' }} data-node-id={node.id} {...otherProps}>
        {toggleChildrenVisibility && node.children && (node.children.length > 0 || typeof node.children === 'function') && (
          <div>
            <button
              type="button"
              aria-label={node.expanded ? 'Collapse' : 'Expand'}
              className={classnames(node.expanded ? 'rst__collapseButton' : 'rst__expandButton', rowDirectionClass)}
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
              <div style={{ width: scaffoldBlockPxWidth }} className={classnames('rst__lineChildren', rowDirectionClass)} />
            )}
          </div>
        )}

        <div className={classnames('rst__rowWrapper', rowDirectionClass)}>
          {/* Set the row preview to be used during drag and drop */}
          {connectDragPreview(
            <div
              className={rowClasses}
              style={{
                opacity: isDraggedDescendant ? 0.5 : 1,
                ...style,
              }}
            >
              {handle}

              {rowContents}
            </div>,
          )}
        </div>
      </div>
    );
  },
);
