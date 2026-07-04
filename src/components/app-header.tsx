import { Link, useNavigate } from '@tanstack/react-router'
import { authClient } from '#/lib/auth-client'
import ThemeToggle from './ThemeToggle'

const navItems = [
  { name: '+ Nuevo caso', to: '/nuevo-caso' as const },
  { name: 'NNA', to: '/nna' as const },
  { name: 'Familiares', to: '/familiar' as const },
]

export default function AppHeader() {
  const { data: session } = authClient.useSession()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await authClient.signOut()
    navigate({ to: '/login' })
  }

  return (
    <header className="border-b border-[var(--line)] bg-[var(--header-bg)] backdrop-blur">
      <div className="mx-auto flex h-12 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-5">
          <Link to="/" className="text-sm font-semibold text-[var(--sea-ink)] no-underline">
            SW Mejor Niñez
          </Link>
          {session?.user && (
            <nav className="flex items-center gap-4">
              {navItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="nav-link text-sm"
                  activeProps={{ className: 'is-active' }}
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          )}
        </div>
        <div className="flex items-center gap-3">
          {session?.user && (
            <>
              <span className="text-xs text-[var(--sea-ink-soft)]">
                {session.user.name || session.user.email}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="demo-button-secondary demo-button text-xs"
              >
                Cerrar sesión
              </button>
            </>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
