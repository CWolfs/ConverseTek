import React from 'react';
import { observer } from 'mobx-react';
import { Select } from 'antd';

const { Option } = Select;

type Props = {
  value: string;
  options: string[] | { key: string }[];
  placeholder: string;
  style: object;
  onChange: () => void;
};

function EditableSelect({ value, options, placeholder, style = {}, onChange }: Props) {
  const conditionalProps: { defaultValue?: string } = {};
  if (value) conditionalProps.defaultValue = value;

  return (
    <Select {...conditionalProps} style={style || { width: 230 }} placeholder={placeholder} onChange={onChange} dropdownMatchSelectWidth={false}>
      {options.map((option) => {
        if (typeof option === 'string') {
          return <Option key={option}>{option}</Option>;
        } else {
          return <Option key={option.key}>{option.key}</Option>;
        }
      })}
    </Select>
  );
}

export const ObservingEditableSelect = observer(EditableSelect);
