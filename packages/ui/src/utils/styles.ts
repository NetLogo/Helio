export function cssVariable(variable: string, value: string | number) {
  if (typeof variable !== 'string' || !variable.startsWith('--')) {
    throw new Error('CSS variable must start with "--"');
  }
  return { [variable]: value } as React.CSSProperties;
}

export function maybeCSSVariable(variable: string, value?: string | number) {
  if (value === undefined) {
    return {};
  }
  return cssVariable(variable, value);
}
