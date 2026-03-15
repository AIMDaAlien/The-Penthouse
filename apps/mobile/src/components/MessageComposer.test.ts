import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import MessageComposer from './MessageComposer.vue';

afterEach(() => {
  vi.useRealTimers();
});

describe('MessageComposer.vue', () => {
  it('emits send event and clears draft on plain Enter', async () => {
    const wrapper = mount(MessageComposer, {
      props: { disabled: false }
    });

    const textarea = wrapper.find('textarea');
    await textarea.setValue('Hello world');
    
    // Trigger Enter key (without shift)
    await textarea.trigger('keydown.enter');

    // Should emit
    expect(wrapper.emitted('send')).toBeTruthy();
    expect(wrapper.emitted('send')![0]).toEqual(['Hello world']);
    
    // Should clear draft
    expect((textarea.element as HTMLTextAreaElement).value).toBe('');
  });

  it('does NOT emit send on Shift+Enter (inserts newline instead)', async () => {
    const wrapper = mount(MessageComposer, {
      props: { disabled: false }
    });

    const textarea = wrapper.find('textarea');
    await textarea.setValue('Line 1');
    
    // Trigger Shift+Enter
    await textarea.trigger('keydown.enter', { shiftKey: true });

    // Should NOT emit
    expect(wrapper.emitted('send')).toBeFalsy();
    
    // Draft should still be there
    expect((textarea.element as HTMLTextAreaElement).value).toBe('Line 1');
  });

  it('custom submit button triggers send', async () => {
    const wrapper = mount(MessageComposer, {
      props: { disabled: false }
    });

    const textarea = wrapper.find('textarea');
    await textarea.setValue('Click me');
    
    await wrapper.find('.send-btn').trigger('click');

    expect(wrapper.emitted('send')).toBeTruthy();
    expect(wrapper.emitted('send')![0]).toEqual(['Click me']);
    expect((textarea.element as HTMLTextAreaElement).value).toBe('');
  });

  it('enables send on the first visible Android-style input character', async () => {
    const wrapper = mount(MessageComposer, {
      props: { disabled: false }
    });

    const textarea = wrapper.find('textarea');
    const sendButton = wrapper.find('.send-btn');

    expect(sendButton.attributes('disabled')).toBeDefined();

    (textarea.element as HTMLTextAreaElement).value = 'h';
    await textarea.trigger('input');

    expect(wrapper.find('.send-btn').attributes('disabled')).toBeUndefined();
  });

  it('does not send empty messages', async () => {
    const wrapper = mount(MessageComposer, {
      props: { disabled: false }
    });

    const textarea = wrapper.find('textarea');
    
    // Set to only whitespace
    await textarea.setValue('   \n  ');
    await textarea.trigger('keydown.enter');

    expect(wrapper.emitted('send')).toBeFalsy();
  });

  it('does not send while IME composition is active', async () => {
    const wrapper = mount(MessageComposer, {
      props: { disabled: false }
    });

    const textarea = wrapper.find('textarea');
    await textarea.setValue('Drafting');
    await textarea.trigger('compositionstart');
    await textarea.trigger('keydown.enter');

    expect(wrapper.emitted('send')).toBeFalsy();

    await textarea.trigger('compositionend');
    await textarea.trigger('keydown.enter');
    expect(wrapper.emitted('send')![0]).toEqual(['Drafting']);
  });

  it('disables input when requested', async () => {
    const wrapper = mount(MessageComposer, {
      props: { disabled: true }
    });

    const textarea = wrapper.find('textarea');
    const button = wrapper.find('.send-btn');

    expect(textarea.attributes('disabled')).toBeDefined();
    expect(button.attributes('disabled')).toBeDefined();
  });

  it('emits typing lifecycle events while drafting', async () => {
    vi.useFakeTimers();

    const wrapper = mount(MessageComposer, {
      props: { disabled: false }
    });

    const textarea = wrapper.find('textarea');
    await textarea.setValue('Typing now');

    expect(wrapper.emitted('typing-start')).toBeTruthy();

    vi.advanceTimersByTime(4999);
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted('typing-stop')).toBeFalsy();

    vi.advanceTimersByTime(1);
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted('typing-stop')).toBeTruthy();
  });

  it('refreshes typing-start while typing continues so realtime typing state stays alive', async () => {
    vi.useFakeTimers();

    const wrapper = mount(MessageComposer, {
      props: { disabled: false }
    });

    const textarea = wrapper.find('textarea');
    await textarea.setValue('h');
    await textarea.trigger('compositionstart');
    await textarea.setValue('he');
    vi.advanceTimersByTime(2500);
    await textarea.setValue('hel');
    await textarea.trigger('compositionend');
    vi.advanceTimersByTime(4999);

    expect(wrapper.emitted('typing-start')).toHaveLength(2);
    expect(wrapper.emitted('typing-stop')).toBeFalsy();

    vi.advanceTimersByTime(1);
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted('typing-stop')).toHaveLength(1);
  });

  it('emits typing-stop when sending a drafted message', async () => {
    const wrapper = mount(MessageComposer, {
      props: { disabled: false }
    });

    const textarea = wrapper.find('textarea');
    await textarea.setValue('Clear on send');
    await wrapper.find('.send-btn').trigger('click');

    expect(wrapper.emitted('typing-start')).toBeTruthy();
    expect(wrapper.emitted('typing-stop')).toBeTruthy();
  });

  it('emits send-media when a file is selected', async () => {
    const wrapper = mount(MessageComposer, {
      props: { disabled: false }
    });

    const file = new File(['hello'], 'notes.txt', { type: 'text/plain' });
    const input = wrapper.find('input[type="file"]');

    Object.defineProperty(input.element, 'files', {
      configurable: true,
      value: [file]
    });

    await input.trigger('change');

    expect(wrapper.emitted('send-media')).toBeTruthy();
    expect(wrapper.emitted('send-media')![0]).toEqual([file]);
  });
});
