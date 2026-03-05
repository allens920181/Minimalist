'use client';

import React from 'react';
import { Task, Priority, LABELS, PROJECTS } from '@/lib/data';
import { cn } from '@/lib/utils';

interface GanttViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  groupBy?: 'priority' | 'project' | 'label' | 'schedule';
}

export function GanttView({ tasks, onTaskClick, groupBy }: GanttViewProps) {
  const today = new Date();
  const daysToShow = 14; 
  
  const dates = Array.from({ length: daysToShow }, (_, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    return date;
  });

  const getTaskPosition = (task: Task) => {
    let startOffset = 0;
    let duration = 1;

    const taskStart = task.startDate ? new Date(task.startDate) : null;
    const taskEnd = task.dueDate && !['Today', 'Tomorrow'].includes(task.dueDate) ? new Date(task.dueDate) : null;

    // If we have real dates (YYYY-MM-DD), calculate offset from 'today'
    if (taskStart || taskEnd) {
        // Reset today to midnight for comparison
        const todayMidnight = new Date(today);
        todayMidnight.setHours(0,0,0,0);

        const effectiveStart = taskStart || taskEnd || todayMidnight;
        const effectiveEnd = taskEnd || taskStart || todayMidnight;
        
        // Calculate diff in days from today
        const diffTime = effectiveStart.getTime() - todayMidnight.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        startOffset = diffDays;
        
        if (taskStart && taskEnd) {
            const durationTime = effectiveEnd.getTime() - effectiveStart.getTime();
            duration = Math.ceil(durationTime / (1000 * 60 * 60 * 24)) + 1;
        } else {
            duration = 1;
        }
    } else {
        // Fallback to old logic for mock data strings
        if (task.dueDate === 'Today') {
            startOffset = 0;
        } else if (task.dueDate === 'Tomorrow') {
            startOffset = 1;
        } else if (task.dueDate) {
            // Simple mock parsing for prototype if it's some other string
            startOffset = 2; 
        } else {
            return null; 
        }
        
        // Randomize duration for visual effect in prototype based on content length
        duration = (task.content.length % 3) + 1; 
    }

    return { startOffset, duration };
  };

  const renderGroupedRows = () => {
    if (!groupBy) {
        return tasks.map(task => renderTaskRow(task));
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
        const uniqueDates = Array.from(new Set(tasks.map(t => t.dueDate).filter(d => !!d))) as string[];
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
            if (!task.dueDate) {
                groups.find(g => g.id === 'undefined')?.tasks.push(task);
            } else if (task.dueDate.startsWith('2023')) { // Mock expired logic
                 groups.find(g => g.id === 'expired')?.tasks.push(task);
            } else {
                groups.find(g => g.id === task.dueDate)?.tasks.push(task);
            }
        });

    } else if (groupBy === 'project') {
         const allProjects = [...PROJECTS, ...PROJECTS.flatMap(p => p.children || [])];
         groups = [
             { id: 'undefined', label: 'No Project', tasks: [] },
             ...allProjects.map(p => ({ id: p.id, label: p.name, tasks: [] }))
         ];
         tasks.forEach(task => {
             if (!task.projectId || task.projectId === 'inbox') {
                 groups.find(g => g.id === 'undefined')?.tasks.push(task);
             } else {
                 groups.find(g => g.id === task.projectId)?.tasks.push(task);
             }
         });
    } else if (groupBy === 'label') {
        groups = [
            { id: 'undefined', label: 'No Label', tasks: [] },
            ...LABELS.map(l => ({ id: l.id, label: l.name, tasks: [] }))
        ];
        tasks.forEach(task => {
            if (task.labels.length === 0) {
                groups.find(g => g.id === 'undefined')?.tasks.push(task);
            } else {
                groups.forEach(g => {
                    if (g.id === 'undefined' && task.labels.length === 0) {
                        g.tasks.push(task);
                    } else if (task.labels.includes(g.id as string)) {
                        g.tasks.push(task);
                    }
                });
            }
        });
    }

    return groups.filter(g => g.tasks.length > 0).map(group => (
        <React.Fragment key={group.id}>
            <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 font-semibold text-xs text-slate-500 sticky left-0 z-10">
                {group.label} ({group.tasks.length})
            </div>
            {group.tasks.map(task => renderTaskRow(task))}
        </React.Fragment>
    ));
  };

  const renderTaskRow = (task: Task, depth = 0) => {
    const pos = getTaskPosition(task);
    const start = pos ? pos.startOffset : 0;
    const span = pos ? pos.duration : 1;
    const hasDate = !!pos;

    return (
      <React.Fragment key={task.id}>
        <div className="flex border-b border-slate-100 hover:bg-slate-50 transition-colors h-10 group">
          <div 
            className="w-64 flex-shrink-0 px-3 flex items-center border-r border-slate-200 truncate"
            style={{ paddingLeft: `${12 + depth * 20}px` }}
          >
             <div className={cn("w-2 h-2 rounded-full mr-2 flex-shrink-0", 
                  task.priority === 1 ? "bg-red-500" :
                  task.priority === 2 ? "bg-orange-500" :
                  task.priority === 3 ? "bg-blue-500" : "bg-slate-300"
             )} />
             <span className={cn("text-sm text-slate-700 truncate", task.isCompleted && "line-through text-slate-400")}>
               {task.content}
             </span>
          </div>
          
          <div className="flex-1 grid relative" style={{ gridTemplateColumns: `repeat(${daysToShow}, 1fr)` }}>
             {/* Grid Lines */}
             {Array.from({ length: daysToShow }).map((_, i) => (
                <div key={i} className="border-r border-slate-100 h-full" />
             ))}
             
             {/* Task Bar */}
             <div 
               className={cn(
                 "absolute top-2 bottom-2 rounded-md px-2 text-[10px] text-white flex items-center truncate cursor-pointer shadow-sm hover:brightness-110 transition-all",
                 task.priority === 1 ? "bg-red-500" :
                 task.priority === 2 ? "bg-orange-500" :
                 task.priority === 3 ? "bg-blue-500" : "bg-slate-500",
                 !hasDate && "opacity-30 bg-slate-400"
               )}
               style={{
                 left: `${(start / daysToShow) * 100}%`,
                 width: `calc(${(span / daysToShow) * 100}% - 8px)`,
                 marginLeft: '4px'
               }}
               onClick={() => onTaskClick(task)}
               title={`${task.content} (${span} days)`}
             >
               {task.content}
             </div>
          </div>
        </div>
        {task.children && task.children.map(child => renderTaskRow(child, depth + 1))}
      </React.Fragment>
    );
  };

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="flex border-b border-slate-200 bg-slate-50">
        <div className="w-64 flex-shrink-0 p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-r border-slate-200">
          Task Name
        </div>
        <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${daysToShow}, 1fr)` }}>
          {dates.map((date, i) => (
            <div key={i} className="p-2 text-center border-r border-slate-200 last:border-r-0">
               <div className="text-[10px] text-slate-400">{date.toLocaleDateString('en-US', { weekday: 'narrow' })}</div>
               <div className={cn("text-xs font-medium", date.toDateString() === today.toDateString() ? "text-indigo-600" : "text-slate-700")}>
                 {date.getDate()}
               </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto">
        {renderGroupedRows()}
      </div>
    </div>
  );
}
