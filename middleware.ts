import { withAuth } from 'next-auth/middleware'

export default withAuth({
  pages: {
    signIn: '/login',
  },
})

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/tracker/:path*',
    '/keithschedule/:path*',
    '/sections/:path*',
    '/timesheet/:path*',
    '/production/:path*',
    '/jobs/:path*',
    '/reports/:path*',
    '/analytics/:path*',
    '/floor/:path*',
    '/qa/:path*',
    '/notifications/:path*',
    '/coldform/:path*',
    '/cashflow/:path*',
    '/configure/:path*',
    '/api/deliveries/:path*',
    '/api/jobs/:path*',
    '/api/workers/:path*',
    '/api/timesheets/:path*',
    // Note: /api/users is NOT protected here because the login page needs it unauthenticated
    '/api/notes/:path*',
    '/api/files/:path*',
    '/api/stats/:path*',
    '/api/tarps/:path*',
    '/api/coldform/:path*',
    '/api/monday/:path*',
  ],
}
