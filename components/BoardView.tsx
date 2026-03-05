'use client';

import { useState, useMemo } from 'react';
import { Task, Priority, Project, Label } from '@/lib/data';
import { cn } from '@/lib/utils';
import { 
  MoreHorizontal, 
  Plus, 
  Calendar, 
  Flag, 
  CheckCircle2, 
  Circle,
  GripVertical
} from 'lucide-react';
import {
  DndContext, 
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  DropAnimation,
  useDroppable
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface BoardViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onToggleComplete: (taskId: string) => void;
  onUpdateTask?: (taskId: string, updates: Partial<Task>) => void;
  onAddTask: (content: string, projectId?: string, parentId?: string, priority?: number, startDate?: string, dueDate?: string) => void;
  groupBy?: 'priority' | 'project' | 'label' | 'schedule';
  projects: Project[];
  labels: Label[];
}

// --- Sortable Task Item ---
function SortableTaskItem({ task, onClick, onToggleComplete, labels }: { task: Task; onClick: () => void; onToggleComplete: () => void; labels: Label[] }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id, data: { type: 'Task', task } });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  if (isDragging) {
    return (
      <div 
        ref={setNodeRef} 
        style={style} 
        className="opacity-30 bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg h-[100px]"
      />
    );
  }

  const priorityColor = {
    1: 'text-red-600 bg-red-50 border-red-200',
    2: 'text-orange-600 bg-orange-50 border-orange-200',
    3: 'text-blue-600 bg-blue-50 border-blue-200',
    4: 'text-slate-500 bg-slate-50 border-slate-200'
  }[task.priority || 4];

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="bg-white p-3 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-slate-200/80 hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] transition-all cursor-grab active:cursor-grabbing group/card"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleComplete();
            }}
            className={cn(
              "mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center transition-all flex-shrink-0 active:scale-90 hover:scale-110",
              task.isCompleted 
                ? "bg-indigo-600 border-indigo-600 text-white" 
                : "border-slate-300 hover:border-indigo-500 text-transparent hover:text-indigo-500"
            )}
            title={task.isCompleted ? "Mark as incomplete" : "Mark as complete"}
          >
            {task.isCompleted && <CheckCircle2 className="w-3 h-3 animate-in zoom-in-50 duration-200" />}
          </button>
          <span className={cn(
            "text-sm font-medium text-slate-800 line-clamp-2",
            task.isCompleted && "line-through text-slate-400"
          )}>
            {task.content}
          </span>
        </div>
        <button 
          className="text-slate-400 hover:text-slate-600 opacity-0 group-hover/card:opacity-100 transition-opacity"
          title="More actions"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>
      
      <div className="mt-3 flex items-center gap-2 flex-wrap">
        {(task.startDate || task.dueDate) && (
          <div className={cn(
            "flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border text-slate-500 bg-slate-50 border-slate-200"
          )}>
            <Calendar className="w-3 h-3" />
            <span>
              {task.startDate ? task.startDate : ''} 
              {task.startDate && task.dueDate ? ' - ' : ''}
              {task.dueDate ? task.dueDate : ''}
            </span>
          </div>
        )}
        
        <div className={cn("flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border", priorityColor)}>
          <Flag className="w-3 h-3" />
          <span>P{task.priority || 4}</span>
        </div>

        {task.labels.map(lid => {
           const label = labels.find(l => l.id === lid);
           if (!label) return null;
           return (
             <div key={lid} className={cn("text-[10px] px-1.5 py-0.5 rounded border opacity-75", label.color)}>
               {label.name}
             </div>
           );
        })}
      </div>
    </div>
  );
}
// --- Droppable Column ---
function BoardColumn({ id, title, count, tasks, onTaskClick, onToggleComplete, onAddTask, groupBy, labels }: { 
  id: string | number; 
  title: string; 
  count: number; 
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onToggleComplete: (taskId: string) => void;
  onAddTask: (content: string, projectId?: string, parentId?: string, priority?: number, startDate?: string, dueDate?: string) => void;
  groupBy?: 'priority' | 'project' | 'label' | 'schedule';
  labels: Label[];
}) {
  const { setNodeRef } = useDroppable({ id });
  const [isAdding, setIsAdding] = useState(false);
  const [content, setContent] = useState('');

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    let projectId: string | undefined;
    let priority: number | undefined;
    let startDate: string | undefined;
    let dueDate: string | undefined;

    if (groupBy === 'priority') {
        if (id !== 'undefined') priority = Number(id);
    } else if (groupBy === 'schedule') {
        if (id !== 'undefined' && id !== 'expired') dueDate = id as string;
    } else if (groupBy === 'project') {
        if (id !== 'undefined') projectId = id as string;
    }

    onAddTask(content, projectId, undefined, priority, startDate, dueDate);
    setContent('');
    setIsAdding(false);
  };

  return (
    <div ref={setNodeRef} className="flex-shrink-0 w-72 flex flex-col h-full max-h-full">
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="font-semibold text-slate-700 flex items-center gap-2">
          {title}
          <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
            {count}
          </span>
        </h3>
        <button 
          onClick={() => setIsAdding(true)}
          className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto px-1 pb-4">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3 min-h-[100px]">
            {isAdding && (
              <form onSubmit={handleAddSubmit} className="bg-white p-3 rounded-lg shadow-sm border border-indigo-200 mb-3">
                <input
                  autoFocus
                  type="text"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Task name..."
                  className="w-full text-sm mb-2 focus:outline-none"
                  onBlur={() => !content && setIsAdding(false)}
                />
                <div className="flex justify-end gap-2">
                  <button 
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="text-xs text-slate-500 hover:bg-slate-100 px-2 py-1 rounded"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={!content.trim()}
                    className="text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
              </form>
            )}
            {tasks.map(task => (
              <SortableTaskItem 
                key={task.id} 
                task={task} 
                onClick={() => onTaskClick(task)}
                onToggleComplete={() => onToggleComplete(task.id)}
                labels={labels}
              />
            ))}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}

