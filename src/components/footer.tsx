"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth-provider";

export function Footer() {
  const { user, loading } = useAuth();

  return (
    <footer className="border-t bg-background">
      <div className="container flex flex-col items-center gap-4 py-8 md:flex-row md:justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-primary text-sm font-black text-primary-foreground">
            M
          </span>
          <span className="text-lg font-bold tracking-tight">Moxn Eventra</span>
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">Browse</Link>
          {loading ? null : user ? (
            <>
              <Link href="/profile" className="hover:text-foreground transition-colors">Profile</Link>
              {user.role === "ATTENDEE" && (
                <Link href="/my-events" className="hover:text-foreground transition-colors">My Events</Link>
              )}
              {(user.role === "ORGANIZER" || user.role === "ADMIN") && (
                <Link href="/organizer/events" className="hover:text-foreground transition-colors">Dashboard</Link>
              )}
              {user.role === "ADMIN" && (
                <Link href="/admin" className="hover:text-foreground transition-colors">Admin</Link>
              )}
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-foreground transition-colors">Sign in</Link>
              <Link href="/register" className="hover:text-foreground transition-colors">Sign up</Link>
            </>
          )}
        </nav>
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Moxn Eventra. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
