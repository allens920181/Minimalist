'use client';

import React, { useState } from 'react';
import { 
  Plus, 
  Flag, 
  Calendar, 
  MoreHorizontal, 
  Check,
  ChevronDown,
  ChevronRight,
  Folder,
  Tag,
  Inbox
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Task, Priority, Project, Label } from '@/lib/data';

interface TaskListProps {
  tasks: Task[];
  projects: Project[];
  labels: Label[];
  onTaskClick: (task: Task) => void;
  onToggleComplete: (taskId: string) => void;
  onAddTask: (content: string, projectId?: string, parentId?: string, priority?: number, startDate?: string, dueDate?: string) => void;
  groupBy?: 'priority' | 'project' | 'label' | 'schedule';
  activeViewId?: string;
  onProjectClick?: (projectId: string) => void;
}

export function TaskList({ tasks, projects, labels, onTaskClick, onToggleComplete, onAddTask, groupBy, activeViewId, onProjectClick }: TaskListProps) {
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddValue, setQuickAddValue] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(undefined);
  const [selectedPriority, setSelectedPriority] = useState<number | undefined>(undefined);
  const [selectedStartDate, setSelectedStartDate] = useState<string | undefined>(undefined);
  const [selectedDueDate, setSelectedDueDate] = useState<string | undefined>(undefined);
  
  const [isProjectSelectorOpen, setIsProjectSelectorOpen] = useState(false);
  const [isPrioritySelectorOpen, setIsPrioritySelectorOpen] = useState(false);
  const [isDateSelectorOpen, setIsDateSelectorOpen] = useState(false);

  const [inlineAddGroup, setInlineAddGroup] = useState<string | null>(null);
  const [inlineAddValue, setInlineAddValue] = useState('');

  const allProjects = React.useMemo(() => {
      return projects.map(p => ({ ...p, level: 0 }));
  }, [projects]);

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickAddValue.trim()) {
      onAddTask(quickAddValue, selectedProjectId, undefined, selectedPriority, selectedStartDate, selectedDueDate);
      setQuickAddValue('');
      setSelectedProjectId(undefined);
      setSelectedPriority(undefined);
      setSelectedStartDate(undefined);
      setSelectedDueDate(undefined);
      setIsProjectSelectorOpen(false);
      setIsPrioritySelectorOpen(false);
      setIsDateSelectorOpen(false);
      setQuickAddValue('');
      setIsQuickAddOpen(false);
    }
  };

  const handleInlineAdd = (groupId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineAddValue.trim()) return;

    let projectId, priority, dueDate;
    if (groupBy === 'project' && groupId !== 'undefined') projectId = groupId;
    if (groupBy === 'priority' && groupId !== 'undefined') priority = Number(groupId);
    if (groupBy === 'schedule' && groupId !== 'undefined' && groupId !== 'expired') dueDate = groupId;

    onAddTask(inlineAddValue, projectId, undefined, priority, undefined, dueDate);
    setInlineAddValue('');
    setInlineAddGroup(null);
  };

  const TaskItem = ({ task, level = 0 }: { task: Task; level?: number }) => {
    const hasChildren = task.children && task.children.length > 0;
    const [isExpanded, setIsExpanded] = useState(true);

    const priorityColor = {
      1: 'border-red-500 text-red-600',
      2: 'border-orange-500 text-orange-600',
      3: 'border-blue-500 text-blue-600',
      4: 'border-slate-300 text-slate-500'
    }[task.priority || 4];

    return (
      <div className="group">
        <div 
          className={cn(
            "flex items-start gap-3 py-3 px-2 -mx-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer border-b border-transparent hover:border-slate-100",
            task.isCompleted && "opacity-60"
          )}
          style={{ paddingLeft: `${level * 24 + 8}px` }}
          onClick={() => onTaskClick(task)}
        >
          {/* Checkbox / Drag Handle Area */}
          <div className="mt-0.5 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {/* Expand/Collapse for subtasks */}
            <button 
              className={cn(
                "p-0.5 text-slate-400 hover:text-slate-600 rounded transition-opacity",
                hasChildren ? "opacity-100" : "opacity-0 pointer-events-none"
              )}
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>

            {/* Checkbox */}
            <button
              onClick={() => onToggleComplete(task.id)}
              className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                task.isCompleted 
                  ? "bg-slate-400 border-slate-400 text-white" 
                  : cn("bg-transparent hover:bg-slate-100", priorityColor)
              )}
            >
              {task.isCompleted && <Check className="w-3 h-3" />}
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className={cn(
              "text-sm text-slate-800 break-words",
              task.isCompleted && "line-through text-slate-500"
            )}>
              {task.content}
            </div>
            
            {/* Meta Row */}
            <div className="flex items-center gap-3 mt-1.5">
              {task.description && (
                <span className="text-xs text-slate-400 truncate max-w-[200px]">
                  {task.description}
                </span>
              )}
              
              {task.dueDate && (
                <div className="flex items-center gap-1 text-xs text-red-500">
                  <Calendar className="w-3 h-3" />
                  <span>{task.dueDate}</span>
                </div>
              )}

              <div className="flex gap-1.5">
                {task.labels.map(lid => {
                  const label = labels.find(l => l.id === lid);
                  if (!label) return null;
                  return (
                    <span key={lid} className={cn("text-[10px] px-1.5 py-0.5 rounded-full opacity-75", label.color)}>
                      {label.name}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Actions (Visible on Hover) */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 pr-2">
            <button className="p-1 text-slate-400 hover:text-slate-600 rounded">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Recursive Children */}
        {hasChildren && isExpanded && (
          <div className="border-l border-slate-100 ml-[27px]">
             {task.children!.map(child => (
               <TaskItem key={child.id} task={child} level={level + 1} />
             ))}
          </div>
        )}
      </div>
    );
  };

  const renderGroupedTasks = () => {
    if (!groupBy) {
      return tasks.map(task => <TaskItem key={task.id} task={task} />);
    }

    let groups: { id: string | number; label: string; tasks: Task[] }[] = [];

    if (groupBy === 'priority') {
      groups = [
        { id: 'undefined', label: 'No Priority', tasks: [] },
        { id: 1, label: 'Priority 1', tasks: [] },
        { id: 2, label: 'Priority 2', tasks: [] },
        { id: 3, label: 'Priority 3', tasks: [] },
        { id: 4, label: 'Priority 4', tasks: [] },
      ];
      tasks.forEach(task => {
        const group = groups.find(g => g.id === task.priority) || groups[0];
        group.tasks.push(task);
      });
    } else if (groupBy === 'schedule') {
        const getDateToGroup = (task: Task) => task.startDate || task.dueDate;
        
        const uniqueDates = Array.from(new Set(tasks.map(getDateToGroup).filter(d => !!d))) as string[];
        const sortedDates = uniqueDates.sort((a, b) => {
            if (a === 'Today') return -1;
            if (b === 'Today') return 1;
            if (a === 'Tomorrow') return -1;
            if (b === 'Tomorrow') return 1;
            return a.localeCompare(b);
        });
        
        groups = [
            { id: 'undefined', label: 'No Date', tasks: [] },
            { id: 'expired', label: 'Expired', tasks: [] },
            ...sortedDates.map(date => ({ id: date, label: date, tasks: [] }))
        ];

        tasks.forEach(task => {
            const dateStr = getDateToGroup(task);
            if (!dateStr) {
                groups.find(g => g.id === 'undefined')?.tasks.push(task);
            } else if (dateStr.startsWith('2023')) { // Mock expired logic
                 groups.find(g => g.id === 'expired')?.tasks.push(task);
            } else {
                groups.find(g => g.id === dateStr)?.tasks.push(task);
            }
        });

         groups = [
             { id: 'undefined', label: 'No Project', tasks: [] },
             ...projects.map(p => ({ id: p.id, label: p.name, tasks: [] }))
         ];
         tasks.forEach(task => {
             if (!task.projectId || task.projectId === 'inbox') {
                 groups.find(g => g.id === 'undefined')?.tasks.push(task);
             } else {
                 let targetGroupId = task.projectId;
                 if (!groups.find(g => g.id === targetGroupId)) {
                     targetGroupId = 'undefined';
                 }
                 groups.find(g => g.id === targetGroupId)?.tasks.push(task);
             }
         });
    } else if (groupBy === 'label') {
        groups = [
            { id: 'undefined', label: 'No Label', tasks: [] },
            ...labels.map(l => ({ id: l.id, label: l.name, tasks: [] }))
        ];
        tasks.forEach(task => {
            if (task.labels.length === 0) {
                groups.find(g => g.id === 'undefined')?.tasks.push(task);
            } else {
                // A task can belong to multiple label groups, but for list view grouping usually we pick primary or duplicate
                // For simplicity, let's just group by the first label found, or duplicate if needed.
                // Let's duplicate for now if it has multiple labels to match Board view behavior? 
                // Actually Board view filters tasks for each column.
                // Let's iterate groups and check if task belongs to it.
                groups.forEach(g => {
                    if (g.id === 'undefined' && task.labels.length === 0) {
                        g.tasks.push(task);
                    } else if (task.labels.includes(g.id as string)) {
                        g.tasks.push(task);
                    }
                });
                // Note: This means a task might appear multiple times in 'label' view list
            }
        });
    }

    return groups.map(group => (
      <div key={group.id} className="mb-6">
        <h3 className="text-sm font-semibold text-slate-500 mb-2 flex items-center gap-2">
            {group.label} 
            <span className="text-xs font-normal bg-slate-100 px-1.5 rounded-full">{group.tasks.length}</span>
        </h3>
        <div className="space-y-1">

          {group.tasks.length === 0 ? (
            <div className="text-sm text-slate-400 py-2 italic pl-[32px]">No tasks</div>
          ) : (
            group.tasks.map(task => (
              <TaskItem key={`${group.id}-${task.id}`} task={task} />
            ))
          )}
          
          {inlineAddGroup === group.id ? (
            <form onSubmit={(e) => handleInlineAdd(group.id as string, e)} className="mt-2 flex items-center gap-2 pl-[32px]">
               <input 
                 autoFocus
                 type="text"
                 value={inlineAddValue}
                 onChange={(e) => setInlineAddValue(e.target.value)}
                 onBlur={() => setInlineAddGroup(null)}
                 placeholder="Type task name and press Enter..."
                 className="w-full text-sm border-b border-indigo-200 outline-none pb-1 focus:border-indigo-500 bg-transparent text-slate-700 placeholder:text-slate-400"
               />
            </form>
          ) : (
            <button 
              onClick={() => setInlineAddGroup(group.id as string)}
              className="group flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition-colors px-2 py-1.5 w-full text-left mt-1 pl-[32px]"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm">Add task</span>
            </button>
          )}
        </div>
      </div>
    ));
  };

  return (
    <div className="pb-20">

      {/* Quick Add Button / Form */}
      <div className="mb-4">
        {!isQuickAddOpen ? (
          <button 
            onClick={() => setIsQuickAddOpen(true)}
            className="group flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors px-2 py-2 w-full text-left"
          >
            <div className="w-5 h-5 rounded-full flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors text-indigo-600">
              <Plus className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium">Add task</span>
          </button>
        ) : (
          <form onSubmit={handleQuickAdd} className="border border-slate-200 rounded-lg p-3 shadow-sm bg-white animate-in fade-in zoom-in-95 duration-200">
            <input
              autoFocus
              type="text"
              value={quickAddValue}
              onChange={(e) => setQuickAddValue(e.target.value)}
              placeholder="Task name"
              className="w-full text-sm font-medium placeholder:text-slate-400 focus:outline-none mb-3"
            />
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <div className="flex gap-2">
                <div className="relative">
                  <button 
                    type="button" 
                    onClick={() => setIsDateSelectorOpen(!isDateSelectorOpen)}
                    className={cn(
                      "p-1.5 rounded border flex items-center gap-1 transition-colors",
                      selectedStartDate || selectedDueDate 
                        ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100" 
                        : "text-slate-400 hover:bg-slate-100 border-slate-200 hover:text-slate-600"
                    )}
                    title="Duration"
                  >
                    <Calendar className="w-4 h-4" />
                    {(selectedStartDate || selectedDueDate) && (
                      <span className="text-xs font-medium">
                        {selectedStartDate ? selectedStartDate : '...'} - {selectedDueDate ? selectedDueDate : '...'}
                      </span>
                    )}
                  </button>
                  {isDateSelectorOpen && (
                    <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-lg z-50 p-3">
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-medium text-slate-500">Start Date</label>
                          <input
                            type="date"
                            value={selectedStartDate || ''}
                            onChange={(e) => setSelectedStartDate(e.target.value)}
                            className="text-sm border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-medium text-slate-500">End Date</label>
                          <input
                            type="date"
                            value={selectedDueDate || ''}
                            onChange={(e) => setSelectedDueDate(e.target.value)}
                            className="text-sm border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div 
                          className="text-xs text-slate-400 hover:text-red-500 cursor-pointer text-center pt-2 border-t border-slate-50"
                          onClick={() => { setSelectedStartDate(undefined); setSelectedDueDate(undefined); setIsDateSelectorOpen(false); }}
                        >
                          Clear Duration
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <button 
                    type="button" 
                    onClick={() => setIsPrioritySelectorOpen(!isPrioritySelectorOpen)}
                    className={cn(
                      "p-1.5 rounded border flex items-center gap-1 transition-colors",
                      selectedPriority 
                        ? cn("bg-opacity-10 border-opacity-20", 
                             selectedPriority === 1 ? "bg-red-500 text-red-600 border-red-500" :
                             selectedPriority === 2 ? "bg-orange-500 text-orange-600 border-orange-500" :
                             selectedPriority === 3 ? "bg-blue-500 text-blue-600 border-blue-500" : 
                             "bg-slate-500 text-slate-600 border-slate-500")
                        : "text-slate-400 hover:bg-slate-100 border-slate-200 hover:text-slate-600"
                    )}
                    title="Priority"
                  >
                    <Flag className={cn("w-4 h-4", selectedPriority && "fill-current")} />
                    {selectedPriority && <span className="text-xs font-medium">P{selectedPriority}</span>}
                  </button>
                  {isPrioritySelectorOpen && (
                    <div className="absolute top-full left-0 mt-1 w-32 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1">
                      {[1, 2, 3, 4].map(p => (
                        <div 
                          key={p}
                          className="px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm flex items-center gap-2"
                          onClick={() => { setSelectedPriority(p); setIsPrioritySelectorOpen(false); }}
                        >
                          <Flag className={cn("w-3 h-3", 
                            p === 1 ? "text-red-600 fill-red-600" :
                            p === 2 ? "text-orange-600 fill-orange-600" :
                            p === 3 ? "text-blue-600 fill-blue-600" : "text-slate-400"
                          )} />
                          <span className="text-slate-600">Priority {p}</span>
                          {selectedPriority === p && <Check className="w-3 h-3 ml-auto text-indigo-600" />}
                        </div>
                      ))}
                      <div 
                        className="px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm text-slate-400 border-t border-slate-50 mt-1"
                        onClick={() => { setSelectedPriority(undefined); setIsPrioritySelectorOpen(false); }}
                      >
                        No Priority
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="relative">
                  <button 
                    type="button" 
                    onClick={() => setIsProjectSelectorOpen(!isProjectSelectorOpen)}
                    className={cn(
                      "p-1.5 rounded border flex items-center gap-1 transition-colors",
                      selectedProjectId 
                        ? "bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100" 
                        : "text-slate-400 hover:bg-slate-100 border-slate-200 hover:text-slate-600"
                    )}
                    title="Project"
                  >
                    <Folder className="w-4 h-4" />
                    {selectedProjectId && (
                      <span className="text-xs font-medium max-w-[80px] truncate">
                        {allProjects.find(p => p.id === selectedProjectId)?.name}
                      </span>
                    )}
                  </button>

                  {isProjectSelectorOpen && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto py-1">
                      <div 
                        className="px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm text-slate-600 flex items-center gap-2"
                        onClick={() => { setSelectedProjectId(undefined); setIsProjectSelectorOpen(false); }}
                      >
                        <div className="w-4 h-4 flex items-center justify-center">
                           <Inbox className="w-3 h-3 text-slate-400" />
                        </div>
                        <span>Inbox</span>
                        {!selectedProjectId && <Check className="w-3 h-3 ml-auto text-indigo-600" />}
                      </div>
                      {allProjects.map(p => (
                        <div 
                          key={p.id} 
                          className="px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm text-slate-600 flex items-center gap-2"
                          style={{ paddingLeft: `${p.level * 12 + 12}px` }}
                          onClick={() => { setSelectedProjectId(p.id); setIsProjectSelectorOpen(false); }}
                        >
                          <span className={cn("w-2 h-2 rounded-full flex-shrink-0", p.color.replace('text-', 'bg-'))} />
                          <span className="truncate">{p.name}</span>
                          {selectedProjectId === p.id && <Check className="w-3 h-3 ml-auto text-indigo-600" />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button type="button" className="p-1.5 text-slate-400 hover:bg-slate-100 rounded border border-slate-200 hover:text-slate-600" title="Label">
                  <Tag className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsQuickAddOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={!quickAddValue.trim()}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Task
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Task List */}
      <div className="space-y-1">
        {renderGroupedTasks()}
      </div>
    </div>
  );
}
