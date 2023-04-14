/* eslint-disable no-else-return */
import React from 'react';
import PropTypes from 'prop-types';
import { observer } from 'mobx-react';
import { Input, AutoComplete } from 'antd';

function EditableInput({ value, options, onChange, optionLabelProp, valueLabel }) {
  const isAutocomplete = !!options;
  const conditionalProps = {};
  let displayValueLabel = valueLabel;

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

  if (isAutocomplete) {
    if (value !== null && value !== undefined) conditionalProps.defaultValue = value;
    if (optionLabelProp) conditionalProps.optionLabelProp = optionLabelProp;

    if (!displayValueLabel) {
      displayValueLabel = options.find((option) => {
        if (option.value === value) return true;
        if (Number(option.value) === value) return true;
        return false;
      });
      if (displayValueLabel && displayValueLabel.text) displayValueLabel = displayValueLabel.text;
      if (!displayValueLabel) {
        valueLabelStyle.color = '#ff6666';
      }
    }

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
        {optionLabelProp && <span style={valueLabelStyle}>{displayValueLabel ? `(${displayValueLabel})` : 'Invalid'}</span>}
      </section>
    );
  }

  return (
    <Input
      style={style}
      value={value}
      onChange={(event) => {
        onChange(event.target.value);
      }}
    />
  );
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

export const ObservingEditableInput = observer(EditableInput);
