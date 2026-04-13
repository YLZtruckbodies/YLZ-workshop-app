import { AuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'PIN Login',
      credentials: {
        userId: { label: 'User ID', type: 'text' },
        pin: { label: 'PIN', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.userId || !credentials?.pin) return null

        const user = await prisma.user.findUnique({
          where: { id: credentials.userId },
        })
        if (!user) return null

        const valid = await bcrypt.compare(credentials.pin, user.pin)
        if (!valid) return null

        return {
          id: user.id,
          name: user.name,
          role: user.role,
          color: user.color,
          access: user.access,
          canAdvance: user.canAdvance,
          canEdit: user.canEdit,
          fullAdmin: user.fullAdmin,
          defaultScreen: user.defaultScreen,
          section: user.section,
        } as any
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.color = (user as any).color
        token.access = (user as any).access
        token.canAdvance = (user as any).canAdvance
        token.canEdit = (user as any).canEdit
        token.fullAdmin = (user as any).fullAdmin
        token.defaultScreen = (user as any).defaultScreen
        token.section = (user as any).section
      } else if (token.id) {
        // Refresh user data from DB on every request
        const fresh = await prisma.user.findUnique({ where: { id: token.id as string } })
        if (fresh) {
          token.access = fresh.access
          token.role = fresh.role
          token.canAdvance = fresh.canAdvance
          token.canEdit = fresh.canEdit
          token.fullAdmin = fresh.fullAdmin
          token.defaultScreen = fresh.defaultScreen
          token.section = fresh.section
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id
        ;(session.user as any).role = token.role
        ;(session.user as any).color = token.color
        ;(session.user as any).access = token.access
        ;(session.user as any).canAdvance = token.canAdvance
        ;(session.user as any).canEdit = token.canEdit
        ;(session.user as any).fullAdmin = token.fullAdmin
        ;(session.user as any).defaultScreen = token.defaultScreen
        ;(session.user as any).section = token.section
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
}
