import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import MessageComposer from './MessageComposer.vue';

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

  it('disables input when requested', async () => {
    const wrapper = mount(MessageComposer, {
      props: { disabled: true }
    });

    const textarea = wrapper.find('textarea');
    const button = wrapper.find('.send-btn');

    expect(textarea.attributes('disabled')).toBeDefined();
    expect(button.attributes('disabled')).toBeDefined();
  });
});
