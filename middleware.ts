export { default } from 'next-auth/middleware'
export const config = {
  // Exclude these prefixes from the auth middleware.
  // - api/auth: NextAuth's own endpoints
  // - api/campaigns/send-chunk: internal continuation endpoint, auth is
  //   enforced inside the route via CAMPAIGN_INTERNAL_SECRET so cross-
  //   request self-fetches from /api/campaigns/send-now can reach it
  // - api/cron: Vercel-scheduled crons; protect via CRON_SECRET inside route
  matcher: [
    '/((?!api/auth|api/campaigns/send-chunk|api/cron|api/whatsapp/webhook|sign-in|_next/static|_next/image|favicon.ico|images/wa-headers).*)',
  ],
}
