'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { TaskList } from '@/components/TaskList';
import { DetailPanel } from '@/components/DetailPanel';
import { BoardView } from '@/components/BoardView';
import { CalendarView } from '@/components/CalendarView';
import { GanttView } from '@/components/GanttView';
import { TASKS, PROJECTS as INITIAL_PROJECTS, LABELS as INITIAL_LABELS, Task, Priority, Project, Label } from '@/lib/data';
import { Menu, SlidersHorizontal, List, Kanban, Calendar as CalendarIcon, StretchHorizontal, Plus, Settings, Filter, Check, X, Tag, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';

type ViewMode = 'list' | 'board' | 'calendar' | 'gantt';

export default function Home() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeView, setActiveView] = useState('inbox');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [tasks, setTasks] = useState<Task[]>(TASKS);
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [labels, setLabels] = useState<Label[]>(INITIAL_LABELS);
  
  const [todayGroupBy, setTodayGroupBy] = useState<'priority' | 'project' | 'label'>('priority');
  const [isGroupingMenuOpen, setIsGroupingMenuOpen] = useState(false);
  
  // Filter & Manage States
  const [projectFilter, setProjectFilter] = useState<string[]>([]);
  const [labelFilter, setLabelFilter] = useState<string[]>([]);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const activeProject = projects.find(p => p.id === activeView);
  
  const viewTitle = activeView === 'inbox' ? 'Inbox' : 
                    activeView === 'today' ? 'Today' :
                    activeView === 'schedule' ? 'Schedule' : 
                    activeView === 'projects' ? 'Projects' :
                    activeView === 'priority' ? 'Priority' :
                    activeView === 'labels' ? 'Labels' :
                    activeProject?.name || 'Unknown';

  const isDateInRange = (targetDate: Date, startStr?: string, endStr?: string) => {
    if (!startStr && !endStr) return false;
    
    const parseDateStr = (str?: string): Date | null => {
      if (!str) return null;
      if (str.toLowerCase() === 'today') return new Date();
      if (str.toLowerCase() === 'tomorrow') {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return d;
      }
      const d = new Date(str);
      return isNaN(d.getTime()) ? null : d;
    };

    const start = parseDateStr(startStr);
    const end = parseDateStr(endStr);
    const target = new Date(targetDate);
    target.setHours(0, 0, 0, 0);

    const startNormalized = start ? new Date(start.setHours(0, 0, 0, 0)) : null;
    const endNormalized = end ? new Date(end.setHours(0, 0, 0, 0)) : null;

    if (startNormalized && endNormalized) {
      return target >= startNormalized && target <= endNormalized;
    } else if (startNormalized) {
      return target.getTime() === startNormalized.getTime();
    } else if (endNormalized) {
      return target.getTime() === endNormalized.getTime();
    }
    return false;
  };

  const filteredTasks = tasks.filter(task => {
    if (activeView === 'inbox') return task.projectId === 'inbox';
    if (activeView === 'today') return isDateInRange(new Date(), task.startDate, task.dueDate);
    if (activeView === 'schedule') return task.startDate !== undefined || task.dueDate !== undefined;
    
    // Specific view filters
    if (activeView === 'projects') {
      if (projectFilter.length > 0) {
        return projectFilter.includes(task.projectId);
      }
      return true;
    }
    
    if (activeView === 'priority') return true; 
    
    if (activeView === 'labels') {
      if (labelFilter.length > 0) {
        return task.labels.some(l => labelFilter.includes(l));
      }
      return true;
    }
    
    // Project filter
    if (task.projectId === activeView) return true;
    
    return false;
  }).sort((a, b) => {
    if (activeView === 'priority') {
      return (a.priority || 5) - (b.priority || 5); // Sort by priority (1 is highest)
    }
    if (activeView === 'labels') {
       // Sort by number of labels (descending), then by first label name
       if (a.labels.length !== b.labels.length) {
         return b.labels.length - a.labels.length;
       }
       if (a.labels.length > 0 && b.labels.length > 0) {
         return a.labels[0].localeCompare(b.labels[0]);
       }
       return 0;
    }
    if (activeView === 'schedule') {
      // Simple string comparison for prototype (Today < Tomorrow < YYYY-MM-DD)
      // In a real app, parse dates properly
      if (a.dueDate === 'Today') return -1;
      if (b.dueDate === 'Today') return 1;
      if (a.dueDate === 'Tomorrow') return -1;
      if (b.dueDate === 'Tomorrow') return 1;
      return (a.dueDate || '').localeCompare(b.dueDate || '');
    }
    return 0;
  });

  // Calculate generic counts for pending tasks
  const uncompletedTasks = tasks.filter(t => !t.isCompleted);
  const inboxCount = uncompletedTasks.filter(t => t.projectId === 'inbox').length;
  const todayCount = uncompletedTasks.filter(t => isDateInRange(new Date(), t.startDate, t.dueDate)).length;

  // --- Handlers ---

  const handleAddTask = (content: string, projectId?: string, parentId?: string, priority?: number, startDate?: string, dueDate?: string) => {
    const globalViews = ['today', 'schedule', 'priority', 'projects', 'labels'];
    const resolvedProjectId = projectId || (globalViews.includes(activeView) ? 'inbox' : activeView);

    const isInbox = activeView === 'inbox';
    const parsedStartDate = startDate || (!isInbox && activeView === 'today' ? 'Today' : undefined);
    const parsedDueDate = dueDate || (!isInbox && activeView === 'today' ? 'Today' : undefined);

    const newTask: Task = {
      id: `t${Date.now()}`,
      content,
      priority: priority as Priority | undefined,
      labels: [],
      projectId: resolvedProjectId,
      isCompleted: false,
      startDate: parsedStartDate,
      dueDate: parsedDueDate,
      parentId,
      children: []
    };

    if (parentId) {
      // Add as subtask
      const addTaskRecursive = (taskList: Task[]): Task[] => {
        return taskList.map(t => {
          if (t.id === parentId) {
            return { ...t, children: [...(t.children || []), newTask] };
          }
          if (t.children) {
            return { ...t, children: addTaskRecursive(t.children) };
          }
          return t;
        });
      };
      setTasks(addTaskRecursive(tasks));
      
      // If the parent is the selected task, update it to show the new child immediately
      if (selectedTask?.id === parentId) {
        setSelectedTask(prev => prev ? { ...prev, children: [...(prev.children || []), newTask] } : null);
      }
    } else {
      // Add as root task
      setTasks([...tasks, newTask]);
    }
  };

  const handleToggleComplete = (taskId: string) => {
    // Recursive update function to handle nested tasks
    const updateTaskRecursive = (taskList: Task[]): Task[] => {
      return taskList.map(t => {
        if (t.id === taskId) return { ...t, isCompleted: !t.isCompleted };
        if (t.children) return { ...t, children: updateTaskRecursive(t.children) };
        return t;
      });
    };
    setTasks(updateTaskRecursive(tasks));
    
    // Also update selected task if it's the one being toggled
    if (selectedTask?.id === taskId) {
      setSelectedTask(prev => prev ? { ...prev, isCompleted: !prev.isCompleted } : null);
    }
  };

  const handleUpdateTask = (taskId: string, updates: Partial<Task>) => {
    const updateTaskRecursive = (taskList: Task[]): Task[] => {
      return taskList.map(t => {
        if (t.id === taskId) return { ...t, ...updates };
        if (t.children) return { ...t, children: updateTaskRecursive(t.children) };
        return t;
      });
    };
    
    const newTasks = updateTaskRecursive(tasks);
    setTasks(newTasks);

    // Update selected task reference to reflect changes immediately in UI
    if (selectedTask?.id === taskId) {
      setSelectedTask(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const handleDeleteTask = (taskId: string) => {
    const deleteTaskRecursive = (taskList: Task[]): Task[] => {
      return taskList.filter(t => t.id !== taskId).map(t => ({
        ...t,
        children: t.children ? deleteTaskRecursive(t.children) : undefined
      }));
    };
    setTasks(deleteTaskRecursive(tasks));
    setSelectedTask(null);
  };

  const handleCreateNewItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

      if (activeView === 'projects') {
      const newProject: Project = {
        id: `p${Date.now()}`,
        name: newItemName.trim(),
        color: 'text-indigo-600'
      };
      setProjects([...projects, newProject]);
    } else {
      const newLabel: Label = {
        id: `l${Date.now()}`,
        name: newItemName.trim(),
        color: 'bg-indigo-100 text-indigo-700'
      };
      setLabels([...labels, newLabel]);
    }

    setNewItemName('');
    setIsAddModalOpen(false);
  };

  // Helper to find task by ID recursively
  const findTaskById = (taskList: Task[], id: string): Task | undefined => {
    for (const task of taskList) {
      if (task.id === id) return task;
      if (task.children) {
        const found = findTaskById(task.children, id);
        if (found) return found;
      }
    }
    return undefined;
  };

  const parentTask = selectedTask?.parentId ? findTaskById(tasks, selectedTask.parentId) : undefined;

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      
      {/* Sidebar */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        activeView={activeView} 
        onSelectView={(view) => {
          setActiveView(view);
          if (window.innerWidth < 1024) setIsSidebarOpen(false);
        }}
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        counts={{
          inbox: inboxCount,
          today: todayCount
        }}
        projects={projects}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        
        {/* Top Bar */}
        <header className="h-16 border-b border-slate-100/50 flex items-center px-6 justify-between bg-white/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
              title="Toggle sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">{viewTitle}</h1>
            
            {activeView === 'today' && (
              <div className="relative">
                <button 
                  onClick={() => setIsGroupingMenuOpen(!isGroupingMenuOpen)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                  title="Group by"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </button>
                
                {isGroupingMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsGroupingMenuOpen(false)} />
                    <div className="absolute top-full left-0 mt-2 w-48 bg-white/95 backdrop-blur-md rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/50 py-1.5 z-50 flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Group By</div>
                      <button 
                        onClick={() => { setTodayGroupBy('priority'); setIsGroupingMenuOpen(false); }}
                        className={cn("px-3 py-2 text-sm text-left hover:bg-slate-50 flex items-center justify-between", todayGroupBy === 'priority' ? "text-indigo-600 font-medium" : "text-slate-600")}
                      >
                        Priority
                        {todayGroupBy === 'priority' && <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />}
                      </button>
                      <button 
                        onClick={() => { setTodayGroupBy('project'); setIsGroupingMenuOpen(false); }}
                        className={cn("px-3 py-2 text-sm text-left hover:bg-slate-50 flex items-center justify-between", todayGroupBy === 'project' ? "text-indigo-600 font-medium" : "text-slate-600")}
                      >
                        Project
                        {todayGroupBy === 'project' && <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />}
                      </button>
                      <button 
                        onClick={() => { setTodayGroupBy('label'); setIsGroupingMenuOpen(false); }}
                        className={cn("px-3 py-2 text-sm text-left hover:bg-slate-50 flex items-center justify-between", todayGroupBy === 'label' ? "text-indigo-600 font-medium" : "text-slate-600")}
                      >
                        Label
                        {todayGroupBy === 'label' && <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {(activeView === 'projects' || activeView === 'labels') && (
              <div className="flex items-center gap-1 ml-4 border-l border-slate-200 pl-4">
                <button 
                  onClick={() => { setIsAddModalOpen(true); setNewItemName(''); }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                  title={`Add ${activeView === 'projects' ? 'Project' : 'Label'}`}
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setIsManageModalOpen(true)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                  title={`Manage ${activeView === 'projects' ? 'Projects' : 'Labels'}`}
                >
                  <Settings className="w-4 h-4" />
                </button>
                
                <div className="relative">
                  <button 
                    onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                    className={cn(
                      "p-1.5 rounded-md transition-colors",
                      isFilterMenuOpen || (activeView === 'projects' ? projectFilter.length > 0 : labelFilter.length > 0)
                        ? "text-indigo-600 bg-indigo-50" 
                        : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                    )}
                    title="Filter"
                  >
                    <Filter className="w-4 h-4" />
                  </button>

                  {isFilterMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsFilterMenuOpen(false)} />
                      <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-slate-100 py-1 z-50 flex flex-col max-h-[300px] overflow-y-auto">
                        <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-50 mb-1">
                          Filter {activeView === 'projects' ? 'Projects' : 'Labels'}
                        </div>
                        
                        {activeView === 'projects' && (
                          <>
                            {projects.map(project => (
                              <button 
                                key={project.id}
                                onClick={() => {
                                  setProjectFilter(prev => 
                                    prev.includes(project.id) 
                                      ? prev.filter(id => id !== project.id)
                                      : [...prev, project.id]
                                  );
                                }}
                                className="px-3 py-2 text-sm text-left hover:bg-slate-50 flex items-center gap-2"
                              >
                                <div className={cn(
                                  "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                                  projectFilter.includes(project.id) ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300"
                                )}>
                                  {projectFilter.includes(project.id) && <Check className="w-3 h-3" />}
                                </div>
                                <span className={cn(projectFilter.includes(project.id) ? "text-slate-900" : "text-slate-600")}>
                                  {project.name}
                                </span>
                              </button>
                            ))}
                            {projectFilter.length > 0 && (
                              <button 
                                onClick={() => setProjectFilter([])}
                                className="px-3 py-2 text-xs text-indigo-600 hover:bg-indigo-50 font-medium border-t border-slate-50 mt-1"
                              >
                                Clear all filters
                              </button>
                            )}
                          </>
                        )}

                        {activeView === 'labels' && (
                          <>
                            {labels.map(label => (
                              <button 
                                key={label.id}
                                onClick={() => {
                                  setLabelFilter(prev => 
                                    prev.includes(label.id) 
                                      ? prev.filter(id => id !== label.id)
                                      : [...prev, label.id]
                                  );
                                }}
                                className="px-3 py-2 text-sm text-left hover:bg-slate-50 flex items-center gap-2"
                              >
                                <div className={cn(
                                  "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                                  labelFilter.includes(label.id) ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300"
                                )}>
                                  {labelFilter.includes(label.id) && <Check className="w-3 h-3" />}
                                </div>
                                <span className={cn(labelFilter.includes(label.id) ? "text-slate-900" : "text-slate-600")}>
                                  {label.name}
                                </span>
                              </button>
                            ))}
                            {labelFilter.length > 0 && (
                              <button 
                                onClick={() => setLabelFilter([])}
                                className="px-3 py-2 text-xs text-indigo-600 hover:bg-indigo-50 font-medium border-t border-slate-50 mt-1"
                              >
                                Clear all filters
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {activeProject?.startDate && (
              <span className="text-xs text-slate-400 font-medium px-2 py-0.5 bg-slate-50 rounded">
                {activeProject.startDate} - {activeProject.endDate}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-1.5 bg-slate-100/80 p-1.5 rounded-xl ring-1 ring-slate-200/50">
            <button 
              onClick={() => setViewMode('list')}
              className={cn(
                "p-1.5 rounded-lg transition-all duration-200",
                viewMode === 'list' ? "bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200/50" : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
              )}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('board')}
              className={cn(
                "p-1.5 rounded-lg transition-all duration-200",
                viewMode === 'board' ? "bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200/50" : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
              )}
              title="Board View"
            >
              <Kanban className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('calendar')}
              className={cn(
                "p-1.5 rounded-lg transition-all duration-200",
                viewMode === 'calendar' ? "bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200/50" : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
              )}
              title="Calendar View"
            >
              <CalendarIcon className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('gantt')}
              className={cn(
                "p-1.5 rounded-lg transition-all duration-200",
                viewMode === 'gantt' ? "bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200/50" : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
              )}
              title="Gantt View"
            >
              <StretchHorizontal className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Task List Area */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 bg-white">
          {viewMode === 'list' && (
            <div className="max-w-5xl mx-auto">
              <TaskList 
                tasks={filteredTasks} 
                projects={projects}
                labels={labels}
                onTaskClick={setSelectedTask}
                onToggleComplete={handleToggleComplete}
                onAddTask={handleAddTask}
                groupBy={
                  activeView === 'today' ? todayGroupBy :
                  activeView === 'projects' ? 'project' : 
                  activeView === 'labels' ? 'label' : 
                  activeView === 'schedule' ? 'schedule' :
                  'priority'
                }
              />
            </div>
          )}
          
          {viewMode === 'board' && (
            <div className="h-full">
              <BoardView 
                tasks={filteredTasks}
                projects={projects}
                labels={labels}
                onTaskClick={setSelectedTask}
                onToggleComplete={handleToggleComplete}
                onUpdateTask={handleUpdateTask}
                onAddTask={handleAddTask}
                groupBy={
                  activeView === 'today' ? todayGroupBy :
                  activeView === 'projects' ? 'project' : 
                  activeView === 'labels' ? 'label' : 
                  activeView === 'schedule' ? 'schedule' :
                  'priority'
                }
              />
            </div>
          )}

          {viewMode === 'calendar' && (
            <div className="h-full">
              <CalendarView 
                tasks={filteredTasks}
                onTaskClick={setSelectedTask}
              />
            </div>
          )}

          {viewMode === 'gantt' && (
            <div className="h-full">
              <GanttView 
                tasks={filteredTasks}
                projects={projects}
                labels={labels}
                onTaskClick={setSelectedTask}
                groupBy={
                  activeView === 'today' ? todayGroupBy :
                  activeView === 'projects' ? 'project' : 
                  activeView === 'labels' ? 'label' : 
                  activeView === 'schedule' ? 'schedule' :
                  'priority'
                }
              />
            </div>
          )}
        </div>
      </main>

      {/* DetailPanel */}
      <DetailPanel 
        key={selectedTask?.id}
        task={selectedTask} 
        parentTask={parentTask}
        projects={projects}
        labels={labels}
        isOpen={!!selectedTask} 
        onClose={() => setSelectedTask(null)}
        onUpdateTask={handleUpdateTask}
        onDeleteTask={handleDeleteTask}
        onTaskClick={setSelectedTask}
        onAddTask={handleAddTask}
      />

      {/* Manage Modal */}
      {isManageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/10 backdrop-blur-md">
          <div className="bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-300 border border-slate-200/50">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900tracking-tight">Manage {activeView === 'projects' ? 'Projects' : 'Labels'}</h2>
              <button 
                onClick={() => setIsManageModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                {activeView === 'projects' && projects.map(project => (
                  <div key={project.id} className="flex items-center justify-between p-2 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50 group">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-3 h-3 rounded-full", project.color.replace('bg-', 'bg-'))} />
                      <span className="text-sm font-medium text-slate-700">{project.name}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded">
                        <Settings className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {activeView === 'labels' && labels.map(label => (
                  <div key={label.id} className="flex items-center justify-between p-2 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50 group">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-3 h-3 rounded-full", label.color.replace('bg-', 'bg-'))} />
                      <span className="text-sm font-medium text-slate-700">{label.name}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded">
                        <Settings className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button 
                onClick={() => setIsManageModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/10 backdrop-blur-md">
          <div className="bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-300 border border-slate-200/50">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">New {activeView === 'projects' ? 'Project' : 'Label'}</h2>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateNewItem} className="p-4 flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500">
                  <div className="p-2 bg-slate-50 text-slate-400">
                    {activeView === 'projects' ? <Folder className="w-4 h-4" /> : <Tag className="w-4 h-4" />}
                  </div>
                  <input 
                    type="text" 
                    autoFocus
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="E.g., Design System"
                    className="w-full flex-1 px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={!newItemName.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
