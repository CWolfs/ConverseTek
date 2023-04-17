import React, { JSXElementConstructor, ReactElement } from 'react';
import { observer } from 'mobx-react';
import { Select } from 'antd';
import { SelectValue } from 'antd/lib/select';

const { Option } = Select;

type Props = {
  value: string | null;
  options: string[] | { key: string }[];
  placeholder: string;
  style?: object;
  onChange: (
    value: SelectValue,
    option: ReactElement<any, string | JSXElementConstructor<any>> | ReactElement<any, string | JSXElementConstructor<any>>[],
  ) => void;
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
