/* eslint-disable no-else-return */
import React, { CSSProperties } from 'react';
import { observer } from 'mobx-react';
import { Input, AutoComplete } from 'antd';
import { SelectValue } from 'antd/lib/select';
import { DataSourceItemType } from 'antd/lib/auto-complete';

type Props = {
  value: string | null;
  options: ({ text: string; value: string | number } | string)[] | null;
  onChange: (value: SelectValue) => void;
  onBlur?: (value: SelectValue) => void;
  optionLabelProp?: string | null;
  valueLabel?: string | { text: string; value: string } | null;
};

function EditableInput({ value = null, options = null, onChange, onBlur, optionLabelProp = null, valueLabel = null }: Props) {
  const isAutocomplete = !!options;
  let displayValueLabel: string | { text: string; value: string | number } | null = valueLabel;
  const conditionalProps: {
    value?: string;
    optionLabelProp?: string;
  } = {};

  const style = {
    width: '275px',
    display: 'inline-block',
    position: 'relative',
  } as CSSProperties;

  const valueLabelStyle = {
    position: 'absolute',
    right: '10px',
    color: '#2e9bff',
    zIndex: '1',
    top: '5px',
  } as CSSProperties;

  if (isAutocomplete) {
    if (value !== null && value !== undefined) conditionalProps.value = value;
    if (optionLabelProp) conditionalProps.optionLabelProp = optionLabelProp;

    if (!displayValueLabel) {
      displayValueLabel =
        options.find((option: string | number | { text: string; value: string | number }): boolean => {
          if (typeof option === 'object' && 'value' in option) {
            if (option.value === value) return true;
            // if (Number(option.value) === value) return true;
          }
          return false;
        }) || null;

      if (displayValueLabel && typeof displayValueLabel === 'object' && 'text' in displayValueLabel) displayValueLabel = displayValueLabel.text;
      if (!displayValueLabel) {
        valueLabelStyle.color = '#ff6666';
      }
    }

    return (
      <section style={style}>
        <AutoComplete
          {...conditionalProps}
          style={style}
          dataSource={options as DataSourceItemType[]}
          filterOption={(inputValue, option) => {
            const autocompleteValueTitle = option.props.children as string; // Preset Def value strings: 'SimGameScope', 'SimGameFadeValues', 'DoesOrDoesNot', 'has', 'doesn't have' etc
            if (typeof inputValue === 'number') {
              return autocompleteValueTitle.indexOf(inputValue) !== -1;
            } else if (typeof inputValue === 'string') {
              return autocompleteValueTitle.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1;
            }

            return false;
          }}
          onChange={onChange}
          onBlur={onBlur}
        />
        {optionLabelProp && (
          <span style={valueLabelStyle}>
            {displayValueLabel ? `(${typeof displayValueLabel === 'object' ? displayValueLabel.text : displayValueLabel})` : 'Invalid'}
          </span>
        )}
      </section>
    );
  }

  return (
    <Input
      style={style}
      value={value || undefined}
      onChange={(event) => {
        onChange(event.target.value);
      }}
      onBlur={(event) => {
        onBlur?.(event.target.value);
      }}
    />
  );
}

export const ObservingEditableInput = observer(EditableInput);
