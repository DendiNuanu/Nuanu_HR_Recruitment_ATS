import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import NotificationsClient from "./NotificationsClient";

export default async function NotificationsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const notifications = await prisma.notification.findMany({
    where: { userId: session.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <NotificationsClient
      notifications={notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        link: n.link ?? null,
        isRead: n.isRead,
        createdAt: n.createdAt.toISOString(),
      }))}
    />
  );
}
