import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { observer } from 'mobx-react';
import { Icon } from 'antd';
import { ContextMenuProvider } from 'react-contexify';

import { isDescendant } from '../../../utils/tree-data-utils';
import { detectType } from '../../../utils/node-utils';

import { LinkIcon } from '../../Svg';

import './ConverseTekNodeRenderer.css';

/* eslint-disable jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */
const ConverseTekNodeRenderer = observer(({
  nodeStore,
  activeNodeId,
  scaffoldBlockPxWidth,
  toggleChildrenVisibility,
  connectDragPreview,
  connectDragSource,
  isDragging,
  canDrop,
  canDrag,
  node,
  title,
  subtitle,
  draggedNode,
  path,
  treeIndex,
  isSearchMatch,
  isSearchFocus,
  buttons,
  className,
  style,
  didDrop,
  treeId,
  isOver, // Not needed, but preserved for other renderers
  parentNode, // Needed for dndManager
  rowDirection,
  ...otherProps
}) => {
  const nodeSubtitle = subtitle || node.subtitle;
  const rowDirectionClass = rowDirection === 'rtl' ? 'rst__rtl' : null;
  const isActiveNode = (activeNodeId === node.id);
  const storedNode = nodeStore.getNode(node.id);
  const { type: nodeType } = node;

  const canNodeBeDragged = !(node.canDrag === false);

  const { actions, conditions } = storedNode || { actions: null, conditions: null };
  const hasActions = !!actions;
  const hasConditions = !!conditions;

  const isDraggedDescendant = draggedNode && isDescendant(draggedNode, node);
  const isLandingPadActive = !didDrop && isDragging;

  const {
    isRoot,
    isNode,
    isResponse,
    isLink,
  } = detectType(nodeType);

  const contextMenuId = node.id || Math.random().toString();
  const { parentId } = node;

  let nodeTitle = '';
  if (storedNode === null || storedNode === undefined) {
    nodeTitle = title || node.title;
  } else {
    nodeTitle = storedNode.text || storedNode.responseText;
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
    isActiveNode && ({
      'node-renderer__root-row--active': isRoot,
      'node-renderer__node-row--active': isNode,
      'node-renderer__response-row--active': isResponse,
      'node-renderer__link-row--active': isLink,
    }),
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
            {[...new Array(12)].map((_, index) => (
              <div
                // eslint-disable-next-line react/no-array-index-key
                key={index}
                className={classnames(
                  'rst__loadingCirclePoint',
                  rowDirectionClass,
                )}
              />
            ))}
          </div>
        </div>
      );
    } else {
      // Show the handle used to initiate a drag-and-drop
      handle = connectDragSource(<div className={moveHandleClasses}>{isRoot && <Icon type="ant-design" style={{ color: 'white', fontSize: '20px' }} />}</div>, {
        dropEffect: 'copy',
      });
    }
  }

  let buttonStyle = { left: -0.5 * scaffoldBlockPxWidth };
  if (rowDirection === 'rtl') {
    buttonStyle = { right: -0.5 * scaffoldBlockPxWidth };
  }

  const logicStyle = {
    color: (isResponse) ? 'white' : '#2f71d4',
    fontSize: '18px',
  };

  if (nodeTitle && nodeTitle.length > 0) { 
    logicStyle.paddingRight = '8px';
  }

  const actionsIconStyle = {
    ...logicStyle,
  };

  if ((!nodeTitle || (nodeTitle.length <= 0)) && hasActions) {
    logicStyle.paddingRight = '8px';
  }

  const rawRowContents = (
    <div
      className={rowContentsClasses}
      onClick={() => nodeStore.setActiveNode(node.id, node.type)}
      onMouseEnter={() => nodeStore.setFocusedNode(node)}
    >
      {isLink && <div className="node-renderer__link-row-icon"><LinkIcon /></div>}
      {!isLink && (
      <section>
        <div className="node-renderer__row-contents-logic">
          {hasConditions && <Icon type="question-circle" style={logicStyle} />}
          {hasActions && <Icon type="right-circle" style={actionsIconStyle} />}
        </div>

        <div className={labelClasses}>
          <span className={titleClasses}>
            {typeof nodeTitle === 'function'
              ? nodeTitle({
                  node,
                  path,
                  treeIndex,
                })
              : nodeTitle}
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

  const menuWrappedRowContents = (
    <ContextMenuProvider id="dialog-context-menu" data={{ id: contextMenuId, type: nodeType, parentId }}>
      {rawRowContents}
    </ContextMenuProvider>
  );

  // Prob. don't need this anymore
  const rowContents = menuWrappedRowContents;

  return (
    <div style={{ height: '100%' }} {...otherProps}>
      {toggleChildrenVisibility &&
        node.children &&
        (node.children.length > 0 || typeof node.children === 'function') && (
          <div>
            <button
              type="button"
              aria-label={node.expanded ? 'Collapse' : 'Expand'}
              className={classnames(
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

            {node.expanded &&
              !isDragging && (
                <div
                  style={{ width: scaffoldBlockPxWidth }}
                  className={classnames(
                    'rst__lineChildren',
                    rowDirectionClass,
                  )}
                />
              )}
          </div>
        )}

      <div className={classnames('rst__rowWrapper', rowDirectionClass)}>
        {/* Set the row preview to be used during drag and drop */}
        {connectDragPreview((
          <div
            className={rowClasses}
            style={{
              opacity: isDraggedDescendant ? 0.5 : 1,
              ...style,
            }}
          >
            {handle}

            {rowContents}
          </div>
        ))}
      </div>
    </div>
  );
});

ConverseTekNodeRenderer.defaultProps = {
  activeNodeId: null,
  isSearchMatch: false,
  isSearchFocus: false,
  canDrag: false,
  toggleChildrenVisibility: null,
  buttons: [],
  className: '',
  style: {},
  parentNode: null,
  draggedNode: null,
  canDrop: false,
  title: null,
  subtitle: null,
  rowDirection: 'ltr',
};

ConverseTekNodeRenderer.propTypes = {
  nodeStore: PropTypes.object.isRequired,
  activeNodeId: PropTypes.string,
  node: PropTypes.shape({}).isRequired,
  title: PropTypes.oneOfType([PropTypes.func, PropTypes.node]),
  subtitle: PropTypes.oneOfType([PropTypes.func, PropTypes.node]),
  path: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number])).isRequired,
  treeIndex: PropTypes.number.isRequired,
  treeId: PropTypes.string.isRequired,
  isSearchMatch: PropTypes.bool,
  isSearchFocus: PropTypes.bool,
  canDrag: PropTypes.bool,
  scaffoldBlockPxWidth: PropTypes.number.isRequired,
  toggleChildrenVisibility: PropTypes.func,
  buttons: PropTypes.arrayOf(PropTypes.node),
  className: PropTypes.string,
  style: PropTypes.shape({}),

  // Drag and drop API functions
  // Drag source
  connectDragPreview: PropTypes.func.isRequired,
  connectDragSource: PropTypes.func.isRequired,
  parentNode: PropTypes.shape({}), // Needed for dndManager
  isDragging: PropTypes.bool.isRequired,
  didDrop: PropTypes.bool.isRequired,
  draggedNode: PropTypes.shape({}),
  // Drop target
  isOver: PropTypes.bool.isRequired,
  canDrop: PropTypes.bool,

  // rtl support
  rowDirection: PropTypes.string,
};

export default ConverseTekNodeRenderer;
