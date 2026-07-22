"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Compass,
  Ticket,
  PlusCircle,
  ShieldCheck,
  User as UserIcon,
  LogOut,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const BRAND = "Moxn Eventra";

export function Nav() {
  const { user, loading, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();

  const links = React.useMemo(() => {
    const base = [{ href: "/", label: "Browse", icon: Compass }];
    if (user) {
      base.push({ href: "/my-events", label: "My Events", icon: Ticket });
    }
    if (user?.role === "ORGANIZER" || user?.role === "ADMIN") {
      base.push({ href: "/organizer/events", label: "Manage", icon: PlusCircle });
    }
    if (user?.role === "ADMIN") {
      base.push({ href: "/admin", label: "Admin", icon: ShieldCheck });
    }
    return base;
  }, [user]);

  async function onLogout() {
    await logout();
    router.push("/");
  }

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      {/* Desktop top nav */}
      <header className="sticky top-0 z-40 hidden border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:block">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-lg font-black text-primary-foreground">
              M
            </span>
            <span className="text-xl font-bold tracking-tight">{BRAND}</span>
          </Link>
          <nav className="flex items-center gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "tap-target inline-flex items-center gap-2 rounded-md px-3 text-base font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                  isActive(l.href) && "text-foreground"
                )}
              >
                <l.icon className="h-5 w-5" />
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {loading ? null : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="tap-target">
                    <UserIcon className="h-5 w-5" />
                    <span className="max-w-[10rem] truncate">{user.name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>
                    {user.name}
                    <div className="text-xs font-normal text-muted-foreground">
                      {user.role.charAt(0) + user.role.slice(1).toLowerCase()}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile">
                      <UserIcon className="mr-2 h-4 w-4" /> Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={onLogout}>
                    <LogOut className="mr-2 h-4 w-4" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button variant="ghost" asChild className="tap-target">
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button asChild className="tap-target">
                  <Link href="/register">Sign up</Link>
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="tap-target"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Toggle theme"
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile top bar (compact) */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/95 px-4 md:hidden">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-primary text-base font-black text-primary-foreground">
            M
          </span>
          <span className="text-lg font-bold tracking-tight">{BRAND}</span>
        </Link>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="tap-target"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
          {!loading &&
            (user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="tap-target">
                    <UserIcon className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{user.name}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile">
                      <UserIcon className="mr-2 h-4 w-4" /> Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={onLogout}>
                    <LogOut className="mr-2 h-4 w-4" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild size="sm" className="tap-target">
                <Link href="/login">Sign in</Link>
              </Button>
            ))}
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid border-t bg-background/95 backdrop-blur md:hidden"
        style={{ gridTemplateColumns: `repeat(${Math.min(links.length + (user ? 0 : 1), 5)}, 1fr)` }}>
        {links.slice(0, 4).map((l) => {
          const active = isActive(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "tap-target flex flex-col items-center justify-center gap-1 py-2 text-xs font-medium",
                active ? "text-primary" : "text-muted-foreground"
              )}
              aria-current={active ? "page" : undefined}
            >
              <l.icon className="h-6 w-6" />
              {l.label}
            </Link>
          );
        })}
        {!user &&
          links.length < 5 && (
            <Link
              href="/register"
              className="tap-target flex flex-col items-center justify-center gap-1 py-2 text-xs font-medium text-muted-foreground"
            >
              <PlusCircle className="h-6 w-6" />
              Sign up
            </Link>
          )}
      </nav>
    </>
  );
}
