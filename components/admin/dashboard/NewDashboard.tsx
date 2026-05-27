"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface DashboardStats {
  totalPatients: number;
  thisWeekPatients: number;
  totalBlogs: number;
  publishedBlogs: number;
  totalAchievements: number;
  followUpsDueToday: number;
  overdueFollowUps: number;
  recentContacts: any[];
  recentPatients: any[];
}

export default function NewDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial fetch + refresh every 60s. Previously fetched once on mount
    // and never again, so dashboard stats (patient count, follow-ups due,
    // recent contacts) stayed stale until a manual page reload. 60s matches
    // the cache window on /api/dashboard/stats (see route.ts revalidate),
    // so the client and server stay in sync.
    const load = () =>
      fetch("/api/dashboard/stats")
        .then((r) => r.json())
        .then((data) => {
          setStats(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  const statCards = [
    {
      label: "Total Patients",
      value: stats.totalPatients.toLocaleString(),
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-200",
    },
    {
      label: "This Week's Patients",
      value: stats.thisWeekPatients.toString(),
      color: "text-green-600",
      bg: "bg-green-50",
      border: "border-green-200",
    },
    {
      label: "Published Blogs",
      value: `${stats.publishedBlogs}/${stats.totalBlogs}`,
      color: "text-purple-600",
      bg: "bg-purple-50",
      border: "border-purple-200",
    },
    {
      label: "Achievements",
      value: stats.totalAchievements.toString(),
      color: "text-orange-600",
      bg: "bg-orange-50",
      border: "border-orange-200",
    },
    {
      label: "Follow-Ups Due Today",
      value: stats.followUpsDueToday.toString(),
      color: "text-red-600",
      bg: "bg-red-50",
      border: "border-red-200",
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={`${card.bg} rounded-xl p-5 border ${card.border}`}
          >
            <p className="text-xs font-medium text-gray-500 mb-2">
              {card.label}
            </p>
            <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/addpatient"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            + Add Patient
          </Link>
          <Link
            href="/admin/blogs"
            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
          >
            + New Blog
          </Link>
          <Link
            href="/admin/achievements"
            className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors"
          >
            + Add Achievement
          </Link>
          <Link
            href="/admin/appointment"
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
          >
            View Appointments
          </Link>
          <Link
            href="/admin/tokens"
            className="px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm font-medium hover:bg-cyan-700 transition-colors"
          >
            OPD Tokens
          </Link>
          <Link
            href="/admin/followups"
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
          >
            Follow-Ups {stats.overdueFollowUps > 0 ? `(${stats.overdueFollowUps})` : ""}
          </Link>
          <Link
            href="/admin/billing"
            className="px-4 py-2 bg-gray-700 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Billing
          </Link>
        </div>
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Patients */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">
              Recent Patients
            </h3>
            <Link
              href="/admin/patients"
              className="text-xs text-blue-600 hover:underline"
            >
              View all
            </Link>
          </div>
          {stats.recentPatients.length === 0 ? (
            <p className="text-sm text-gray-400">No recent patients</p>
          ) : (
            <div className="space-y-3">
              {stats.recentPatients.map((p: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center justify-between pb-3 border-b border-gray-50 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {p.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {p.phone} &middot; {p.cities || "N/A"}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      p.patientStatus === "IPD"
                        ? "bg-blue-50 text-blue-700"
                        : "bg-green-50 text-green-700"
                    }`}
                  >
                    {p.patientStatus || "OPD"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Contact Submissions */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Recent Enquiries
          </h3>
          {stats.recentContacts.length === 0 ? (
            <p className="text-sm text-gray-400">No recent enquiries</p>
          ) : (
            <div className="space-y-3">
              {stats.recentContacts.map((c: any, i: number) => (
                <div
                  key={i}
                  className="pb-3 border-b border-gray-50 last:border-0"
                >
                  <p className="text-sm font-medium text-gray-900">{c.name}</p>
                  <p className="text-xs text-gray-500 mb-1">{c.email}</p>
                  <p className="text-xs text-gray-600 line-clamp-2">
                    {c.message}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
