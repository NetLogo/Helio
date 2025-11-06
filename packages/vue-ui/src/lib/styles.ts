export type CSSLengthUnit = '%' | 'em' | 'px' | 'rem' | 'vh' | 'vw'

export type CSSSize = `${number}${CSSLengthUnit}` | `calc(${string})` | CSSVariable

export type CSSVariable = `--${string}`
export function cssVariable(variable: CSSVariable, value: number | string): Record<string, number | string> {
  if (typeof variable !== 'string' || !variable.startsWith('--')) {
    throw new Error('CSS variable must start with "--"')
  }
  return { [variable]: value }
}
export function maybeCSSVariable(variable: CSSVariable, value?: number | string): Record<string, number | string> {
  if (value === undefined) {
    return {}
  }
  return cssVariable(variable, value)
}
