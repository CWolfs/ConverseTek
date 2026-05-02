import { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react';
import { Button } from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import classnames from 'classnames';

import type { DataStore } from 'stores/dataStore/data-store';
import type { DefStore } from 'stores/defStore/def-store';

import { getConversations, getDefinitions } from 'services/api';
import { useStore } from 'hooks/useStore';
import { Split } from 'components/Split';
import type { SplitHandleDoubleClickContext } from 'components/Split';

import { ConversationTree } from '../ConversationTree';
import { ConversationEditor } from '../ConversationEditor';
import { SplashScreen } from '../SplashScreen';

import './Conversations.css';

const Conversations = () => {
  const dataStore = useStore<DataStore>('data');
  const defStore = useStore<DefStore>('def');
  const conversationTreeDockRef = useRef<HTMLDivElement | null>(null);
  const conversationTreeContentRef = useRef<HTMLDivElement | null>(null);
  const [isConversationListOpen, setIsConversationListOpen] = useState(true);

  const { conversationAssets, activeConversationAsset } = dataStore;
  const { definitionCount } = defStore;

  useEffect(() => {
    if (definitionCount <= 0) void getDefinitions();
  }, [definitionCount]);

  useEffect(() => {
    if (definitionCount > 0 && conversationAssets.size <= 0) void getConversations();
  }, [conversationAssets.size, definitionCount]);

  const mainView = activeConversationAsset ? <ConversationEditor conversationAsset={activeConversationAsset} /> : <SplashScreen />;
  const conversationListToggleLabel = isConversationListOpen ? 'Close conversation list' : 'Open conversation list';

  const fitConversationListToContent = ({ containerSize, setPrimarySize }: SplitHandleDoubleClickContext) => {
    const treeDock = conversationTreeDockRef.current;
    const treeContent = conversationTreeContentRef.current;
    if (treeDock == null || treeContent == null) return;

    const treeElement = treeContent.querySelector<HTMLElement>('.ant-tree');
    if (treeElement == null) return;

    const measuredTree = treeElement.cloneNode(true) as HTMLElement;
    measuredTree.style.position = 'fixed';
    measuredTree.style.top = '0';
    measuredTree.style.left = '-10000px';
    measuredTree.style.width = 'max-content';
    measuredTree.style.minWidth = '0';
    measuredTree.style.height = 'auto';
    measuredTree.style.visibility = 'hidden';
    measuredTree.style.pointerEvents = 'none';

    document.body.appendChild(measuredTree);
    const contentWidth = Math.ceil(Math.max(measuredTree.scrollWidth, measuredTree.getBoundingClientRect().width));
    document.body.removeChild(measuredTree);

    if (contentWidth <= 0) return;

    const dockStyle = window.getComputedStyle(treeDock);
    const desiredWidth =
      contentWidth +
      Number.parseFloat(dockStyle.paddingLeft || '0') +
      Number.parseFloat(dockStyle.paddingRight || '0');

    setPrimarySize((desiredWidth / containerSize) * 100);
    setIsConversationListOpen(true);
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 1180px)');
    const updateConversationListMode = () => {
      setIsConversationListOpen(!mediaQuery.matches);
    };

    updateConversationListMode();
    mediaQuery.addEventListener('change', updateConversationListMode);

    return () => mediaQuery.removeEventListener('change', updateConversationListMode);
  }, []);

  return (
    <div className="conversations">
      <Split
        className="conversations__split"
        orientation="vertical"
        primaryCollapsed={!isConversationListOpen}
        primaryCollapsedSize="44px"
        initialPrimarySize="18%"
        minPrimarySize="8%"
        minSecondarySize="45%"
        onHandleDoubleClick={fitConversationListToContent}
      >
        <div className="conversations__tree">
          <div
            ref={conversationTreeDockRef}
            className={classnames('conversations__tree-dock', {
              'conversations__tree-dock--collapsed': !isConversationListOpen,
            })}
          >
            <div className="conversations__tree-dock-header">
              {isConversationListOpen && <div className="conversations__tree-dock-title">Conversations</div>}
              <Button
                aria-label={conversationListToggleLabel}
                className="conversations__dock-toggle button-secondary"
                type="primary"
                size="small"
                icon={isConversationListOpen ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
                onClick={() => setIsConversationListOpen((isOpen) => !isOpen)}
              />
            </div>
            {isConversationListOpen && (
              <div className="conversations__tree-dock-content" ref={conversationTreeContentRef}>
                <ConversationTree showTitle={false} />
              </div>
            )}
          </div>
        </div>
        <div className="conversations__main">{mainView}</div>
      </Split>
    </div>
  );
};

export const ObservingConversations = observer(Conversations);
