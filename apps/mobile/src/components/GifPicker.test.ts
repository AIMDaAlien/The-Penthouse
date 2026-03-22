import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import GifPicker from './GifPicker.vue';
import * as http from '../services/http';

vi.mock('../services/http', () => ({
  getTrendingGifs: vi.fn(() => Promise.resolve({
    provider: 'klipy',
    results: [
      {
        id: 'klipy-image-1',
        provider: 'klipy',
        url: 'https://media.example/animated-klipy.gif',
        previewUrl: 'https://media.example/static-klipy.jpg',
        renderMode: 'image',
        title: 'Klipy Image GIF'
      },
      {
        id: 'giphy-image-1',
        provider: 'giphy',
        url: 'https://media.example/animated-giphy.gif',
        previewUrl: 'https://media.example/static-giphy.gif',
        renderMode: 'image',
        title: 'Giphy Image GIF'
      },
      {
        id: 'klipy-video-1',
        provider: 'klipy',
        url: 'https://media.example/animated-klipy.mp4',
        previewUrl: 'https://media.example/static-klipy-video.jpg',
        renderMode: 'video',
        title: 'Klipy Video GIF'
      }
    ]
  })),
  searchGifs: vi.fn(() => Promise.resolve({ provider: 'klipy', results: [] }))
}));

describe('GifPicker.vue media controls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses animated assets in the picker when animation is allowed', async () => {
    const wrapper = mount(GifPicker, {
      props: {
        visible: true,
        animateGifsAutomatically: true,
        reducedDataMode: false
      }
    });
    await flushPromises();

    const images = wrapper.findAll('.gif-tile img');
    expect(images[0].attributes('src')).toBe('https://media.example/animated-klipy.gif');
    expect(images[1].attributes('src')).toBe('https://media.example/animated-giphy.gif');
  });

  it('uses still previews instead of autoplaying when reduced data mode is on', async () => {
    const wrapper = mount(GifPicker, {
      props: {
        visible: true,
        animateGifsAutomatically: true,
        reducedDataMode: true
      }
    });
    await flushPromises();

    expect(wrapper.find('.gif-tile video').exists()).toBe(false);
    const images = wrapper.findAll('.gif-tile img');
    expect(images[0].attributes('src')).toBe('https://media.example/static-klipy.jpg');
    expect(images[1].attributes('src')).toBe('https://media.example/static-giphy.gif');
    expect(images[2].attributes('src')).toBe('https://media.example/static-klipy-video.jpg');
  });
});
