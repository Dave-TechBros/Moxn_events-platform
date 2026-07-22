"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LogOut, User as UserIcon } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function ProfilePage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  async function onLogout() {
    await logout();
    router.push("/");
  }

  if (loading) return <Skeleton className="h-40 w-full rounded-lg" />;
  if (!user)
    return (
      <div className="mx-auto max-w-md py-8 text-center">
        <p className="text-muted-foreground">Sign in to view your profile.</p>
        <Button asChild className="mt-4 tap-target">
          <a href="/login">Sign in</a>
        </Button>
      </div>
    );

  const roleLabel = user.role.charAt(0) + user.role.slice(1).toLowerCase();

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
              <UserIcon className="h-7 w-7" />
            </div>
            <div>
              <p className="text-lg font-semibold">{user.name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
            <Badge variant="secondary" className="ml-auto">
              {roleLabel}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-2 border-t pt-4">
            {user.role === "ATTENDEE" && (
              <Button asChild variant="outline" className="tap-target">
                <a href="/my-events">My Events</a>
              </Button>
            )}
            {(user.role === "ORGANIZER" || user.role === "ADMIN") && (
              <Button asChild variant="outline" className="tap-target">
                <a href="/organizer/events">Manage events</a>
              </Button>
            )}
            {user.role === "ADMIN" && (
              <Button asChild variant="outline" className="tap-target">
                <a href="/admin">Admin</a>
              </Button>
            )}
            <Button
              variant="ghost"
              className="tap-target text-error"
              onClick={onLogout}
            >
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
