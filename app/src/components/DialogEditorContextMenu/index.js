import React from 'react';
import PropTypes from 'prop-types';
import { ContextMenu, Item } from 'react-contexify';

import 'react-contexify/dist/ReactContexify.min.css';

const onAddClicked = ({ event, ref, data, dataFromProvider }) => console.log(`clicked add ${dataFromProvider.id}`);

const onDeleteClicked = ({ event, ref, data, dataFromProvider }) => console.log(`clicked delete ${dataFromProvider.id}`);

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
