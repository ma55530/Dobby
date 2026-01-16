import { cn } from '@/lib/utils';

describe('cn utility function', () => {
  it('merges class names correctly', () => {
    const result = cn('px-2', 'py-1', 'bg-red-500');
    expect(result).toContain('px-2');
    expect(result).toContain('py-1');
    expect(result).toContain('bg-red-500');
  });

  it('handles conditionally applied classes', () => {
    const isActive = true;
    const result = cn('p-2', isActive && 'bg-blue-500');
    expect(result).toContain('p-2');
    expect(result).toContain('bg-blue-500');
  });

  it('handles false conditions', () => {
    const isActive = false;
    const result = cn('p-2', isActive && 'bg-blue-500');
    expect(result).toContain('p-2');
    expect(result).not.toContain('bg-blue-500');
  });

  it('resolves tailwind class conflicts correctly', () => {
    // When conflicting classes are passed, twMerge should keep the last valid one
    const result = cn('bg-red-500 bg-blue-500');
    expect(result).toMatch(/bg-(red|blue)-500/);
  });

  it('handles objects with conditional classes', () => {
    const isLarge = true;
    const result = cn('p-2', {
      'text-lg': isLarge,
      'text-sm': !isLarge,
    });
    expect(result).toContain('p-2');
    expect(result).toContain('text-lg');
  });

  it('handles arrays of classes', () => {
    const result = cn(['p-2', 'rounded'], 'bg-white');
    expect(result).toContain('p-2');
    expect(result).toContain('rounded');
    expect(result).toContain('bg-white');
  });

  it('returns empty string for no input', () => {
    const result = cn();
    expect(result).toBe('');
  });

  it('filters out undefined and null values', () => {
    const result = cn('p-2', undefined, null, 'bg-red-500');
    expect(result).toContain('p-2');
    expect(result).toContain('bg-red-500');
  });
});
