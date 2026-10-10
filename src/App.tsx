'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/store';
import { Sidebar, TopBar } from '@/components/layout';
import { LandingView } from '@/components/landing/LandingView';
import { FileUploader } from '@/components/upload/FileUploader';
import { QualityDashboard } from '@/components/diagnostics/QualityDashboard';
import { CleaningStudio } from '@/components/cleaning/CleaningStudio';
import { DiffComparison } from '@/components/diff/DiffComparison';
import { AuditTrail } from '@/components/history/AuditTrail';
import { ExportView } from '@/components/export/ExportView';
import { AiAssistantPanel } from '@/components/assistant/AiAssistantPanel';
import { Sparkles, X, Loader2, Bot } from 'lucide-react';

export function App() {
  const currentView = useAppStore((s) => s.currentView);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const isLoading = useAppStore((s) => s.isLoading);
  const loadingMessage = useAppStore((s) => s.loadingMessage);
  const workingDataset = useAppStore((s) => s.workingDataset);
  const undo = useAppStore((s) => s.undo);
  const redo = useAppStore((s) => s.redo);
  const canUndo = useAppStore((s) => s.canUndo);
  const canRedo = useAppStore((s) => s.canRedo);
  const theme = useAppStore((s) => s.theme);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);

  // Synchronize dark mode class to html element
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Keyboard shortcuts (Ctrl+Z for undo, Ctrl+Y or Ctrl+Shift+Z for redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          if (canRedo) redo();
        } else {
          e.preventDefault();
          if (canUndo) undo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        if (canRedo) redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo, undo, redo]);

  const renderCurrentView = () => {
    switch (currentView) {
      case 'landing':
        return <LandingView />;
      case 'upload':
        return <FileUploader />;
      case 'overview':
        return <QualityDashboard />;
      case 'workspace':
        return <CleaningStudio />;
      case 'comparison':
        return <DiffComparison />;
      case 'audit':
        return <AuditTrail />;
      case 'settings':
        return <ExportView />;
      default:
        return <LandingView />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans text-slate-900">
      {/* Sidebar Navigation */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <TopBar onMenuClick={() => setMobileMenuOpen(true)} />

        <main className="flex-1 overflow-y-auto relative p-4 sm:p-6 lg:p-8">
          {renderCurrentView()}
        </main>
      </div>

      {/* Floating AI Copilot Trigger (when dataset is loaded) */}
      {workingDataset && (
        <button
          onClick={() => setCopilotOpen(true)}
          className="fixed bottom-6 right-6 p-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200 z-30 flex items-center gap-2 font-semibold text-xs border border-emerald-400/30"
          title="Open AI Cleaning Copilot"
        >
          <Bot size={18} className="animate-pulse" />
          <span className="hidden sm:inline">AI Copilot</span>
        </button>
      )}

      {/* Slide-over AI Copilot Drawer */}
      {copilotOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-slideLeft">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <Sparkles size={18} className="text-emerald-600" />
                <span>AI Data Copilot</span>
              </div>
              <button
                onClick={() => setCopilotOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <AiAssistantPanel />
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center animate-fadeIn">
          <div className="bg-white p-6 rounded-3xl shadow-2xl flex flex-col items-center gap-4 max-w-sm text-center">
            <Loader2 size={36} className="animate-spin text-emerald-600" />
            <div className="space-y-1">
              <h4 className="font-bold text-slate-900 text-sm">Processing Data</h4>
              <p className="text-xs text-slate-500">
                {loadingMessage || 'Executing data operations...'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
