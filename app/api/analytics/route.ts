import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Analytics is aggregate stats — fine to cache for 5 min. Was force-dynamic
// before, which made every dashboard load hit the DB with 3 separate
// full-table scans (see groupBy refactor below).
export const revalidate = 300;

export async function GET() {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Total patients
    const totalPatients = await db.lead.count();

    // Patients this month
    const thisMonthPatients = await db.lead.count({
      where: { createdAt: { gte: thirtyDaysAgo } },
    });

    // Patients last 90 days
    const last90DaysPatients = await db.lead.count({
      where: { createdAt: { gte: ninetyDaysAgo } },
    });

    // By status
    const ipdCount = await db.lead.count({
      where: { patientStatus: "IPD" },
    });
    const opdCount = await db.lead.count({
      where: { patientStatus: "OPD" },
    });

    // By gender
    const maleCount = await db.lead.count({
      where: { gender: "Male" },
    });
    const femaleCount = await db.lead.count({
      where: { gender: "Female" },
    });

    // Top cities — was doing findMany over the entire lead collection then
    // counting in JS, which scanned every row and allocated O(N) JS memory.
    // groupBy pushes the aggregation into MongoDB itself and returns just
    // the (city, count) tuples we need.
    const cityGroups = await db.lead.groupBy({
      by: ["cities"],
      _count: { _all: true },
      where: { cities: { not: null } },
    });
    const topCities = cityGroups
      .map((g) => ({ city: (g.cities || "").trim(), count: g._count._all }))
      .filter((g) => g.city.length > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    // Top surgeries — same pattern as topCities above. Was scanning the
    // whole lead collection a second time; now a single grouped query.
    const surgeryGroups = await db.lead.groupBy({
      by: ["surgery"],
      _count: { _all: true },
      where: { surgery: { not: null } },
    });
    const topSurgeries = surgeryGroups
      .map((g) => ({ surgery: (g.surgery || "").trim(), count: g._count._all }))
      .filter((g) => g.surgery.length > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Monthly trend (last 12 months)
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const trendLeads = await db.lead.findMany({
      where: { createdAt: { gte: twelveMonthsAgo } },
      select: { createdAt: true },
    });
    const monthlyTrend: Record<string, number> = {};
    for (const l of trendLeads) {
      if (!l.createdAt) continue;
      const key = `${l.createdAt.getFullYear()}-${String(l.createdAt.getMonth() + 1).padStart(2, "0")}`;
      monthlyTrend[key] = (monthlyTrend[key] || 0) + 1;
    }
    const trend = Object.entries(monthlyTrend)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, count]) => ({ month, count }));

    // Content stats
    const [totalBlogs, totalAchievements, totalEvents, totalContacts] =
      await Promise.all([
        db.blogs.count(),
        db.achievement.count(),
        db.event.count(),
        db.contactUs.count(),
      ]);

    return NextResponse.json({
      totalPatients,
      thisMonthPatients,
      last90DaysPatients,
      ipdCount,
      opdCount,
      maleCount,
      femaleCount,
      topCities,
      topSurgeries,
      trend,
      totalBlogs,
      totalAchievements,
      totalEvents,
      totalContacts,
    });
  } catch (error) {
    console.error("[ANALYTICS]", error);
    return NextResponse.json({
      totalPatients: 0,
      thisMonthPatients: 0,
      last90DaysPatients: 0,
      ipdCount: 0,
      opdCount: 0,
      maleCount: 0,
      femaleCount: 0,
      topCities: [],
      topSurgeries: [],
      trend: [],
      totalBlogs: 0,
      totalAchievements: 0,
      totalEvents: 0,
      totalContacts: 0,
    });
  }
}
