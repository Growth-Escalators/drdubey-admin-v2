import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Cache for 60s — counters don't need to be sub-minute fresh, and this
// matches the dashboard component's own 60s polling interval. Was
// force-dynamic before, which made every dashboard load run 9 queries
// against MongoDB even when nothing had changed.
export const revalidate = 60;

export async function GET() {
  try {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [
      totalPatients,
      thisWeekPatients,
      totalBlogs,
      publishedBlogs,
      totalAchievements,
      followUpsDueToday,
      overdueFollowUps,
      recentContacts,
      recentPatients,
    ] = await Promise.all([
      db.lead.count(),
      db.lead.count({
        where: { createdAt: { gte: weekAgo } },
      }),
      db.blogs.count(),
      db.blogs.count({ where: { isPublished: true } }),
      db.achievement.count(),
      db.followUp.count({
        where: { dueDate: { gte: todayStart, lte: todayEnd }, status: "PENDING" },
      }),
      db.followUp.count({
        where: { dueDate: { lte: new Date() }, status: "PENDING" },
      }),
      db.contactUs.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      db.lead.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          name: true,
          phone: true,
          cities: true,
          patientStatus: true,
          createdAt: true,
        },
      }),
    ]);

    return NextResponse.json({
      totalPatients,
      thisWeekPatients,
      totalBlogs,
      publishedBlogs,
      totalAchievements,
      followUpsDueToday,
      overdueFollowUps,
      recentContacts,
      recentPatients,
    });
  } catch (error) {
    console.error("[DASHBOARD_STATS]", error);
    return NextResponse.json({
      totalPatients: 0,
      thisWeekPatients: 0,
      totalBlogs: 0,
      publishedBlogs: 0,
      totalAchievements: 0,
      followUpsDueToday: 0,
      overdueFollowUps: 0,
      recentContacts: [],
      recentPatients: [],
    });
  }
}
