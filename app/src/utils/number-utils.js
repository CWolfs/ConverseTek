export function tryParseInt(stringValue, defaultValue) {
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

export function tryParseFloat(stringValue, defaultValue) {
  let retValue = defaultValue;

  if (stringValue !== null) {
    if (stringValue.length > 0) {
      if (!Number.isNaN(stringValue)) {
        retValue = parseFloat(stringValue, 10);
      }
    }
  }

  return retValue;
}

export default {};
