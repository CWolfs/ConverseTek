import React from 'react';
import PropTypes from 'prop-types';
import { ContextMenu, Item } from 'react-contexify';

import 'react-contexify/dist/ReactContexify.min.css';

import nodeStore from '../../stores/nodeStore';

const onAddClicked = ({ dataFromProvider }) => console.log(`clicked add ${dataFromProvider.id}`);

const onDeleteClicked = ({ dataFromProvider }) => nodeStore.deleteNodeCascadeById(dataFromProvider.id, dataFromProvider.type);

const DialogEditorContextMenu = ({ id }) => (
  <ContextMenu id={id} >
    <Item onClick={onAddClicked}>Add</Item>
    <Item onClick={onDeleteClicked}>Delete</Item>
  </ContextMenu>
);

DialogEditorContextMenu.propTypes = {
  id: PropTypes.string.isRequired,
};

export default DialogEditorContextMenu;
