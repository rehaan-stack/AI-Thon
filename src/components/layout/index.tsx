'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/store';
import { APP_CONFIG } from '@/config/app-config';
import {
  LayoutDashboard,
  Upload,
  Wrench,
  GitCompareArrows,
  ClipboardList,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
  Sun,
  Moon,
} from 'lucide-react';
import type { AppView } from '@/types';

const NAV_ITEMS: {
  view: AppView;
  label: string;
  icon: React.ReactNode;
}[] = [
  { view: 'overview', label: 'Overview', icon: <LayoutDashboard size={20} /> },
  { view: 'upload', label: 'Upload', icon: <Upload size={20} /> },
  { view: 'workspace', label: 'Workspace', icon: <Wrench size={20} /> },
  { view: 'comparison', label: 'Comparison', icon: <GitCompareArrows size={20} /> },
  { view: 'audit', label: 'Audit Trail', icon: <ClipboardList size={20} /> },
  { view: 'settings', label: 'Settings', icon: <Settings size={20} /> },
];

/* Shared layout configuration */
const SIDEBAR_EXPANDED_W = 240;
const SIDEBAR_COLLAPSED_W = 64;
const SIDEBAR_TRANSITION = 'width 260ms cubic-bezier(0.2, 0, 0, 1), box-shadow 260ms ease';

