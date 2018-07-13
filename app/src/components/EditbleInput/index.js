import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { observer } from 'mobx-react';
import { Input, AutoComplete } from 'antd';

@observer
class EditableInput extends Component {
  render() {
    const { value, options, onChange, optionLabelProp, valueLabel } = this.props;

    const isAutocomplete = !!options;
    const conditionalProps = {};

    const style = {
      width: '275px',
      display: 'inline-block',
      position: 'relative',
    };

    const valueLabelStyle = {
      position: 'absolute',
      right: '10px',
      color: '#2e9bff',
      zIndex: '1',
      top: '5px',
    };

    if (valueLabel === null) valueLabelStyle.color = '#ff6666';

    if (isAutocomplete) {
      if (value) conditionalProps.defaultValue = value;
      if (optionLabelProp) conditionalProps.optionLabelProp = optionLabelProp;

      return (
        <section style={style}>
          <AutoComplete
            {...conditionalProps}
            style={style}
            dataSource={options}
            filterOption={(inputValue, option) => {
              if (typeof inputValue === 'number') {
                return option.props.children.indexOf(inputValue) !== -1;
              } else if (typeof inputValue === 'string') {
                return option.props.children.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1;
              }
              return false;
            }}
            onChange={onChange}
          />
          {optionLabelProp && (
            <span style={valueLabelStyle}>{(valueLabel) ? `(${valueLabel})` : 'Invalid'}</span>
          )}
        </section>
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
  optionLabelProp: null,
  valueLabel: null,
};

EditableInput.propTypes = {
  value: PropTypes.any,
  options: PropTypes.array,
  onChange: PropTypes.func.isRequired,
  optionLabelProp: PropTypes.string,
  valueLabel: PropTypes.string,
};

export default EditableInput;
