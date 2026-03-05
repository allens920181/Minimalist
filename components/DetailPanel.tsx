'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Flag, 
  Calendar, 
  Tag, 
  MoreHorizontal, 
  CheckCircle2, 
  Trash2,
  Clock,
  Folder,
  CornerUpLeft,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Task, Priority, LABELS, PROJECTS } from '@/lib/data';

interface DetailPanelProps {
  task: Task | null;
  parentTask?: Task;
  isOpen: boolean;
  onClose: () => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
  onTaskClick: (task: Task) => void;
  onAddTask: (content: string, projectId?: string, parentId?: string) => void;
}

export function DetailPanel({ task, isOpen, onClose, onUpdateTask, onDeleteTask, onTaskClick, onAddTask, parentTask }: DetailPanelProps) {
  const [content, setContent] = useState(task?.content || '');
  const [description, setDescription] = useState(task?.description || '');
  const [isProjectWarningOpen, setIsProjectWarningOpen] = useState(false);
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [subtaskContent, setSubtaskContent] = useState('');
  const [isProjectSelectorOpen, setIsProjectSelectorOpen] = useState(false);
  const [pendingProjectId, setPendingProjectId] = useState<string | null>(null);

  const allProjects = React.useMemo(() => {
      const flat: { id: string; name: string; color: string; level: number }[] = [];
      PROJECTS.forEach(p => {
          flat.push({ ...p, level: 0 });
          if (p.children) {
              p.children.forEach(c => flat.push({ ...c, level: 1 }));
          }
      });
      return flat;
  }, []);

  if (!task) return null;

  const priorityColors = {
    1: 'text-red-600',
    2: 'text-orange-500',
    3: 'text-blue-500',
    4: 'text-slate-400'
  };

  const currentProject = PROJECTS.find(p => p.id === task.projectId) || 
                         PROJECTS.flatMap(p => p.children || []).find(p => p.id === task.projectId);
  
  const handleProjectSelect = (projectId: string) => {
    if (task.parentId || parentTask) {
      setPendingProjectId(projectId);
      setIsProjectWarningOpen(true);
    } else {
      onUpdateTask(task.id, { projectId });
      setIsProjectSelectorOpen(false);
    }
  };

  const confirmProjectChange = () => {
    if (pendingProjectId) {
      // Detach from parent and change project
      onUpdateTask(task.id, { projectId: pendingProjectId, parentId: undefined });
      setIsProjectWarningOpen(false);
      setPendingProjectId(null);
      setIsProjectSelectorOpen(false);
    }
  };

  return (
    <>
      {/* Overlay for mobile */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/10 z-30 lg:hidden transition-opacity",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      <div 
        className={cn(
          "fixed inset-y-0 right-0 z-40 w-full sm:w-[400px] bg-white shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col border-l border-slate-100",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            {/* Project moved to metadata grid */}
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => onDeleteTask(task.id)}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
              title="Delete task"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Main Task Input */}
          <div className="flex gap-3">
            <button 
              className={cn(
                "mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0",
                task.isCompleted 
                  ? "bg-slate-400 border-slate-400 text-white" 
                  : cn("border-slate-300 hover:bg-slate-50", 
                       task.priority === 1 && "border-red-500 bg-red-50/50",
                       task.priority === 2 && "border-orange-500 bg-orange-50/50",
                       task.priority === 3 && "border-blue-500 bg-blue-50/50"
                    )
              )}
              onClick={() => onUpdateTask(task.id, { isCompleted: !task.isCompleted })}
            >
              {task.isCompleted && <CheckCircle2 className="w-3.5 h-3.5" />}
            </button>
            
            <div className="flex-1 space-y-4">
              <textarea
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  // Debounce update in real app
                  onUpdateTask(task.id, { content: e.target.value });
                }}
                className={cn(
                  "w-full bg-transparent text-xl font-semibold text-slate-900 placeholder:text-slate-400 resize-none focus:outline-none min-h-[40px]",
                  task.isCompleted && "line-through text-slate-500"
                )}
                placeholder="Task name"
                rows={1}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = target.scrollHeight + 'px';
                }}
              />
              
              <textarea
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  onUpdateTask(task.id, { description: e.target.value });
                }}
                className="w-full bg-transparent text-sm text-slate-600 placeholder:text-slate-400 resize-none focus:outline-none min-h-[120px]"
                placeholder="Description / Notes..."
              />
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-[100px_1fr] gap-y-4 text-sm">
            
            {/* Parent Task */}
            {parentTask && (
              <>
                <div className="flex items-center gap-2 text-slate-500">
                  <CornerUpLeft className="w-4 h-4" />
                  <span>Parent Task</span>
                </div>
                <button 
                  onClick={() => onTaskClick(parentTask)}
                  className="text-slate-700 hover:bg-slate-50 p-1 -ml-1 rounded cursor-pointer w-fit flex items-center gap-2 text-left"
                >
                  <span className="w-2 h-2 rounded-full border border-slate-400 flex-shrink-0"></span>
                  <span className="truncate max-w-[200px]">{parentTask.content}</span>
                </button>
              </>
            )}

            {/* Duration */}
            <div className="flex items-center gap-2 text-slate-500">
              <Calendar className="w-4 h-4" />
              <span>Duration</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={task.startDate || ''}
                onChange={(e) => onUpdateTask(task.id, { startDate: e.target.value })}
                className="text-sm border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-indigo-500 text-slate-700"
              />
              <span className="text-slate-400">-</span>
              <input
                type="date"
                value={task.dueDate || ''}
                onChange={(e) => onUpdateTask(task.id, { dueDate: e.target.value })}
                className="text-sm border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-indigo-500 text-slate-700"
              />
            </div>

            {/* Project */}
            <div className="flex items-center gap-2 text-slate-500">
              <Folder className="w-4 h-4" />
              <span>Project</span>
            </div>
            <div className="relative">
              <button 
                onClick={() => setIsProjectSelectorOpen(!isProjectSelectorOpen)}
                className="text-slate-700 hover:bg-slate-50 p-1 -ml-1 rounded cursor-pointer w-fit flex items-center gap-2 text-left"
              >
                <span className={cn("w-2 h-2 rounded-full flex-shrink-0", currentProject ? currentProject.color.replace('text-', 'bg-') : "bg-slate-400")} />
                {currentProject ? currentProject.name : 'Inbox'}
              </button>
              
              {isProjectSelectorOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsProjectSelectorOpen(false)} />
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto py-1">
                    <div 
                      className="px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm text-slate-600 flex items-center gap-2"
                      onClick={() => handleProjectSelect('inbox')}
                    >
                      <div className="w-4 h-4 flex items-center justify-center">
                          <Folder className="w-3 h-3 text-slate-400" />
                      </div>
                      <span>Inbox</span>
                      {task.projectId === 'inbox' && <CheckCircle2 className="w-3 h-3 ml-auto text-indigo-600" />}
                    </div>
                    {allProjects.map(p => (
                      <div 
                        key={p.id} 
                        className="px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm text-slate-600 flex items-center gap-2"
                        style={{ paddingLeft: `${p.level * 12 + 12}px` }}
                        onClick={() => handleProjectSelect(p.id)}
                      >
                        <span className={cn("w-2 h-2 rounded-full flex-shrink-0", p.color.replace('text-', 'bg-'))} />
                        <span className="truncate">{p.name}</span>
                        {task.projectId === p.id && <CheckCircle2 className="w-3 h-3 ml-auto text-indigo-600" />}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Priority */}
            <div className="flex items-center gap-2 text-slate-500">
              <Flag className="w-4 h-4" />
              <span>Priority</span>
            </div>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((p) => (
                <button
                  key={p}
                  onClick={() => onUpdateTask(task.id, { priority: p as Priority })}
                  className={cn(
                    "w-6 h-6 rounded flex items-center justify-center border transition-all",
                    task.priority === p 
                      ? cn("border-current bg-current/10", priorityColors[p as Priority]) 
                      : "border-transparent text-slate-300 hover:text-slate-500"
                  )}
                >
                  <Flag className="w-3.5 h-3.5 fill-current" />
                </button>
              ))}
            </div>

            {/* Labels */}
            <div className="flex items-center gap-2 text-slate-500">
              <Tag className="w-4 h-4" />
              <span>Labels</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {task.labels.map(labelId => {
                const label = LABELS.find(l => l.id === labelId);
                if (!label) return null;
                return (
                  <span key={label.id} className={cn("px-2 py-0.5 rounded text-xs", label.color)}>
                    {label.name}
                  </span>
                );
              })}
              <button className="text-slate-400 hover:text-slate-600 text-xs flex items-center gap-1 px-2 py-0.5 rounded border border-dashed border-slate-300 hover:border-slate-400">
                <Plus className="w-3 h-3" /> Add label
              </button>
            </div>
          </div>

          {/* Subtasks Placeholder */}
          <div className="pt-6 border-t border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Sub-tasks</h3>
            <div className="space-y-2">
              {task.children?.map(sub => (
                <div 
                  key={sub.id} 
                  onClick={() => onTaskClick(sub)}
                  className="flex items-center gap-2 p-2 rounded hover:bg-slate-50 text-sm text-slate-600 cursor-pointer group"
                >
                  <div className={cn("w-4 h-4 rounded-full border flex items-center justify-center", sub.isCompleted ? "bg-slate-400 border-slate-400" : "border-slate-300")}>
                    {sub.isCompleted && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </div>
                  <span className={cn(sub.isCompleted && "line-through text-slate-400")}>{sub.content}</span>
                </div>
              ))}
              
              {isAddingSubtask ? (
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (subtaskContent.trim()) {
                      onAddTask(subtaskContent, task.projectId, task.id);
                      setSubtaskContent('');
                      setIsAddingSubtask(false);
                    }
                  }}
                  className="flex items-center gap-2 p-2"
                >
                  <div className="w-4 h-4 rounded-full border border-slate-300" />
                  <input
                    autoFocus
                    type="text"
                    value={subtaskContent}
                    onChange={(e) => setSubtaskContent(e.target.value)}
                    placeholder="Type a name..."
                    className="flex-1 text-sm bg-transparent focus:outline-none"
                    onBlur={() => {
                      if (!subtaskContent.trim()) setIsAddingSubtask(false);
                    }}
                  />
                </form>
              ) : (
                <button 
                  onClick={() => setIsAddingSubtask(true)}
                  className="flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 px-2 py-1 w-full text-left"
                >
                  <Plus className="w-4 h-4" />
                  Add sub-task
                </button>
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 text-xs text-slate-400 flex justify-between">
          <span>Created today</span>
          <span>ID: {task.id}</span>
        </div>
      </div>

      {/* Project Change Warning Modal */}
      {isProjectWarningOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center gap-3 text-amber-600 mb-4">
                <div className="p-2 bg-amber-100 rounded-full">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Warning</h3>
              </div>
              <p className="text-slate-600 mb-6">
                This action will remove the task association. Do you want to proceed?
              </p>
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => {
                    setIsProjectWarningOpen(false);
                    setPendingProjectId(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmProjectChange}
                  className="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Plus(props: any) {
  return (
    <svg 
      {...props}
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  )
}
