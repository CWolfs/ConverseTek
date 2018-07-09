import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { observer } from 'mobx-react';
import { Input, AutoComplete } from 'antd';

@observer
class EditableInput extends Component {
  render() {
    const { value, options, onChange } = this.props;

    const isAutocomplete = !!options;
    const conditionalProps = {};

    const style = {
      width: '275px',
    };

    if (isAutocomplete) {
      if (value) conditionalProps.defaultValue = value;

      return (
        <AutoComplete
          {...conditionalProps}
          style={style}
          dataSource={options}
          filterOption={(inputValue, option) =>
            option.props.children.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1}
          onChange={onChange}
        />
      );
    }

    if (value) conditionalProps.value = value;

    return (
      <Input
        style={style}
        value={value}
        onChange={(event) => { onChange(event.target.value); }}
      />
    );
  }
}

EditableInput.defaultProps = {
  value: null,
  options: null,
};

EditableInput.propTypes = {
  value: PropTypes.any,
  options: PropTypes.array,
  onChange: PropTypes.func.isRequired,
};

export default EditableInput;
