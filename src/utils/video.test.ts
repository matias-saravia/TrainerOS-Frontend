import { describe, expect, it } from 'vitest'
import { parseVideoUrl } from './video'

describe('parseVideoUrl', () => {
  it('treats empty input as no video', () => {
    expect(parseVideoUrl('').type).toBe('none')
    expect(parseVideoUrl(null).type).toBe('none')
    expect(parseVideoUrl('   ').type).toBe('none')
  })

  it.each([
    'https://www.youtube.com/watch?v=vcBig73ojpE',
    'https://youtu.be/vcBig73ojpE',
    'https://www.youtube.com/embed/vcBig73ojpE',
    'https://www.youtube.com/watch?list=abc&v=vcBig73ojpE',
  ])('recognizes the YouTube ID in %s', url => {
    const video = parseVideoUrl(url)
    expect(video.type).toBe('youtube')
    expect(video.embedUrl).toContain('vcBig73ojpE')
  })

  it('marks YouTube Shorts', () => {
    const video = parseVideoUrl('https://www.youtube.com/shorts/vcBig73ojpE')
    expect(video.type).toBe('youtube')
    expect(video.isShorts).toBe(true)
  })

  it('recognizes Vimeo', () => {
    expect(parseVideoUrl('https://vimeo.com/123456789').type).toBe('vimeo')
  })

  it('recognizes direct video files', () => {
    expect(parseVideoUrl('https://cdn.example.com/press.mp4').type).toBe('direct')
  })

  it('leaves other sites as an external link', () => {
    const video = parseVideoUrl('https://www.tiktok.com/@coach/video/1')
    expect(video.type).toBe('unsupported')
    expect(video.rawUrl).toContain('tiktok.com')
  })
})
