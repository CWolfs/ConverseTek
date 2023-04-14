export function tryParseInt(stringValue: string, defaultValue: number): number {
  let retValue = defaultValue;
  if (stringValue !== null) {
    if (stringValue.length > 0) {
      if (!Number.isNaN(stringValue)) {
        retValue = parseInt(stringValue, 10);
      }
    }
  }

  return retValue;
}

export function tryParseFloat(stringValue: string, defaultValue: number): number {
  let retValue = defaultValue;

  if (stringValue !== null) {
    if (stringValue.length > 0) {
      if (!Number.isNaN(stringValue)) {
        retValue = parseFloat(stringValue);
      }
    }
  }

  return retValue;
}

export default {};
