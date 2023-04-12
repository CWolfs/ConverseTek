import React from 'react';
import PropTypes from 'prop-types';
import { observer } from 'mobx-react';
import { Select } from 'antd';

const { Option } = Select;

function EditableSelect({ value, options, placeholder, style, onChange }) {
  const conditionalProps = {};
  if (value) conditionalProps.defaultValue = value;

  return (
    <Select
      {...conditionalProps}
      style={style || { width: 230 }}
      placeholder={placeholder}
      onChange={onChange}
      dropdownMatchSelectWidth={false}
    >
      {options.map((option) => (
        <Option key={option.Key || option}>{option.Key || option}</Option>
      ))}
    </Select>
  );
}

EditableSelect.defaultProps = {
  value: null,
  options: null,
  style: {},
};

EditableSelect.propTypes = {
  value: PropTypes.any,
  options: PropTypes.array,
  placeholder: PropTypes.string.isRequired,
  style: PropTypes.object,
  onChange: PropTypes.func.isRequired,
};

export const ObservingEditableSelect = observer(EditableSelect);
