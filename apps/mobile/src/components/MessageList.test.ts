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
});
