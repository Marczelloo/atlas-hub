import type { FilterOperator, ParsedFilter, ParsedOrder } from '@atlashub/shared';

const FILTER_OPERATORS: FilterOperator[] = [
  'eq',
  'neq',
  'lt',
  'lte',
  'gt',
  'gte',
  'like',
  'ilike',
  'in',
];

export function parseFilters(query: Record<string, string | undefined>): ParsedFilter[] {
  const filters: ParsedFilter[] = [];

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue;

    // Check if key matches pattern: operator.column
    for (const op of FILTER_OPERATORS) {
      if (key.startsWith(`${op}.`)) {
        const column = key.slice(op.length + 1);
        if (column) {
          if (op === 'in') {
            // Parse comma-separated values
            filters.push({
              column,
              operator: op,
              value: value.split(',').map((v) => v.trim()),
            });
          } else {
            filters.push({
              column,
              operator: op,
              value,
            });
          }
        }
        break;
      }
    }
  }

  return filters;
}

export function parseOrder(orderStr: string | undefined): ParsedOrder | undefined {
  if (!orderStr) return undefined;

  // Format: column.asc or column.desc
  const parts = orderStr.split('.');
  if (parts.length !== 2) return undefined;

  const [column, direction] = parts;
  if (direction !== 'asc' && direction !== 'desc') return undefined;

  return { column, direction };
}

export function parseSelect(selectStr: string | undefined): string[] | '*' {
  if (!selectStr || selectStr === '*') return '*';
  return selectStr
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);
}
