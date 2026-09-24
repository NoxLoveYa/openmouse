import { Activity, ChevronLeft, ChevronRight, FileText, FlaskConical, Gamepad2, House, MessageSquare, Mouse, Settings as SettingsIcon, Star, type LucideIcon } from "lucide-react";
import { type ReactNode } from "react";
import type { ControlSnapshot } from "../device/types";
import { t } from "../i18n";
import { useBridgeActive } from "./GamesPage";

export const OPENMOUSE_URL = "https://openmouse.app/";

export type DesktopPage = "home" | "dashboard" | "test" | "hardware-test" | "games" | "settings";

function NavIcon({ icon: Icon }: { icon: LucideIcon }): ReactNode {
  return <Icon className="app-sidebar-nav-icon" strokeWidth={1.7} stroke="currentColor" aria-hidden="true" />;
}

export function AppSidebar({
  snapshot,
  page,
  collapsed,
  onToggleCollapsed,
  onNavigate,
  onOpenFeedback,
  onOpenWhatsNew,
}: {
  snapshot: ControlSnapshot;
  page: DesktopPage;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onNavigate: (page: DesktopPage) => void;
  onOpenFeedback: () => void;
  onOpenWhatsNew: () => void;
}): ReactNode {
  const locale = snapshot.preferences.locale;
  const bridgeActive = useBridgeActive();
  return (
    <aside className={`app-sidebar${collapsed ? " app-sidebar-collapsed" : ""}`}>
      {page === "dashboard" ? (
        <button
          type="button"
          className="app-sidebar-collapse-toggle"
          title={collapsed ? t(locale, "nav.expand") : t(locale, "nav.collapse")}
          onClick={onToggleCollapsed}
        >
          {collapsed ? (
            <ChevronRight size={16} strokeWidth={2.4} aria-hidden="true" />
          ) : (
            <ChevronLeft size={16} strokeWidth={2.4} aria-hidden="true" />
          )}
        </button>
      ) : null}
      <div className="app-sidebar-top">
        <a
          className="app-sidebar-brand"
          href={OPENMOUSE_URL}
          target="_blank"
          rel="noreferrer"
          title="OpenMouse"
          aria-label="OpenMouse"
        >
          <img className="brand-mark" src="/logo.png" alt="" width={16} height={24} />
          <span className="app-sidebar-brand-text">OpenMouse</span>
          <span className="app-sidebar-brand-version" title={snapshot.buildLabel}>
            {snapshot.buildLabel}
          </span>
        </a>

        <nav className="app-sidebar-nav" aria-label="Primary">
          <p className="app-sidebar-caption">{t(locale, "side.devices")}</p>
          <button
            className={`app-sidebar-nav-item${page === "home" ? " active" : ""}`}
            type="button"
            title={t(locale, "nav.home")}
            aria-current={page === "home" ? "page" : undefined}
            onClick={() => onNavigate("home")}
          >
            <NavIcon icon={House} />
            <span className="app-sidebar-nav-label">{t(locale, "nav.home")}</span>
          </button>
          <button
            className={`app-sidebar-nav-item${page === "dashboard" ? " active" : ""}`}
            type="button"
            title={t(locale, "nav.dashboard")}
            aria-current={page === "dashboard" ? "page" : undefined}
            onClick={() => onNavigate("dashboard")}
          >
            <NavIcon icon={Mouse} />
            <span className="app-sidebar-nav-label">{t(locale, "nav.dashboard")}</span>
          </button>
          <button
            className={`app-sidebar-nav-item${page === "test" ? " active" : ""}`}
            type="button"
            title={t(locale, "nav.mouseCheck")}
            aria-current={page === "test" ? "page" : undefined}
            onClick={() => onNavigate("test")}
          >
            <NavIcon icon={Activity} />
            <span className="app-sidebar-nav-label">{t(locale, "nav.mouseCheck")}</span>
          </button>
          <button
            className={`app-sidebar-nav-item${page === "hardware-test" ? " active" : ""}`}
            type="button"
            title={t(locale, "nav.hardwareTest")}
            aria-current={page === "hardware-test" ? "page" : undefined}
            onClick={() => onNavigate("hardware-test")}
          >
            <NavIcon icon={FlaskConical} />
            <span className="app-sidebar-nav-label">{t(locale, "nav.hardwareTest")}</span>
          </button>
          {bridgeActive ? (
            <button
              className={`app-sidebar-nav-item${page === "games" ? " active" : ""}`}
              type="button"
              title={t(locale, "nav.games")}
              aria-current={page === "games" ? "page" : undefined}
              onClick={() => onNavigate("games")}
            >
              <NavIcon icon={Gamepad2} />
              <span className="app-sidebar-nav-label">{t(locale, "nav.games")}</span>
            </button>
          ) : null}
          <a
            className="app-sidebar-nav-item"
            href="https://docs.openmouse.app"
            target="_blank"
            rel="noreferrer"
            title={t(locale, "nav.docs")}
          >
            <NavIcon icon={FileText} />
            <span className="app-sidebar-nav-label">{t(locale, "nav.docs")}</span>
          </a>
        </nav>
      </div>

      <div className="app-sidebar-bottom">
        <p className="app-sidebar-caption">{t(locale, "side.general")}</p>
        <button
          className="app-sidebar-nav-item"
          type="button"
          title={t(locale, "nav.whatsNew")}
          onClick={onOpenWhatsNew}
        >
          <NavIcon icon={Star} />
          <span className="app-sidebar-nav-label">{t(locale, "nav.whatsNew")}</span>
        </button>
        <button
          className="app-sidebar-nav-item"
          type="button"
          title={t(locale, "nav.feedback")}
          onClick={onOpenFeedback}
        >
          <NavIcon icon={MessageSquare} />
          <span className="app-sidebar-nav-label">{t(locale, "nav.feedback")}</span>
        </button>
        <button
          className={`app-sidebar-nav-item${page === "settings" ? " active" : ""}`}
          type="button"
          title={t(locale, "nav.settings")}
          aria-current={page === "settings" ? "page" : undefined}
          onClick={() => onNavigate("settings")}
        >
          <NavIcon icon={SettingsIcon} />
          <span className="app-sidebar-nav-label">{t(locale, "nav.settings")}</span>
        </button>
      </div>
    </aside>
  );
}
