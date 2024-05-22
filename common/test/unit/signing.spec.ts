import { hasValidSignature, signUrl } from '../../src/signing'

describe('signatures', () => {
  const key = 'some-key'

  describe('signUrl', () => {
    test('should sign urls that have no params (it adds the ?)', async () => {
      expect(signUrl(key, 'https://decentraland.org')).toBe(
        'https://decentraland.org/?signature=d71dc2ffb3dfd202b270b9e28abf153a00b6c4f7b4f77329deac55c0879e1407'
      )
      expect(signUrl(key, 'https://decentraland.org/')).toBe(
        'https://decentraland.org/?signature=d71dc2ffb3dfd202b270b9e28abf153a00b6c4f7b4f77329deac55c0879e1407'
      )
    })

    test('should sign urls that have params (only appends signature)', async () => {
      expect(signUrl(key, 'https://decentraland.org?name=peter')).toBe(
        'https://decentraland.org/?name=peter&signature=6ddaf7cfc27cb01328be5528e73af0ec56377b034c932d59ffdc9c6d6314e761'
      )
      expect(signUrl(key, 'https://decentraland.org/?name=peter')).toBe(
        'https://decentraland.org/?name=peter&signature=6ddaf7cfc27cb01328be5528e73af0ec56377b034c932d59ffdc9c6d6314e761'
      )
    })

    test('should refuse signing urls that already have a signature param', async () => {
      expect(() =>
        signUrl(
          key,
          'https://decentraland.org/?signature=d71dc2ffb3dfd202b270b9e28abf153a00b6c4f7b4f77329deac55c0879e1407'
        )
      ).toThrow('"signature" is a reserved parameter when generating signed urls')
    })
  })

  describe('hasValidSignature', () => {
    test('should validate urls that have no params', async () => {
      expect(
        hasValidSignature(
          key,
          'https://decentraland.org/?signature=d71dc2ffb3dfd202b270b9e28abf153a00b6c4f7b4f77329deac55c0879e1407'
        )
      ).toBeTruthy()
    })

    test('should validate urls that have params', async () => {
      expect(
        hasValidSignature(
          key,
          'https://decentraland.org/?name=peter&signature=6ddaf7cfc27cb01328be5528e73af0ec56377b034c932d59ffdc9c6d6314e761'
        )
      ).toBeTruthy()
    })

    test('should return false if signature does not match the signed params', async () => {
      expect(
        hasValidSignature(
          key,
          'https://decentraland.org/?signature=6ddaf7cfc27cb01328be5528e73af0ec56377b034c932d59ffdc9c6d6314e761'
        )
      ).toBeFalsy()
    })

    test('should return false if signature does not match the signed params', async () => {
      expect(
        hasValidSignature(
          'other-key',
          'https://decentraland.org/?name=peter&signature=6ddaf7cfc27cb01328be5528e73af0ec56377b034c932d59ffdc9c6d6314e761'
        )
      ).toBeFalsy()
    })

    test('should return false if url has no signature', async () => {
      expect(hasValidSignature(key, 'https://decentraland.org/?name=peter')).toBeFalsy()
    })
  })
})
