import { describe, it, expect } from 'vitest';
import { buildWhereClause, buildOrderClause, buildSelectColumns } from './sql-builder.js';

describe('buildWhereClause', () => {
  it('returns empty for no filters', () => {
    const result = buildWhereClause([]);
    expect(result.clause).toBe('');
    expect(result.values).toEqual([]);
  });

  it('builds eq clause', () => {
    const result = buildWhereClause([{ column: 'id', operator: 'eq', value: '123' }]);
    expect(result.clause).toBe('WHERE "id" = $1');
    expect(result.values).toEqual(['123']);
  });

  it('builds multiple conditions with AND', () => {
    const result = buildWhereClause([
      { column: 'status', operator: 'eq', value: 'active' },
      { column: 'age', operator: 'gt', value: '18' },
    ]);
    expect(result.clause).toBe('WHERE "status" = $1 AND "age" > $2');
    expect(result.values).toEqual(['active', '18']);
  });

  it('builds IN clause with multiple values', () => {
    const result = buildWhereClause([{ column: 'role', operator: 'in', value: ['admin', 'user'] }]);
    expect(result.clause).toBe('WHERE "role" IN ($1, $2)');
    expect(result.values).toEqual(['admin', 'user']);
  });

  it('supports custom start param index', () => {
    const result = buildWhereClause([{ column: 'id', operator: 'eq', value: '123' }], 5);
    expect(result.clause).toBe('WHERE "id" = $5');
  });
});

describe('buildOrderClause', () => {
  it('returns empty for undefined', () => {
    expect(buildOrderClause(undefined)).toBe('');
  });

  it('builds ASC clause', () => {
    expect(buildOrderClause({ column: 'name', direction: 'asc' })).toBe('ORDER BY "name" ASC');
  });

  it('builds DESC clause', () => {
    expect(buildOrderClause({ column: 'created_at', direction: 'desc' })).toBe(
      'ORDER BY "created_at" DESC'
    );
  });
});

describe('buildSelectColumns', () => {
  it('returns * for * input', () => {
    expect(buildSelectColumns('*', ['id', 'name'])).toBe('*');
  });

  it('filters and quotes valid columns', () => {
    expect(buildSelectColumns(['id', 'name', 'invalid'], ['id', 'name', 'email'])).toBe(
      '"id", "name"'
    );
  });

  it('returns * if no valid columns', () => {
    expect(buildSelectColumns(['invalid'], ['id', 'name'])).toBe('*');
  });
});