export function BoardView({ tasks, onTaskClick, onToggleComplete, onUpdateTask, onAddTask, groupBy, projects, labels }: BoardViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Require slight movement to start drag, preventing accidental drags on click
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Group tasks logic (similar to TaskList but returns columns)
  const columns = useMemo(() => {
    let cols: { id: string | number; title: string; tasks: Task[] }[] = [];

    if (groupBy === 'priority') {
      cols = [
        { id: 'undefined', title: 'No Priority', tasks: [] },
        { id: 1, title: 'Priority 1', tasks: [] },
        { id: 2, title: 'Priority 2', tasks: [] },
        { id: 3, title: 'Priority 3', tasks: [] },
        { id: 4, title: 'Priority 4', tasks: [] },
      ];
      tasks.forEach(task => {
        const col = cols.find(c => c.id === (task.priority || 'undefined')) || cols[0];
        col.tasks.push(task);
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
        
        cols = [
            { id: 'undefined', title: 'No Date', tasks: [] },
            { id: 'expired', title: 'Expired', tasks: [] },
            ...sortedDates.map(date => ({ id: date, title: date, tasks: [] }))
        ];

        tasks.forEach(task => {
            const dateStr = getDateToGroup(task);
            if (!dateStr) {
                cols.find(c => c.id === 'undefined')?.tasks.push(task);
            } else if (dateStr.startsWith('2023')) { // Mock expired logic
                 cols.find(c => c.id === 'expired')?.tasks.push(task);
            } else {
                cols.find(c => c.id === dateStr)?.tasks.push(task);
            }
        });

    } else if (groupBy === 'project') {
         cols = [
             { id: 'undefined', title: 'No Project', tasks: [] },
             ...projects.map(p => ({ id: p.id, title: p.name, tasks: [] }))
         ];
         tasks.forEach(task => {
             if (!task.projectId || task.projectId === 'inbox') {
                 cols.find(c => c.id === 'undefined')?.tasks.push(task);
             } else {
                 let targetGroupId = task.projectId;
                 if (!cols.find(c => c.id === targetGroupId)) {
                     targetGroupId = 'undefined';
                 }
                 cols.find(c => c.id === targetGroupId)?.tasks.push(task);
             }
         });
    } else if (groupBy === 'label') {
        cols = [
            { id: 'undefined', title: 'No Label', tasks: [] },
            ...labels.map(l => ({ id: l.id, title: l.name, tasks: [] }))
        ];
        tasks.forEach(task => {
            if (task.labels.length === 0) {
                cols.find(c => c.id === 'undefined')?.tasks.push(task);
            } else {
                cols.forEach(c => {
                    if (c.id === 'undefined' && task.labels.length === 0) {
                        c.tasks.push(task);
                    } else if (task.labels.includes(c.id as string)) {
                        c.tasks.push(task);
                    }
                });
            }
        });
    } else {
        // Default to priority if undefined
         cols = [
            { id: 'undefined', title: 'No Priority', tasks: [] },
            { id: 1, title: 'Priority 1', tasks: [] },
            { id: 2, title: 'Priority 2', tasks: [] },
            { id: 3, title: 'Priority 3', tasks: [] },
            { id: 4, title: 'Priority 4', tasks: [] },
          ];
          tasks.forEach(task => {
            const col = cols.find(c => c.id === (task.priority || 'undefined')) || cols[0];
            col.tasks.push(task);
          });
    }
    return cols;
  }, [tasks, groupBy, projects, labels]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeTask = tasks.find(t => t.id === active.id);
    if (!activeTask) return;

    // Find which column we dropped into
    // If dropped on a task, find that task's column
    // If dropped on a column, use that column's id
    let targetColumnId = over.id;
    
    // Check if over.id is a task id
    const overTask = tasks.find(t => t.id === over.id);
    if (overTask) {
        // Find the column containing this task
        const col = columns.find(c => c.tasks.some(t => t.id === overTask.id));
        if (col) targetColumnId = col.id;
    }

    // If we are still in the same column (and just reordering), we might skip update logic for now
    // unless we implement reordering persistence.
    // But we need to check if the column changed.
    
    // Find source column
    const sourceColumn = columns.find(c => c.tasks.some(t => t.id === activeTask.id));
    if (!sourceColumn) return;

    if (sourceColumn.id === targetColumnId) {
        // Same column, just reordering. 
        // For prototype, we don't persist order, so do nothing.
        return;
    }

    // Column changed, update task
    if (onUpdateTask) {
        const updates: Partial<Task> = {};
        
        if (groupBy === 'priority') {
            if (targetColumnId === 'undefined') {
                updates.priority = undefined;
            } else {
                updates.priority = Number(targetColumnId) as Priority;
            }
        } else if (groupBy === 'schedule') {
            if (targetColumnId === 'undefined') {
                updates.dueDate = undefined;
            } else if (targetColumnId === 'expired') {
                // Set to yesterday for expired
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                updates.dueDate = yesterday.toISOString().split('T')[0];
            } else {
                updates.dueDate = targetColumnId as string;
            }
        } else if (groupBy === 'project') {
            if (targetColumnId === 'undefined') {
                updates.projectId = 'inbox';
            } else {
                updates.projectId = targetColumnId as string;
            }
        } else if (groupBy === 'label') {
             // Handle labels
             const targetLabelId = targetColumnId as string;
             const sourceLabelId = sourceColumn.id as string;
             
             let newLabels = [...activeTask.labels];
             
             // Remove from source label group
             if (sourceLabelId !== 'undefined') {
                 newLabels = newLabels.filter(l => l !== sourceLabelId);
             }
             
             // Add to target label group
             if (targetLabelId !== 'undefined') {
                 if (!newLabels.includes(targetLabelId)) {
                     newLabels.push(targetLabelId);
                 }
             }
             
             updates.labels = newLabels;
        }

        onUpdateTask(activeTask.id, updates);
    }
  };

  const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: '0.4',
        },
      },
    }),
  };

  const activeTask = useMemo(() => tasks.find(t => t.id === activeId), [tasks, activeId]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="h-full overflow-x-auto">
        <div className="flex h-full gap-6 p-6 min-w-max">
          {columns.map(col => (
            <BoardColumn 
              key={col.id} 
              id={col.id} 
              title={col.title} 
              count={col.tasks.length} 
              tasks={col.tasks}
              onTaskClick={onTaskClick}
              onToggleComplete={onToggleComplete}
              onAddTask={onAddTask}
              groupBy={groupBy}
              labels={labels}
            />
          ))}
        </div>
      </div>
      <DragOverlay dropAnimation={dropAnimation}>
        {activeTask ? (
           <div className="bg-white p-4 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.1)] border border-indigo-100 w-[280px] rotate-[2deg] cursor-grabbing scale-105 transition-transform duration-200">
             <div className="flex items-start justify-between gap-2">
               <div className="flex items-start gap-2">
                 <div className={cn(
                   "mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center",
                   activeTask.isCompleted 
                     ? "bg-indigo-600 border-indigo-600 text-white" 
                     : "border-slate-300"
                 )}>
                   {activeTask.isCompleted && <CheckCircle2 className="w-3 h-3" />}
                 </div>
                 <span className="text-sm font-semibold text-slate-800 line-clamp-2">
                   {activeTask.content}
                 </span>
               </div>
             </div>
           </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
