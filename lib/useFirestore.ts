// lib/useFirestore.ts
import { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { Task, Project, Label } from './data';

type UserData = {
  tasks: Task[];
  projects: Project[];
  labels: Label[];
  loading: boolean;
  setTasks: (tasks: Task[]) => Promise<void>;
  setProjects: (projects: Project[]) => Promise<void>;
  setLabels: (labels: Label[]) => Promise<void>;
};

// Remove undefined fields — Firestore rejects them
function stripUndefined<T extends object>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as T;
}

// Flatten nested task tree → flat array (strips children + undefined fields)
function flattenTasks(tasks: Task[]): Omit<Task, 'children'>[] {
  const flat: Omit<Task, 'children'>[] = [];
  const traverse = (taskList: Task[]) => {
    for (const task of taskList) {
      const { children, ...taskData } = task;
      flat.push(stripUndefined(taskData));
      if (children && children.length > 0) traverse(children);
    }
  };
  traverse(tasks);
  return flat;
}

// Rebuild nested tree from flat Firestore docs using parentId
function buildTree(flatTasks: Task[]): Task[] {
  const map = new Map<string, Task>();
  const roots: Task[] = [];
  for (const t of flatTasks) {
    map.set(t.id, { ...t, children: [] });
  }
  for (const t of flatTasks) {
    const node = map.get(t.id)!;
    if (t.parentId && map.has(t.parentId)) {
      map.get(t.parentId)!.children!.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

export function useFirestore(userId: string | null): UserData {
  const [rawTasks, setRawTasks] = useState<Task[]>([]);
  const [rawProjects, setRawProjects] = useState<Project[]>([]);
  const [rawLabels, setRawLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(!!userId);

  // Derived: gate all data behind userId — no setState([]) needed in effects
  const tasks = useMemo(() => (userId ? rawTasks : []), [userId, rawTasks]);
  const projects = useMemo(() => (userId ? rawProjects : []), [userId, rawProjects]);
  const labels = useMemo(() => (userId ? rawLabels : []), [userId, rawLabels]);

  // Always-fresh refs so async write fns never get stale closures
  const tasksRef = useRef<Task[]>([]);
  const projectsRef = useRef<Project[]>([]);
  const labelsRef = useRef<Label[]>([]);

  // Sync refs after every render (useLayoutEffect = synchronous, before paint)
  useLayoutEffect(() => {
    tasksRef.current = tasks;
    projectsRef.current = projects;
    labelsRef.current = labels;
  });

  // Track Firestore IDs for delete diffing
  const firestoreTaskIds = useRef<Set<string>>(new Set());
  const firestoreProjectIds = useRef<Set<string>>(new Set());
  const firestoreLabelIds = useRef<Set<string>>(new Set());

  // Subscribe to Firestore collections
  useEffect(() => {
    if (!userId) return;

    const base = `users/${userId}`;

    const unsubTasks = onSnapshot(collection(db, base, 'tasks'), (snap) => {
      const flat = snap.docs.map((d) => d.data() as Task);
      firestoreTaskIds.current = new Set(flat.map(t => t.id));
      setRawTasks(buildTree(flat));
      setLoading(false);
    });

    const unsubProjects = onSnapshot(collection(db, base, 'projects'), (snap) => {
      const items = snap.docs.map((d) => d.data() as Project);
      firestoreProjectIds.current = new Set(items.map(p => p.id));
      setRawProjects(items);
    });

    const unsubLabels = onSnapshot(collection(db, base, 'labels'), (snap) => {
      const items = snap.docs.map((d) => d.data() as Label);
      firestoreLabelIds.current = new Set(items.map(l => l.id));
      setRawLabels(items);
    });

    return () => {
      unsubTasks();
      unsubProjects();
      unsubLabels();
    };
  }, [userId]);

  // Write all tasks to Firestore (always full-write, no diff)
  // Using a simple set-all approach is safe for a personal task manager
  const setTasks = async (newTasks: Task[]) => {
    if (!userId) return;
    setRawTasks(newTasks); // optimistic update

    const flatNew = flattenTasks(newTasks);
    const newIds = new Set(flatNew.map(t => t.id));
    const batch = writeBatch(db);
    const tasksPath = `users/${userId}/tasks`;

    flatNew.forEach(task => batch.set(doc(db, tasksPath, task.id), task));

    for (const id of firestoreTaskIds.current) {
      if (!newIds.has(id)) batch.delete(doc(db, tasksPath, id));
    }

    try {
      await batch.commit();
    } catch (err) {
      console.error('[useFirestore] setTasks failed:', err);
    }
  };

  const setProjects = async (newProjects: Project[]) => {
    if (!userId) return;
    setRawProjects(newProjects);

    const newIds = new Set(newProjects.map(p => p.id));
    const batch = writeBatch(db);
    const base = `users/${userId}/projects`;

    newProjects.forEach(p => batch.set(doc(db, base, p.id), stripUndefined(p)));

    for (const id of firestoreProjectIds.current) {
      if (!newIds.has(id)) batch.delete(doc(db, base, id));
    }

    try {
      await batch.commit();
    } catch (err) {
      console.error('[useFirestore] setProjects failed:', err);
    }
  };

  const setLabels = async (newLabels: Label[]) => {
    if (!userId) return;
    setRawLabels(newLabels);

    const newIds = new Set(newLabels.map(l => l.id));
    const batch = writeBatch(db);
    const base = `users/${userId}/labels`;

    newLabels.forEach(l => batch.set(doc(db, base, l.id), stripUndefined(l)));

    for (const id of firestoreLabelIds.current) {
      if (!newIds.has(id)) batch.delete(doc(db, base, id));
    }

    try {
      await batch.commit();
    } catch (err) {
      console.error('[useFirestore] setLabels failed:', err);
    }
  };

  return { tasks, projects, labels, loading, setTasks, setProjects, setLabels };
}
