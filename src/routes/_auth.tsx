import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { getSession } from '#/lib/auth-functions'

export const Route = createFileRoute('/_auth')({
  beforeLoad: async () => {
    const session = await getSession()
    if (!session) throw redirect({ to: '/login' })
  },
  component: AuthLayout,
})

function AuthLayout() {
  return <Outlet />
}
