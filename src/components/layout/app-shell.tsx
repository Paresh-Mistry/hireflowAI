"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import * as Dropdown from "@radix-ui/react-dropdown-menu";
import { motion, useReducedMotion } from "motion/react";
import {
  BarChart3,
  BriefcaseBusiness,
  ChevronRight,
  Kanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import { Avatar } from "@/components/ui/primitives";
import { signOut } from "@/features/auth/actions";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/candidates", label: "Candidates", icon: Users },
  { href: "/jobs", label: "Jobs", icon: BriefcaseBusiness },
  { href: "/pipeline", label: "Pipeline", icon: Kanban },
  { href: "/ai-insights", label: "AI Insights", icon: Sparkles },
  { href: "/settings", label: "Settings", icon: Settings },
];

function Logo() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5 px-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-[9px] text-accent *:bg-accent/10">
        <BarChart3 className="h-6 w-6" />
      </span>
      <span className="text-[17px] font-extrabold tracking-tight text-white">HireFlow AI</span>
    </Link>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className="mt-8 flex flex-col gap-1">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`relative flex h-10 items-center gap-3 rounded-[10px] px-3 text-sm font-semibold transition-colors ${
              active ? "text-white" : "text-sidebar-ink hover:bg-white/5 hover:text-white"
            }`}
          >
            {active && (
              <motion.span
                layoutId="nav-active"
                className="absolute inset-0 rounded-[10px] bg-white/10"
                transition={{ duration: 0.2 }}
              />
            )}
            <Icon className="relative h-[18px] w-[18px]" />
            <span className="relative">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarBody({ name, role, onNavigate }: { name: string; role: string; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col px-3 py-5">
      <Logo />
      <NavList onNavigate={onNavigate} />
      <div className="mt-auto space-y-3">
        <div className="rounded-[10px] border border-white/10 px-3 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-sidebar-ink">Workspace</p>
          <p className="text-sm font-semibold text-white">HireFlow Demo Co.</p>
        </div>
        <div className="flex items-center gap-2.5 px-1">
          <Avatar name={name} size={32} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{name}</p>
            <p className="truncate text-xs capitalize text-sidebar-ink">{role.replace("_", " ")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function crumbs(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  const labelFor = (p: string) => NAV.find((n) => n.href === `/${p}`)?.label ?? (p === "new" ? "New" : "Details");
  return parts.map((p, i) => ({ label: labelFor(p), href: "/" + parts.slice(0, i + 1).join("/") }));
}

export function AppShell({
  name,
  role,
  children,
}: {
  name: string;
  role: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const searchRef = React.useRef<HTMLInputElement>(null);
  const reduce = useReducedMotion();

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const trail = crumbs(pathname);

  return (
    <div className="min-h-screen lg:pl-60">
      <a
        href="#main"
        className="sr-only z-[60] rounded-md bg-accent px-3 py-2 text-white focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to content
      </a>
      <aside className="fixed inset-y-0 left-0 hidden w-60 bg-sidebar lg:block">
        <SidebarBody name={name} role={role} />
      </aside>

      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-page/95 px-4 backdrop-blur sm:px-8">
        <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Trigger asChild>
            <button aria-label="Open navigation" className="rounded-md p-2 hover:bg-[#efede8] lg:hidden">
              <Menu className="h-5 w-5" />
            </button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-[#171923]/50" />
            <Dialog.Content className="fixed inset-y-0 left-0 z-50 w-64 bg-sidebar">
              <Dialog.Title className="sr-only">Navigation</Dialog.Title>
              <Dialog.Description className="sr-only">Main navigation menu</Dialog.Description>
              <SidebarBody name={name} role={role} onNavigate={() => setOpen(false)} />
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1 text-sm text-muted md:flex">
          {trail.map((c, i) => (
            <span key={c.href} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5" />}
              {i === trail.length - 1 ? (
                <span className="font-semibold text-ink">{c.label}</span>
              ) : (
                <Link href={c.href} className="hover:text-ink">
                  {c.label}
                </Link>
              )}
            </span>
          ))}
        </nav>

        <form
          role="search"
          className="relative ml-auto w-full max-w-xs"
          onSubmit={(e) => {
            e.preventDefault();
            const q = String(new FormData(e.currentTarget).get("q") ?? "").trim();
            router.push(q ? `/candidates?q=${encodeURIComponent(q)}` : "/candidates");
          }}
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            ref={searchRef}
            name="q"
            aria-label="Search candidates"
            placeholder="Search candidates…  ⌘K"
            className="h-10 w-full rounded-[10px] border border-line bg-card pl-9 pr-3 text-sm placeholder:text-[#8a8c99]"
          />
        </form>

        <Dropdown.Root>
          <Dropdown.Trigger aria-label="Account menu" className="rounded-full">
            <Avatar name={name} size={36} />
          </Dropdown.Trigger>
          <Dropdown.Portal>
            <Dropdown.Content
              align="end"
              sideOffset={8}
              className="z-50 min-w-48 rounded-[12px] border border-line bg-card p-1.5"
            >
              <div className="px-2.5 py-2">
                <p className="text-sm font-semibold">{name}</p>
                <p className="text-xs capitalize text-muted">{role.replace("_", " ")}</p>
              </div>
              <Dropdown.Separator className="my-1 h-px bg-line" />
              <Dropdown.Item asChild>
                <Link href="/settings" className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-[#f3f1ec]">
                  <Settings className="h-4 w-4" /> Settings
                </Link>
              </Dropdown.Item>
              <form action={signOut}>
                <Dropdown.Item asChild>
                  <button type="submit" className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-[#f3f1ec]">
                    <LogOut className="h-4 w-4" /> Log out
                  </button>
                </Dropdown.Item>
              </form>
            </Dropdown.Content>
          </Dropdown.Portal>
        </Dropdown.Root>
      </header>

      <motion.main
        id="main"
        key={pathname}
        initial={reduce ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-8"
      >
        {children}
      </motion.main>
    </div>
  );
}
