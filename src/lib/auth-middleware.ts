import { createMiddleware } from '@tanstack/react-start'
import { redirect } from '@tanstack/react-router'
import { getRequest } from '@tanstack/react-start/server'

import { auth } from '#/lib/auth'

export const requireAuth = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    const request = getRequest()
    const authSession = request
      ? await auth.api.getSession({ headers: request.headers })
      : null

    if (!authSession) {
      throw redirect({ to: '/login' })
    }

    return next({
      context: {
        user: authSession.user,
        session: authSession.session,
      },
    })
  },
)
