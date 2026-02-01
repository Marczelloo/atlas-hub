import { describe, it, expect } from 'vitest';
import { parseFilters, parseOrder, parseSelect } from './query-parser.js';

describe('parseFilters', () => {
  it('parses eq filter', () => {
    const filters = parseFilters({ 'eq.id': '123' });
    expect(filters).toEqual([{ column: 'id', operator: 'eq', value: '123' }]);
  });

  it('parses multiple filters', () => {
    const filters = parseFilters({
      'eq.status': 'active',
      'gt.age': '18',
    });
    expect(filters).toHaveLength(2);
    expect(filters).toContainEqual({ column: 'status', operator: 'eq', value: 'active' });
    expect(filters).toContainEqual({ column: 'age', operator: 'gt', value: '18' });
  });

  it('parses in filter as array', () => {
    const filters = parseFilters({ 'in.role': 'admin,user,guest' });
    expect(filters).toEqual([
      { column: 'role', operator: 'in', value: ['admin', 'user', 'guest'] },
    ]);
  });

  it('ignores non-filter keys', () => {
    const filters = parseFilters({
      'eq.id': '123',
      select: 'id,name',
      limit: '10',
    });
    expect(filters).toEqual([{ column: 'id', operator: 'eq', value: '123' }]);
  });
});

describe('parseOrder', () => {
  it('parses asc order', () => {
    const order = parseOrder('created_at.asc');
    expect(order).toEqual({ column: 'created_at', direction: 'asc' });
  });

  it('parses desc order', () => {
    const order = parseOrder('updated_at.desc');
    expect(order).toEqual({ column: 'updated_at', direction: 'desc' });
  });

  it('returns undefined for invalid order', () => {
    expect(parseOrder('invalid')).toBeUndefined();
    expect(parseOrder('col.invalid')).toBeUndefined();
    expect(parseOrder(undefined)).toBeUndefined();
  });
});

describe('parseSelect', () => {
  it('returns * for empty or * input', () => {
    expect(parseSelect(undefined)).toBe('*');
    expect(parseSelect('*')).toBe('*');
  });

  it('parses comma-separated columns', () => {
    expect(parseSelect('id,name,email')).toEqual(['id', 'name', 'email']);
  });

  it('trims whitespace', () => {
    expect(parseSelect(' id , name , email ')).toEqual(['id', 'name', 'email']);
  });
});
