import { formatMana } from '../../src/logic/utils'

describe('utils unit tests', () => {
  test('formatMana should work', async () => {
    expect(formatMana('1000000000000000')).toBe('0.00')
    expect(formatMana('10000000000000000')).toBe('0.01')
    expect(formatMana('100000000000000000')).toBe('0.10')
    expect(formatMana('1000000000000000000')).toBe('1.00')
    expect(formatMana('3445600000000000000')).toBe('3.45')
    expect(formatMana('10000000000000000000')).toBe('10.00')

    // With 3 decimals
    expect(formatMana('1000000000000000', 3)).toBe('0.001')
    expect(formatMana('10000000000000000', 3)).toBe('0.010')
    expect(formatMana('100000000000000000', 3)).toBe('0.100')
    expect(formatMana('1000000000000000000', 3)).toBe('1.000')
    expect(formatMana('3445600000000000000', 3)).toBe('3.446')
    expect(formatMana('10000000000000000000', 3)).toBe('10.000')

    // Edge cases
    expect(formatMana('')).toBe('0.00')
    expect(formatMana(undefined, 3)).toBe('0.000')
  })
})
