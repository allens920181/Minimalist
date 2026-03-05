'use client';

import React from 'react';
import { Task, Priority } from '@/lib/data';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

export function CalendarView({ tasks, onTaskClick }: CalendarViewProps) {
  // Mock calendar generation for prototype
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  const currentMonth = today.toLocaleString('default', { month: 'long', year: 'numeric' });
  
  // Generate a simple 5-week grid
  const calendarDays = Array.from({ length: 35 }, (_, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() - today.getDay() + i);
    return date;
  });

  const getTasksForDate = (date: Date) => {
    // Simple mock matching for "Today" and "Tomorrow"
    const dateString = date.toDateString();
    const todayString = new Date().toDateString();
    const tomorrowString = new Date(new Date().setDate(new Date().getDate() + 1)).toDateString();

    return tasks.filter(t => {
      if (!t.dueDate) return false;
      if (t.dueDate === 'Today' && dateString === todayString) return true;
      if (t.dueDate === 'Tomorrow' && dateString === tomorrowString) return true;
      // In a real app, we'd parse YYYY-MM-DD
      return false;
    });
  };

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
        <h2 className="font-semibold text-slate-800">{currentMonth}</h2>
        <div className="flex gap-1">
          <button className="p-1 hover:bg-slate-100 rounded"><ChevronLeft className="w-4 h-4 text-slate-500" /></button>
          <button className="p-1 hover:bg-slate-100 rounded"><ChevronRight className="w-4 h-4 text-slate-500" /></button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-slate-100">
        {days.map(day => (
          <div key={day} className="py-2 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
            {day}
          </div>
        ))}
      </div>

      <div className="flex-1 grid grid-cols-7 grid-rows-5">
        {calendarDays.map((date, i) => {
          const isToday = date.toDateString() === new Date().toDateString();
          const isCurrentMonth = date.getMonth() === today.getMonth();
          const dayTasks = getTasksForDate(date);

          return (
            <div 
              key={i} 
              className={cn(
                "border-b border-r border-slate-100 p-2 min-h-[100px] hover:bg-slate-50 transition-colors relative group",
                !isCurrentMonth && "bg-slate-50/50"
              )}
            >
              <div className={cn(
                "text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full",
                isToday ? "bg-red-500 text-white" : "text-slate-700",
                !isCurrentMonth && "text-slate-400"
              )}>
                {date.getDate()}
              </div>

              <div className="space-y-1">
                {dayTasks.map(task => (
                  <div 
                    key={task.id}
                    onClick={() => onTaskClick(task)}
                    className={cn(
                      "text-[10px] px-1.5 py-1 rounded truncate cursor-pointer border-l-2 bg-white shadow-sm",
                      task.priority === 1 ? "border-red-500" :
                      task.priority === 2 ? "border-orange-500" :
                      task.priority === 3 ? "border-blue-500" : "border-slate-300",
                      task.isCompleted && "opacity-50 line-through"
                    )}
                  >
                    {task.content}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
