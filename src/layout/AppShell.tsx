import { useEffect, useState, type ReactElement, type ReactNode } from "react";
import type { AppPage } from "./appPages";
import { NotificationCenter } from "../components/layout/NotificationCenter";
import {
  APP_NAV_SECTIONS,
  activeNavTarget,
  sectionContainingAction,
  type NavAction,
  type NavId,
  type NavSectionIconKey,
} from "./appNavigation";
import {
  IconAudit,
  IconChart,
  IconChevron,
  IconClipboard,
  IconFolder,
  IconLogout,
  IconOverview,
  IconPackage,
  IconRetail,
} from "../components/icons/NavIcons";

function SectionNavIcon({ name }: { name: NavSectionIconKey }): ReactElement {
  const common = { className: "app-shell-nav-ico-svg" };
  switch (name) {
    case "package":
      return <IconPackage {...common} />;
    case "clipboard":
      return <IconClipboard {...common} />;
    case "retail":
      return <IconRetail {...common} />;
    case "audit":
      return <IconAudit {...common} />;
    case "chart":
      return <IconChart {...common} />;
    case "folder":
      return <IconFolder {...common} />;
    default:
      return <IconPackage {...common} />;
  }
}

type Props = {
  page: AppPage;
  userLabel: string;
  onLogout: () => void;
  onNavigate: (action: NavAction) => void;
  onGoHome: () => void;
  onNotificationNavigate?: (page: AppPage) => void;
  children: ReactNode;
};

/**
 * Khung ứng dụng enterprise: topbar navy, sidebar trắng (menu phân cấp + icon monoline), vùng nội dung panel.
 */
export function AppShell({
  page,
  userLabel,
  onLogout,
  onNavigate,
  onGoHome,
  onNotificationNavigate,
  children,
}: Props): ReactElement {
  const target = activeNavTarget(page);

  const [openSections, setOpenSections] = useState<Record<NavId, boolean>>({
    ncc: true,
    internal: false,
    nvbh: false,
    "inventory-check": false,
    reports: false,
    catalog: false,
  });

  useEffect(() => {
    if (!target || target === "overview") return;
    const parent = sectionContainingAction(target);
    if (parent) {
      setOpenSections((prev) => ({ ...prev, [parent]: true }));
    }
  }, [target]);

  const toggleSection = (id: NavId): void => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="app-shell">
      <header className="app-shell-topbar">
        <div className="app-shell-brand">
          <IconPackage className="app-shell-brand-svg" aria-hidden />
          <span className="app-shell-brand-text">Công ty ABC</span>
        </div>
        <div className="app-shell-top-actions">
          <NotificationCenter onNavigate={onNotificationNavigate} />
          <button type="button" className="app-shell-icon-btn" aria-label="Đăng xuất" onClick={onLogout}>
            <IconLogout className="app-shell-top-ico" title="Đăng xuất" />
          </button>
        </div>
      </header>

      <div className="app-shell-body">
        <aside className="app-shell-sidebar">
          <div className="app-shell-user">
            <div className="app-shell-avatar" aria-hidden />
            <div className="app-shell-user-text">
              <div className="app-shell-user-name">{userLabel}</div>
            </div>
          </div>

          <nav className="app-shell-nav" aria-label="Menu chính">
            <button
              type="button"
              className={`app-shell-overview${target === "overview" ? " is-active" : ""}`}
              onClick={onGoHome}
            >
              <span className="app-shell-nav-ico" aria-hidden>
                <IconOverview className="app-shell-nav-ico-svg" />
              </span>
              Tổng quan
            </button>

            {APP_NAV_SECTIONS.map((section) => (
              <div key={section.id} className="app-shell-nav-section">
                <button
                  type="button"
                  className="app-shell-section-head"
                  onClick={() => toggleSection(section.id)}
                  aria-expanded={openSections[section.id]}
                >
                  <span className="app-shell-nav-ico" aria-hidden>
                    <SectionNavIcon name={section.icon} />
                  </span>
                  <span className="app-shell-section-label">{section.label}</span>
                  <span className="app-shell-chevron" aria-hidden>
                    <IconChevron className="app-shell-chevron-svg" open={openSections[section.id]} />
                  </span>
                </button>
                {openSections[section.id] && (
                  <div className="app-shell-section-body">
                    {section.groups.map((group, gi) => (
                      <div key={`${section.id}-g-${gi}`} className="app-shell-group">
                        {group.title ? <div className="app-shell-group-title">{group.title}</div> : null}
                        <ul className="app-shell-links">
                          {group.items.map((item) => (
                            <li key={item.action + item.label}>
                              <button
                                type="button"
                                className={`app-shell-link${target === item.action ? " is-active" : ""}`}
                                onClick={() => onNavigate(item.action)}
                              >
                                {item.label}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </aside>

        <main className="app-shell-main">{children}</main>
      </div>
    </div>
  );
}
