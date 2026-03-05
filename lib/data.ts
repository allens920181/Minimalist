import { 
  Inbox, 
  Calendar, 
  Hash, 
  Flag, 
  ChevronRight, 
  ChevronDown, 
  Plus, 
  CheckCircle2, 
  Circle,
  X,
  Menu,
  MoreHorizontal,
  Tag
} from 'lucide-react';

// --- Types ---

export type Priority = 1 | 2 | 3 | 4;

export interface Label {
  id: string;
  name: string;
  color: string; // Tailwind color class or hex
}

export interface Task {
  id: string;
  content: string;
  description?: string; // Notes
  priority?: Priority;
  labels: string[]; // Label IDs
  projectId: string;
  parentId?: string;
  isCompleted: boolean;
  startDate?: string;
  dueDate?: string;
  children?: Task[]; // For nested sub-tasks
}

export interface Project {
  id: string;
  name: string;
  color: string;
  parentId?: string;
  children?: Project[]; // Sub-projects
  startDate?: string;
  endDate?: string;
}

// --- Mock Data ---

export const LABELS: Label[] = [
  { id: 'l1', name: 'Work', color: 'bg-emerald-100 text-emerald-700' },
  { id: 'l2', name: 'Personal', color: 'bg-blue-100 text-blue-700' },
  { id: 'l3', name: 'Urgent', color: 'bg-red-100 text-red-700' },
  { id: 'l4', name: 'Shopping', color: 'bg-purple-100 text-purple-700' },
];

export const PROJECTS: Project[] = [
  { 
    id: 'p1', 
    name: 'Website Redesign', 
    color: 'text-slate-600',
    startDate: '2023-10-01',
    endDate: '2023-12-31'
  },
  { 
    id: 'p2', 
    name: 'Home Renovation', 
    color: 'text-orange-600',
    children: [
      { id: 'p2-1', name: 'Kitchen', color: 'text-orange-500' },
      { id: 'p2-2', name: 'Living Room', color: 'text-orange-500' }
    ]
  },
  { id: 'p3', name: 'Learning', color: 'text-blue-600' },
];

export const TASKS: Task[] = [
  {
    id: 't1',
    content: 'Review design mockups',
    description: 'Check the typography and spacing on the mobile view.',
    priority: 1,
    labels: ['l1', 'l3'],
    projectId: 'p1',
    isCompleted: false,
    dueDate: 'Today',
    children: [
      {
        id: 't1-1',
        content: 'Comment on Figma',
        priority: 2,
        labels: [],
        projectId: 'p1',
        parentId: 't1',
        isCompleted: false,
      },
      {
        id: 't1-2',
        content: 'Schedule meeting with design team',
        priority: 4,
        labels: ['l1'],
        projectId: 'p1',
        parentId: 't1',
        isCompleted: true,
      }
    ]
  },
  {
    id: 't2',
    content: 'Buy groceries',
    priority: 3,
    labels: ['l2', 'l4'],
    projectId: 'inbox',
    isCompleted: false,
    dueDate: 'Tomorrow'
  },
  {
    id: 't3',
    content: 'Call plumber',
    description: 'Kitchen sink is leaking again.',
    priority: 1,
    labels: ['l2', 'l3'],
    projectId: 'p2-1',
    isCompleted: false,
  },
  {
    id: 't4',
    content: 'Read "Clean Code"',
    priority: 4,
    labels: [],
    projectId: 'p3',
    isCompleted: false,
    children: [
      {
        id: 't4-1',
        content: 'Chapter 1',
        priority: 4,
        labels: [],
        projectId: 'p3',
        parentId: 't4',
        isCompleted: true,
      },
      {
        id: 't4-2',
        content: 'Chapter 2',
        priority: 4,
        labels: [],
        projectId: 'p3',
        parentId: 't4',
        isCompleted: false,
      }
    ]
  }
];
