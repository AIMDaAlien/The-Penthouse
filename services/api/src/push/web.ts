import webPush from 'web-push';
import { env } from '../config/env.js';

export function configureWebPush() {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return false;
  webPush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
  return true;
}

export async function sendWebPushForNewMessage() {
  if (!configureWebPush()) return;
}
