import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import MessageList from './MessageList.vue';

describe('MessageList.vue Delivery States', () => {
  const currentUserId = 'user-1';

  it('renders all four delivery states correctly', async () => {
    const messages = [
      {
        id: 'real-uuid',
        chatId: 'chat-1',
        senderId: 'user-1',
        content: 'Delivered msg',
        createdAt: new Date().toISOString()
      },
      {
        id: 'local_1',
        chatId: 'chat-1',
        senderId: 'user-1',
        content: 'Sending msg',
        createdAt: new Date().toISOString(),
        clientMessageId: 'cm-sending'
      },
      {
        id: 'local_2',
        chatId: 'chat-1',
        senderId: 'user-1',
        content: 'Queued msg',
        createdAt: new Date().toISOString(),
        clientMessageId: 'cm-queued'
      },
      {
        id: 'local_3',
        chatId: 'chat-1',
        senderId: 'user-1',
        content: 'Failed msg',
        createdAt: new Date().toISOString(),
        clientMessageId: 'cm-failed'
      }
    ];

    const wrapper = mount(MessageList, {
      props: {
        messages,
        currentUserId,
        queuedIds: ['cm-queued', 'cm-failed'], // Queued includes everything waiting
        failedIds: ['cm-failed'] // Failed is a subset of queued
      }
    });

    const bubbles = wrapper.findAll('.msg-bubble');
    // Vue list renders sorted order (reverse of what we passed in)
    // The component computes `[...props.messages].reverse()`
    // So order in DOM: [Failed msg, Queued msg, Sending msg, Delivered msg]
    
    // Bottom-up (Delivered is top in array, bottom in DOM)
    const failedBubble = bubbles[0];
    const queuedBubble = bubbles[1];
    const sendingBubble = bubbles[2];
    const deliveredBubble = bubbles[3];

    expect(failedBubble.text()).toContain('Failed msg');
    expect(failedBubble.find('.status-indicator.failed').exists()).toBe(true);
    expect(failedBubble.find('.status-indicator.failed').text()).toContain('❌');
    
    expect(queuedBubble.text()).toContain('Queued msg');
    expect(queuedBubble.find('.status-indicator.queued').exists()).toBe(true);
    expect(queuedBubble.find('.status-indicator.queued').text()).toContain('⏸️');

    expect(sendingBubble.text()).toContain('Sending msg');
    expect(sendingBubble.find('.status-indicator.sending').exists()).toBe(true);
    expect(sendingBubble.find('.status-indicator.sending').text()).toContain('⏳');

    expect(deliveredBubble.text()).toContain('Delivered msg');
    expect(deliveredBubble.find('.status-indicator.success').exists()).toBe(true);
    expect(deliveredBubble.find('.status-indicator.success').text()).toContain('✓');
  });

  it('emits retry when failed button is clicked', async () => {
    const wrapper = mount(MessageList, {
      props: {
        messages: [{
          id: 'local_1',
          chatId: 'chat-1',
          senderId: 'user-1',
          content: 'Failed msg',
          createdAt: new Date().toISOString(),
          clientMessageId: 'cm-failed-123'
        }],
        currentUserId,
        queuedIds: ['cm-failed-123'],
        failedIds: ['cm-failed-123']
      }
    });

    const retryBtn = wrapper.find('.retry-btn');
    await retryBtn.trigger('click');

    expect(wrapper.emitted('retry')).toBeTruthy();
    expect(wrapper.emitted('retry')![0]).toEqual(['cm-failed-123']);
  });

  it('renders senderUsername for received messages when available', () => {
    const wrapper = mount(MessageList, {
      props: {
        messages: [{
          id: 'real-uuid-2',
          chatId: 'chat-1',
          senderId: 'user-2',
          senderUsername: 'ryantest',
          content: 'hi there',
          createdAt: new Date().toISOString()
        }],
        currentUserId
      }
    });

    expect(wrapper.text()).toContain('ryantest');
    expect(wrapper.text()).not.toContain('user-2');
  });

  it('renders local latency for delivered sent messages when provided', () => {
    const wrapper = mount(MessageList, {
      props: {
        messages: [{
          id: 'real-uuid-lat',
          chatId: 'chat-1',
          senderId: 'user-1',
          content: 'latency sample',
          createdAt: new Date().toISOString(),
          clientMessageId: 'cm-lat'
        }],
        currentUserId,
        latencyByClientMessageId: {
          'cm-lat': 47
        }
      }
    });

    expect(wrapper.text()).toContain('47ms');
  });

  it('renders a seen indicator when a sent message has seenAt', () => {
    const wrapper = mount(MessageList, {
      props: {
        messages: [{
          id: 'real-uuid-seen',
          chatId: 'chat-1',
          senderId: 'user-1',
          content: 'seen message',
          createdAt: new Date().toISOString(),
          seenAt: new Date().toISOString()
        }],
        currentUserId
      }
    });

    expect(wrapper.find('.status-indicator.seen').exists()).toBe(true);
    expect(wrapper.find('.status-indicator.seen').text()).toContain('✓✓');
  });

  it('renders a typing indicator for active remote participants', () => {
    const wrapper = mount(MessageList, {
      props: {
        messages: [],
        currentUserId,
        typingMembers: [
          { userId: 'user-2', displayName: 'Ryan' }
        ]
      }
    });

    expect(wrapper.text()).toContain('Ryan is typing...');
    expect(wrapper.find('.typing-indicator').exists()).toBe(true);
  });

  it('renders inline image messages from metadata without file caption text', () => {
    const wrapper = mount(MessageList, {
      props: {
        messages: [{
          id: 'img-1',
          chatId: 'chat-1',
          senderId: 'user-1',
          content: 'photo.png',
          type: 'image',
          metadata: {
            url: '/uploads/photo.png',
            originalFileName: 'photo.png'
          },
          createdAt: new Date().toISOString()
        }],
        currentUserId
      }
    });

    expect(wrapper.find('.media-image').exists()).toBe(true);
    expect(wrapper.text()).not.toContain('photo.png');
  });

  it('renders gif messages without provider/title caption text', () => {
    const wrapper = mount(MessageList, {
      props: {
        messages: [{
          id: 'gif-1',
          chatId: 'chat-1',
          senderId: 'user-2',
          senderUsername: 'ryantest',
          content: 'Bobs Burgers GIF by Someone',
          type: 'gif',
          metadata: {
            url: 'https://media.example/full.gif',
            previewUrl: 'https://media.example/preview.gif',
            title: 'Bobs Burgers GIF by Someone'
          },
          createdAt: new Date().toISOString()
        }],
        currentUserId
      }
    });

    expect(wrapper.find('.media-image').exists()).toBe(true);
    expect(wrapper.text()).not.toContain('Bobs Burgers GIF by Someone');
  });

  it('opens an image viewer modal when an image bubble is tapped', async () => {
    const wrapper = mount(MessageList, {
      props: {
        messages: [{
          id: 'img-2',
          chatId: 'chat-1',
          senderId: 'user-1',
          content: 'photo.png',
          type: 'image',
          metadata: {
            url: '/uploads/photo.png',
            originalFileName: 'photo.png'
          },
          createdAt: new Date().toISOString()
        }],
        currentUserId
      }
    });

    await wrapper.find('.media-tile').trigger('click');

    expect(wrapper.find('.media-viewer').exists()).toBe(true);
    expect(wrapper.find('.viewer-image').attributes('src')).toContain('/uploads/photo.png');
  });

  it('closes the image viewer when Escape is pressed', async () => {
    const wrapper = mount(MessageList, {
      attachTo: document.body,
      props: {
        messages: [{
          id: 'img-esc',
          chatId: 'chat-1',
          senderId: 'user-1',
          content: 'photo.png',
          type: 'image',
          metadata: {
            url: '/uploads/photo.png',
            originalFileName: 'photo.png'
          },
          createdAt: new Date().toISOString()
        }],
        currentUserId
      }
    });

    await wrapper.find('.media-tile').trigger('click');
    expect(wrapper.find('.media-viewer').exists()).toBe(true);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await wrapper.vm.$nextTick();

    expect(wrapper.find('.media-viewer').exists()).toBe(false);
  });

  it('renders file attachments as linked cards', () => {
    const wrapper = mount(MessageList, {
      props: {
        messages: [{
          id: 'file-1',
          chatId: 'chat-1',
          senderId: 'user-2',
          senderUsername: 'ryantest',
          content: 'notes.txt',
          type: 'file',
          metadata: {
            url: '/uploads/notes.txt',
            originalFileName: 'notes.txt',
            contentType: 'text/plain'
          },
          createdAt: new Date().toISOString()
        }],
        currentUserId
      }
    });

    expect(wrapper.find('.file-card').exists()).toBe(true);
    expect(wrapper.text()).toContain('notes.txt');
    expect(wrapper.text()).toContain('text/plain');
  });
});
