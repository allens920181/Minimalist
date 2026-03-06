// lib/useFirestore.ts
import { useState, useEffect, useLayoutEffect, useRef } from 'react';
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

// Flatten nested task tree → flat array (strips the children field for Firestore storage)
function flattenTasks(tasks: Task[]): Omit<Task, 'children'>[] {
  const flat: Omit<Task, 'children'>[] = [];
  const traverse = (taskList: Task[]) => {
    for (const task of taskList) {
      const { children, ...taskData } = task;
      flat.push(taskData);
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
  const [tasks, setTasksState] = useState<Task[]>([]);
  const [projects, setProjectsState] = useState<Project[]>([]);
  const [labels, setLabelsState] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);

  // Always-fresh refs so async write fns never get stale closures
  const tasksRef = useRef<Task[]>([]);
  const projectsRef = useRef<Project[]>([]);
  const labelsRef = useRef<Label[]>([]);

  // Keep refs in sync with state (useLayoutEffect runs sync after render, safe to write refs)
  useLayoutEffect(() => {
    tasksRef.current = tasks;
    projectsRef.current = projects;
    labelsRef.current = labels;
  });

  // Track which task/project/label IDs are currently in Firestore
  // so we can delete removed ones when setTasks/setProjects/setLabels is called
  const firestoreTaskIds = useRef<Set<string>>(new Set());
  const firestoreProjectIds = useRef<Set<string>>(new Set());
  const firestoreLabelIds = useRef<Set<string>>(new Set());

  // Reset local state when user logs out
  useEffect(() => {
    if (!userId) {
      setTasksState([]);
      setProjectsState([]);
      setLabelsState([]);
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const base = `users/${userId}`;

    const unsubTasks = onSnapshot(collection(db, base, 'tasks'), (snap) => {
      const flat = snap.docs.map((d) => d.data() as Task);
      firestoreTaskIds.current = new Set(flat.map(t => t.id));
      setTasksState(buildTree(flat));
      setLoading(false);
    });

    const unsubProjects = onSnapshot(collection(db, base, 'projects'), (snap) => {
      const items = snap.docs.map((d) => d.data() as Project);
      firestoreProjectIds.current = new Set(items.map(p => p.id));
      setProjectsState(items);
    });

    const unsubLabels = onSnapshot(collection(db, base, 'labels'), (snap) => {
      const items = snap.docs.map((d) => d.data() as Label);
      firestoreLabelIds.current = new Set(items.map(l => l.id));
      setLabelsState(items);
    });

    return () => {
      unsubTasks();
      unsubProjects();
      unsubLabels();
    };
  }, [userId]);

  // Write entire tasks array to Firestore.
  // - Strips `children` field (tree is reconstructed from parentId on read)
  // - Deletes Firestore docs for tasks no longer in the array
  const setTasks = async (newTasks: Task[]) => {
    if (!userId) return;

    // Use ref to get truly current state (avoids stale closure)
    const flatOld = flattenTasks(tasksRef.current);
    const oldMap = new Map(flatOld.map(t => [t.id, t]));

    setTasksState(newTasks); // optimistic update

    const flatNew = flattenTasks(newTasks);
    const newIds = new Set(flatNew.map(t => t.id));

    const batch = writeBatch(db);
    const tasksPath = `users/${userId}/tasks`;

    // Upsert only changed/new tasks
    flatNew.forEach((task) => {
      const oldTask = oldMap.get(task.id);
      if (!oldTask || JSON.stringify(oldTask) !== JSON.stringify(task)) {
        batch.set(doc(db, tasksPath, task.id), task);
      }
    });

    // Delete tasks removed from the array
    for (const id of firestoreTaskIds.current) {
      if (!newIds.has(id)) {
        batch.delete(doc(db, tasksPath, id));
      }
    }

    await batch.commit();
  };

  const setProjects = async (newProjects: Project[]) => {
    if (!userId) return;

    const oldMap = new Map(projectsRef.current.map(p => [p.id, p]));
    setProjectsState(newProjects);

    const newIds = new Set(newProjects.map(p => p.id));
    const batch = writeBatch(db);
    const base = `users/${userId}/projects`;

    newProjects.forEach((p) => {
      const old = oldMap.get(p.id);
      if (!old || JSON.stringify(old) !== JSON.stringify(p)) {
        batch.set(doc(db, base, p.id), p);
      }
    });

    for (const id of firestoreProjectIds.current) {
      if (!newIds.has(id)) batch.delete(doc(db, base, id));
    }

    await batch.commit();
  };

  const setLabels = async (newLabels: Label[]) => {
    if (!userId) return;

    const oldMap = new Map(labelsRef.current.map(l => [l.id, l]));
    setLabelsState(newLabels);

    const newIds = new Set(newLabels.map(l => l.id));
    const batch = writeBatch(db);
    const base = `users/${userId}/labels`;

    newLabels.forEach((l) => {
      const oldItem = oldMap.get(l.id);
      if (!oldItem || JSON.stringify(oldItem) !== JSON.stringify(l)) {
        batch.set(doc(db, base, l.id), l);
      }
    });

    for (const id of firestoreLabelIds.current) {
      if (!newIds.has(id)) batch.delete(doc(db, base, id));
    }

    await batch.commit();
  };

  return { tasks, projects, labels, loading, setTasks, setProjects, setLabels };
}
