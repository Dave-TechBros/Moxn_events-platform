"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";

type Cat = {
  id: string;
  name: string;
  slug: string;
  color: string;
  _count?: { events: number };
};

export function CategoriesManager({ initial }: { initial: Cat[] }) {
  const router = useRouter();
  const [cats, setCats] = React.useState(initial);
  const [busy, setBusy] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Cat | null>(null);
  const [form, setForm] = React.useState({ name: "", slug: "", color: "220 14% 50%" });

  React.useEffect(() => setCats(initial), [initial]);

  function openAdd() {
    setEditing(null);
    setForm({ name: "", slug: "", color: "243 75% 59%" });
    setDialogOpen(true);
  }
  function openEdit(c: Cat) {
    setEditing(c);
    setForm({ name: c.name, slug: c.slug, color: c.color });
    setDialogOpen(true);
  }

  function slugify(s: string) {
    return s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  async function save() {
    setBusy(true);
    try {
      const payload = {
        name: form.name,
        slug:
          editing?.slug === form.slug ? form.slug : slugify(form.slug || form.name),
        color: form.color,
      };
      const res = editing
        ? await fetch(`/api/categories/${editing.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/categories", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Save failed");
      toast.success(editing ? "Category updated." : "Category created.");
      setDialogOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(c: Cat) {
    if (c._count && c._count.events > 0) {
      toast.error("Reassign or delete this category's events first.");
      return;
    }
    if (!confirm(`Delete the category ${c.name}? This cannot be undone.`))
      return;
    const res = await fetch(`/api/categories/${c.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Category deleted.");
      router.refresh();
    } else {
      const d = await res.json();
      toast.error(d.error || "Delete failed");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {cats.length} categor{cats.length === 1 ? "y" : "ies"}
        </p>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="tap-target" onClick={openAdd}>
              <Plus className="h-4 w-4" /> Add category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editing ? "Edit category" : "New category"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="cname">Name</Label>
                <Input
                  id="cname"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cslug">Slug</Label>
                <Input
                  id="cslug"
                  value={form.slug}
                  placeholder={slugify(form.name) || "my-category"}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ccolor">Color (HSL like 243 75% 59%)</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={hslToHex(form.color)}
                    onChange={(e) =>
                      setForm({ ...form, color: hexToHsl(e.target.value) })
                    }
                    className="h-11 w-14 cursor-pointer rounded-md border"
                    aria-label="Pick color"
                  />
                  <Input
                    id="ccolor"
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                  />
                  <span
                    className="h-8 w-8 rounded-md border"
                    style={{ backgroundColor: `hsl(${form.color})` }}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost" className="tap-target">
                  Cancel
                </Button>
              </DialogClose>
              <Button
                className="tap-target"
                onClick={save}
                disabled={busy || form.name.trim().length < 1}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {cats.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between rounded-lg border bg-card p-3"
          >
            <div className="flex items-center gap-3">
              <span
                className="h-6 w-6 rounded-md border"
                style={{ backgroundColor: `hsl(${c.color})` }}
              />
              <div>
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground">
                  /{c.slug} · {c._count?.events ?? 0} events
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="tap-target"
                onClick={() => openEdit(c)}
                aria-label={`Edit ${c.name}`}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="tap-target text-error"
                onClick={() => remove(c)}
                aria-label={`Delete ${c.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function hslToHex(hsl: string): string {
  const m = hsl.match(/(\d+)\s+(\d+)%\s+(\d+)%/);
  if (!m) return "#000000";
  const h = +m[1] / 360;
  const s = +m[2] / 100;
  const l = +m[3] / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * c)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function hexToHsl(hex: string): string {
  const m = hex.replace("#", "");
  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16) / 255;
  const b = parseInt(m.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}
