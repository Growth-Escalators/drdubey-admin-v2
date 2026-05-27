"use client";

import { useEffect } from "react";
import AdminLayout from "@/components/admin/layout/AdminLayout";
import PageTransition from "@/components/admin/layout/PageTransition";

// Global campaign tick. Polls /api/campaigns/tick every 30s from any
// admin page so:
//   - SCHEDULED campaigns fire on time without anyone keeping the
//     /admin/campaigns tab open (Vercel Hobby's cron is daily-only).
//   - SENDING campaigns whose chunk chain died on a serverless shutdown
//     get re-poked within 60-90s, so a Send-Now blast actually finishes
//     even if the admin is browsing patients/billing/etc.
//
// The endpoint is session-protected and a no-op when there's nothing
// to do, so the cost of polling is negligible.
function CampaignTick() {
  useEffect(() => {
    const tick = () => {
      fetch("/api/campaigns/tick", { method: "POST" }).catch(() => {});
    };
    tick(); // fire one immediately on mount
    const t = setInterval(tick, 30000);
    return () => clearInterval(t);
  }, []);
  return null;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminLayout>
      <CampaignTick />
      <PageTransition>{children}</PageTransition>
    </AdminLayout>
  );
}
