'use client';

import React, { useState } from 'react';
import { 
  Inbox, 
  Calendar, 
  Hash, 
  ChevronRight, 
  ChevronDown, 
  Menu,
  Layout,
  Tag,
  Folder,
  Flag,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Project, Label } from '@/lib/data';

interface SidebarProps {
  isOpen: boolean;
  activeView: string;
  onSelectView: (viewId: string) => void;
  toggleSidebar: () => void;
  counts?: { inbox: number; today: number };
  projects?: Project[];
}

interface NavItemProps {
  id: string;
  icon: any;
  label: string;
  count?: number;
  colorClass?: string;
  activeView: string;
  onSelectView: (viewId: string) => void;
  isOpen: boolean;
}

const NavItem = ({ 
  id, 
  icon: Icon, 
  label, 
  count, 
  colorClass = "text-slate-500",
  activeView,
  onSelectView,
  isOpen
}: NavItemProps) => (
  <button
    onClick={() => onSelectView(id)}
    className={cn(
      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 relative overflow-hidden",
      activeView === id 
        ? "bg-indigo-50/80 text-indigo-700 font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] ring-1 ring-indigo-500/10" 
        : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900",
      !isOpen && "lg:justify-center lg:px-2"
    )}
    title={!isOpen ? label : undefined}
  >
    <Icon className={cn("w-5 h-5 flex-shrink-0", colorClass)} />
    <span className={cn("flex-1 text-left truncate transition-all duration-200", !isOpen && "lg:w-0 lg:opacity-0 lg:hidden")}>{label}</span>
    {count !== undefined && count > 0 && (
      <span className={cn("text-xs text-slate-400", !isOpen && "lg:hidden")}>{count}</span>
    )}
  </button>
);

export function Sidebar({ isOpen, activeView, onSelectView, toggleSidebar, counts, projects = [] }: SidebarProps) {
  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/20 z-20 lg:hidden transition-opacity",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={toggleSidebar}
      />

      {/* Sidebar Container */}
      <aside 
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-30 bg-slate-50/80 backdrop-blur-md border-r border-slate-200/60 transform transition-all duration-300 ease-in-out flex flex-col shadow-[1px_0_4px_rgba(0,0,0,0.02)]",
          isOpen ? "w-[280px] translate-x-0" : "w-[280px] -translate-x-full lg:translate-x-0 lg:w-[70px]"
        )}
      >
        <div className={cn("h-14 flex items-center px-4", isOpen ? "justify-between" : "justify-center")}>
          {/* Logo Group - Hidden when collapsed */}
          <div className={cn("flex items-center gap-2 font-semibold text-slate-800 overflow-hidden transition-all duration-200", !isOpen && "w-0 opacity-0 hidden")}>
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white flex-shrink-0">
              <Layout className="w-5 h-5" />
            </div>
            <span className="whitespace-nowrap">Minimalist</span>
          </div>

          {/* Toggle Button */}
          <button 
            onClick={toggleSidebar} 
            className="p-2 text-slate-500 hover:bg-slate-200 rounded-md transition-colors"
            title={isOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {isOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-6">
          {/* Main Nav */}
          <div className="space-y-1">
            <NavItem id="inbox" icon={Inbox} label="Inbox" count={counts?.inbox} colorClass="text-blue-600" activeView={activeView} onSelectView={onSelectView} isOpen={isOpen} />
            <NavItem id="today" icon={Calendar} label="Today" count={counts?.today} colorClass="text-emerald-600" activeView={activeView} onSelectView={onSelectView} isOpen={isOpen} />
            <NavItem id="schedule" icon={Calendar} label="Schedule" colorClass="text-purple-600" activeView={activeView} onSelectView={onSelectView} isOpen={isOpen} />
            <NavItem id="projects" icon={Folder} label="Projects" colorClass="text-slate-600" activeView={activeView} onSelectView={onSelectView} isOpen={isOpen} />
            
            {/* Custom Projects */}
            {isOpen && projects.length > 0 && (
              <div className="pl-8 space-y-1 pb-1">
                {projects.map(p => (
                  <button
                    key={p.id}
                    onClick={() => onSelectView(p.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors",
                      activeView === p.id 
                        ? "bg-indigo-50/50 text-indigo-700 font-medium" 
                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/80"
                    )}
                  >
                    <span className={cn("w-2 h-2 rounded-full", p.color.replace('text-', 'bg-'))} />
                    <span className="truncate">{p.name}</span>
                  </button>
                ))}
              </div>
            )}

            <NavItem id="priority" icon={Flag} label="Priority" colorClass="text-orange-600" activeView={activeView} onSelectView={onSelectView} isOpen={isOpen} />
            <NavItem id="labels" icon={Tag} label="Labels" colorClass="text-indigo-600" activeView={activeView} onSelectView={onSelectView} isOpen={isOpen} />
          </div>
        </div>
      </aside>
    </>
  );
}
