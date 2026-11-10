import { describe, it, expect } from 'vitest'
import { escolherFormato } from './gravador'

describe('formato do áudio', () => {
  it('prefere webm com opus', () => {
    expect(escolherFormato(() => true)).toEqual({ mime: 'audio/webm;codecs=opus', ext: 'webm' })
  })
  it('sem webm usa mp4 (iPhone)', () => {
    expect(escolherFormato((t) => t === 'audio/mp4')).toEqual({ mime: 'audio/mp4', ext: 'm4a' })
  })
  it('sem nenhum devolve vazio', () => {
    expect(escolherFormato(() => false)).toBe(null)
  })
})