export function Sidebar({
  collapsed,
  onToggle,
  mobileOpen,
  onMobileClose,
}: {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}) {
  const currentView = useAppStore((s) => s.currentView);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const workingDataset = useAppStore((s) => s.workingDataset);
  const qualityScore = useAppStore((s) => s.qualityScore);
  const history = useAppStore((s) => s.history);

  const [isHovered, setIsHovered] = useState(false);

  // Expanded = user pinned it open OR is currently hovering over it
  const expanded = !collapsed || isHovered;
  const sidebarW = expanded ? SIDEBAR_EXPANDED_W : SIDEBAR_COLLAPSED_W;

  const getBadge = (view: AppView): string | undefined => {
    if (view === 'overview' && qualityScore) return `${qualityScore.overall}`;
    if (view === 'workspace' && workingDataset) return `${workingDataset.rows.length}`;
    if (view === 'audit' && history.length > 0) return `${history.length}`;
    return undefined;
  };

  return (
    <>
      {/* ── Mobile backdrop ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* ── Desktop spacer (pins main layout so it does not shift on hover) ── */}
      <div
        className="hidden lg:block shrink-0"
        style={{
          width: collapsed ? SIDEBAR_COLLAPSED_W : SIDEBAR_EXPANDED_W,
          transition: 'width 260ms cubic-bezier(0.2, 0, 0, 1)',
        }}
      />

      {/* ── Sidebar ── */}
      <aside
        onMouseEnter={() => { if (collapsed) setIsHovered(true); }}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          width: sidebarW,
          transition: SIDEBAR_TRANSITION,
          boxShadow: expanded && collapsed ? '0 12px 32px -4px rgba(15, 23, 42, 0.16)' : undefined,
        }}
        className={`
          fixed top-0 left-0 h-full z-50
          bg-white border-r border-slate-200
          flex flex-col overflow-hidden
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* ─── Logo / Brand Header ─── */}
        <div className="flex items-center h-16 border-b border-slate-100 shrink-0 overflow-hidden px-3">
          <button
            onClick={() => { setCurrentView('landing'); onMobileClose(); }}
            className="flex items-center w-full h-full hover:opacity-85 transition-opacity"
            style={{ gap: expanded ? 12 : 0 }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <LogoIcon size={28} />
            </div>
            <div
              style={{
                opacity: expanded ? 1 : 0,
                maxWidth: expanded ? 160 : 0,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                transition: 'opacity 220ms ease, max-width 260ms cubic-bezier(0.2, 0, 0, 1)',
                pointerEvents: expanded ? 'auto' : 'none',
              }}
            >
              <div className="font-extrabold text-[15px] text-slate-900 tracking-tight leading-tight">
                {APP_CONFIG.name}
              </div>
              <div className="text-[10px] text-emerald-600 font-semibold tracking-wider uppercase leading-none">
                Data Studio
              </div>
            </div>
          </button>

          {/* Mobile close */}
          <button
            onClick={onMobileClose}
            className="lg:hidden ml-auto mr-1 p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        {/* ─── Navigation ─── */}
        <nav className="flex-1 py-3 px-3 space-y-1 overflow-y-auto overflow-x-hidden">
          {NAV_ITEMS.map((item) => {
            const isActive = currentView === item.view;
            const badge = getBadge(item.view);

            return (
              <button
                key={item.view}
                onClick={() => { setCurrentView(item.view); onMobileClose(); }}
                title={!expanded ? item.label : undefined}
                className={`
                  w-full flex items-center rounded-xl text-sm
                  transition-colors duration-150
                  ${isActive
                    ? 'bg-emerald-50 text-emerald-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium'
                  }
                `}
                style={{
                  height: 42,
                  padding: 0,
                  gap: expanded ? 12 : 0,
                }}
              >
                {/* Icon wrapper – centered in collapsed 40px cell */}
                <span
                  className={`shrink-0 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`}
                  style={{
                    width: 40,
                    height: 42,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {item.icon}
                </span>

                {/* Label – cleanly animated via CSS */}
                <span
                  style={{
                    opacity: expanded ? 1 : 0,
                    maxWidth: expanded ? 120 : 0,
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    textAlign: 'left',
                    transition: `opacity ${expanded ? '220ms ease 40ms' : '140ms ease'}, max-width 260ms cubic-bezier(0.2, 0, 0, 1)`,
                  }}
                >
                  {item.label}
                </span>

                {/* Badge – cleanly animated via CSS */}
                {badge && (
                  <span
                    className={`text-[10px] font-bold rounded-full ${
                      isActive ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-100 text-slate-500'
                    }`}
                    style={{
                      opacity: expanded ? 1 : 0,
                      maxWidth: expanded ? 50 : 0,
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      padding: expanded ? '2px 8px' : '0px',
                      marginLeft: 'auto',
                      marginRight: expanded ? 8 : 0,
                      transition: `opacity ${expanded ? '220ms ease 70ms' : '140ms ease'}, max-width 260ms cubic-bezier(0.2, 0, 0, 1), padding 200ms ease`,
                    }}
                  >
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* ─── Footer / Collapse toggle ─── */}
        <div className="hidden lg:block border-t border-slate-100 p-3 shrink-0">
          <button
            onClick={onToggle}
            className="w-full flex items-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            style={{
              height: 38,
              padding: 0,
              gap: expanded ? 12 : 0,
            }}
            title={collapsed ? 'Pin sidebar open' : 'Collapse sidebar'}
          >
            <span
              className="shrink-0"
              style={{
                width: 40,
                height: 38,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </span>
            <span
              className="text-xs font-semibold text-slate-500"
              style={{
                opacity: expanded ? 1 : 0,
                maxWidth: expanded ? 120 : 0,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textAlign: 'left',
                transition: `opacity ${expanded ? '220ms ease 40ms' : '140ms ease'}, max-width 260ms cubic-bezier(0.2, 0, 0, 1)`,
              }}
            >
              {collapsed ? 'Pin Open' : 'Collapse'}
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}

export function LogoIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="2" y="2" width="28" height="28" rx="6" fill="#059669" />
      <rect x="6" y="8" width="8" height="3" rx="1" fill="white" opacity="0.9" />
      <rect x="16" y="8" width="10" height="3" rx="1" fill="white" opacity="0.6" />
      <rect x="6" y="14" width="8" height="3" rx="1" fill="white" opacity="0.6" />
      <rect x="16" y="14" width="10" height="3" rx="1" fill="white" opacity="0.9" />
      <rect x="6" y="20" width="8" height="3" rx="1" fill="white" opacity="0.9" />
      <rect x="16" y="20" width="10" height="3" rx="1" fill="white" opacity="0.6" />
      <circle cx="26" cy="26" r="5" fill="#10B981" />
      <path d="M23.5 26L25.5 28L28.5 24.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function TopBar({
  onMenuClick,
}: {
  onMenuClick: () => void;
}) {
  const currentView = useAppStore((s) => s.currentView);
  const workingDataset = useAppStore((s) => s.workingDataset);
  const qualityScore = useAppStore((s) => s.qualityScore);
  const theme = useAppStore((s) => s.theme);
  const toggleTheme = useAppStore((s) => s.toggleTheme);

  const viewTitles: Record<AppView, string> = {
    landing: APP_CONFIG.name,
    overview: 'Data Health Overview',
    upload: 'Upload & Import',
    workspace: 'Cleaning Workspace',
    comparison: 'Before & After',
    audit: 'Audit Trail',
    settings: 'Settings & Export',
  };

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 flex-shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-600"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold text-slate-900">
          {viewTitles[currentView]}
        </h1>
      </div>
      <div className="flex items-center gap-3">
        {workingDataset && (
          <span className="text-sm text-slate-500 hidden sm:inline">
            {workingDataset.meta.fileName}
          </span>
        )}
        {qualityScore && (
          <div className={`
            px-3 py-1 rounded-full text-sm font-semibold
            ${qualityScore.overall >= 80 ? 'bg-emerald-50 text-emerald-700' :
              qualityScore.overall >= 60 ? 'bg-amber-50 text-amber-700' :
              'bg-red-50 text-red-700'}
          `}>
            Score: {qualityScore.overall}
          </div>
        )}

        {/* Night / Dark Mode Toggle */}
        <button
          onClick={toggleTheme}
          className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-all flex items-center gap-1.5"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Night Mode'}
          aria-label="Toggle Night Mode"
        >
          {theme === 'dark' ? (
            <>
              <Sun size={17} className="text-amber-400" />
              <span className="text-xs font-semibold text-slate-200 hidden md:inline">Light</span>
            </>
          ) : (
            <>
              <Moon size={17} className="text-slate-600" />
              <span className="text-xs font-semibold text-slate-700 hidden md:inline">Night</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}
