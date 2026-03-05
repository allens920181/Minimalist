// lib/useFirestore.ts
// Real-time sync hook for tasks, projects, and labels using Firebase Firestore.

import { useState, useEffect } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  writeBatch,
  query,
  orderBy,
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

// Helper: flatten nested tasks array into a flat map for Firestore storage
function flattenTasks(tasks: Task[]): Task[] {
  const flat: Task[] = [];
  const traverse = (taskList: Task[]) => {
    for (const task of taskList) {
      flat.push(task);
      if (task.children) traverse(task.children);
    }
  };
  traverse(tasks);
  return flat;
}

// Helper: rebuild nested structure from flat Firestore docs
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

  useEffect(() => {
    if (!userId) {
      setTasksState([]);
      setProjectsState([]);
      setLabelsState([]);
      setLoading(false);
      return;
    }

    const base = `users/${userId}`;

    const unsubTasks = onSnapshot(collection(db, base, 'tasks'), (snap) => {
      const flat = snap.docs.map((d) => d.data() as Task);
      setTasksState(buildTree(flat));
      setLoading(false);
    });

    const unsubProjects = onSnapshot(collection(db, base, 'projects'), (snap) => {
      setProjectsState(snap.docs.map((d) => d.data() as Project));
    });

    const unsubLabels = onSnapshot(collection(db, base, 'labels'), (snap) => {
      setLabelsState(snap.docs.map((d) => d.data() as Label));
    });

    return () => {
      unsubTasks();
      unsubProjects();
      unsubLabels();
    };
  }, [userId]);

  // Write entire tasks array to Firestore (flat)
  const setTasks = async (newTasks: Task[]) => {
    if (!userId) return;
    setTasksState(newTasks);
    const flat = flattenTasks(newTasks);
    const batch = writeBatch(db);
    // Delete all existing tasks then write fresh ones
    const base = `users/${userId}/tasks`;
    // We write each task as a document keyed by id
    flat.forEach((task) => {
      batch.set(doc(db, base, task.id), task);
    });
    await batch.commit();
  };

  const setProjects = async (newProjects: Project[]) => {
    if (!userId) return;
    setProjectsState(newProjects);
    const batch = writeBatch(db);
    newProjects.forEach((p) => {
      batch.set(doc(db, `users/${userId}/projects`, p.id), p);
    });
    await batch.commit();
  };

  const setLabels = async (newLabels: Label[]) => {
    if (!userId) return;
    setLabelsState(newLabels);
    const batch = writeBatch(db);
    newLabels.forEach((l) => {
      batch.set(doc(db, `users/${userId}/labels`, l.id), l);
    });
    await batch.commit();
  };

  return { tasks, projects, labels, loading, setTasks, setProjects, setLabels };
}
