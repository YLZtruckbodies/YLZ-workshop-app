import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name: string
      role: string
      color: string
      access: string[]
      canAdvance: boolean
      canEdit: boolean
      fullAdmin: boolean
      defaultScreen: string
      section: string | null
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: string
    color: string
    access: string[]
    canAdvance: boolean
    canEdit: boolean
    fullAdmin: boolean
    defaultScreen: string
    section: string | null
  }
}
