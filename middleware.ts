export { default } from 'next-auth/middleware'
export const config = {
  // Exclude these prefixes from the auth middleware.
  // - api/auth: NextAuth's own endpoints
  // - api/campaigns/send-chunk: internal continuation endpoint, auth is
  //   enforced inside the route via CAMPAIGN_INTERNAL_SECRET so cross-
  //   request self-fetches from /api/campaigns/send-now can reach it
  // - api/campaigns/run-scheduled: scheduled-send trigger called by daily
  //   cron via self-fetch (no session cookie). Auth enforced inside via
  //   CAMPAIGN_INTERNAL_SECRET. Unique prefix to avoid colliding with
  //   send-now / send-chunk above.
  // - api/campaigns/pulse: bearer-authed heartbeat called by an external
  //   cron-style pinger (cron-job.org, UptimeRobot, etc.) every 1-2 min
  //   so SCHEDULED campaigns fire and stalled SENDING chains resume even
  //   when no admin browser is open. Auth enforced inside via
  //   CAMPAIGN_INTERNAL_SECRET.
  // - api/cron: Vercel-scheduled crons; protect via CRON_SECRET inside route
  matcher: [
    '/((?!api/auth|api/campaigns/send-chunk|api/campaigns/run-scheduled|api/campaigns/resume-stalled|api/campaigns/pulse|api/cron|api/whatsapp/webhook|sign-in|_next/static|_next/image|favicon.ico|images/wa-headers).*)',
  ],
}
