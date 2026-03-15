import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import AuthPanel from './AuthPanel.vue';

describe('AuthPanel.vue', () => {
  it('emits normalized register payloads', async () => {
    const wrapper = mount(AuthPanel, {
      props: {
        error: '',
        loading: false
      }
    });

    await wrapper.findAll('button')[1].trigger('click');
    const inputs = wrapper.findAll('input');

    await inputs[0].setValue('  Aim.Test  ');
    await inputs[1].setValue('supersecurepassword');
    await inputs[2].setValue('supersecurepassword');
    await inputs[3].setValue(' penthouse-alpha ');
    await inputs[4].setValue(true);

    await wrapper.find('form').trigger('submit.prevent');

    expect(wrapper.emitted('register')).toEqual([['aim.test', 'supersecurepassword', 'PENTHOUSE-ALPHA']]);
  });

  it('blocks register until the test notice is acknowledged', async () => {
    const wrapper = mount(AuthPanel, {
      props: {
        error: '',
        loading: false
      }
    });

    await wrapper.findAll('button')[1].trigger('click');
    const inputs = wrapper.findAll('input');

    await inputs[0].setValue('aim.test');
    await inputs[1].setValue('supersecurepassword');
    await inputs[2].setValue('supersecurepassword');
    await inputs[3].setValue('PENTHOUSE-ALPHA');

    await wrapper.find('form').trigger('submit.prevent');

    expect(wrapper.emitted('register')).toBeFalsy();
    expect(wrapper.text()).toContain('acknowledge the current test notice');
  });

  it('blocks mismatched password confirmation in reset mode', async () => {
    const wrapper = mount(AuthPanel, {
      props: {
        error: '',
        loading: false
      }
    });

    await wrapper.findAll('button')[2].trigger('click');
    const inputs = wrapper.findAll('input');

    await inputs[0].setValue('aimtest');
    await inputs[1].setValue('brandnewpassword');
    await inputs[2].setValue('differentpassword');
    await inputs[3].setValue('ABCD-EFGH-JKLM-NPQR');

    await wrapper.find('form').trigger('submit.prevent');

    expect(wrapper.emitted('reset-password')).toBeFalsy();
    expect(wrapper.text()).toContain('Password confirmation does not match');
  });

  it('emits normalized reset payloads', async () => {
    const wrapper = mount(AuthPanel, {
      props: {
        error: '',
        loading: false
      }
    });

    await wrapper.findAll('button')[2].trigger('click');
    const inputs = wrapper.findAll('input');

    await inputs[0].setValue('  AIMTEST ');
    await inputs[1].setValue('brandnewpassword');
    await inputs[2].setValue('brandnewpassword');
    await inputs[3].setValue('abcd-efgh-jklm-npqr');

    await wrapper.find('form').trigger('submit.prevent');

    expect(wrapper.emitted('reset-password')).toEqual([['aimtest', 'ABCDEFGHJKLMNPQR', 'brandnewpassword']]);
  });
});
