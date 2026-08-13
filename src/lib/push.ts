import webpush from "web-push";
import { prisma } from "./prisma";

const configured =
  !!process.env.VAPID_PRIVATE_KEY &&
  !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
  !!process.env.VAPID_SUBJECT;

if (configured) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
}

interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

async function sendToSubscription(
  sub: { id: number; endpoint: string; p256dh: string; auth: string },
  payload: PushPayload
) {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload)
    );
  } catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    // 404/410 mean the browser/OS has invalidated this subscription (e.g.
    // the app was uninstalled) — clean it up so we stop wasting sends on it.
    if (statusCode === 404 || statusCode === 410) {
      await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
    } else {
      console.error("push send failed:", statusCode, (err as Error).message);
    }
  }
}

export async function sendPushToUsers(userIds: number[], payload: PushPayload) {
  if (!configured || userIds.length === 0) return;
  const subs = await prisma.pushSubscription.findMany({
    where: { userId: { in: userIds } },
  });
  await Promise.all(subs.map((sub) => sendToSubscription(sub, payload)));
}

export async function sendPushToAdmins(payload: PushPayload, excludeUserId?: number) {
  if (!configured) return;
  const admins = await prisma.user.findMany({
    where: { role: "admin", isActive: true, id: excludeUserId ? { not: excludeUserId } : undefined },
    select: { id: true },
  });
  await sendPushToUsers(admins.map((a) => a.id), payload);
}
