export class Html {
  constructor(readonly value: string) {}
  toString(): string {
    return this.value;
  }
}

export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

type Interpolation = Html | string | number | null | undefined | false | Interpolation[];

function renderInterpolation(value: Interpolation): string {
  if (value === null || value === undefined || value === false) return '';
  if (value instanceof Html) return value.value;
  if (Array.isArray(value)) return value.map(renderInterpolation).join('');
  return escapeHtml(String(value));
}

// Plain strings are escaped. Only values already wrapped in Html pass through untouched.
export function html(strings: TemplateStringsArray, ...values: Interpolation[]): Html {
  const joined = strings.reduce((result, part, index) => result + part + renderInterpolation(values[index]), '');
  return new Html(joined);
}

export const raw = (markup: string): Html => new Html(markup);
