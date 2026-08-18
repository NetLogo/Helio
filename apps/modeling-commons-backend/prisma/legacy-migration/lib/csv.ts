export function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  let started = false;

  for (let i = 0; i < input.length; i++) {
    const c = input[i];

    if (quoted) {
      if (c !== '"') {
        field += c;
      } else if (input[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        quoted = false;
      }
      continue;
    }

    if (c === '"') {
      quoted = true;
      started = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
      started = true;
    } else if (c === '\n') {
      if (started) {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
        started = false;
      }
    } else if (c !== '\r') {
      field += c;
      started = true;
    }
  }

  if (started) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}
