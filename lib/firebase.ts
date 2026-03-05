// lib/firebase.ts
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBcEXIFyn8ggUV95ewkH5RcKbqXclTEFF0",
  authDomain: "minimalist-todo-44e06.firebaseapp.com",
  projectId: "minimalist-todo-44e06",
  storageBucket: "minimalist-todo-44e06.firebasestorage.app",
  messagingSenderId: "333241778317",
  appId: "1:333241778317:web:ca059fad76bc707ca162c4",
  measurementId: "G-7NGG3B41C1"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;
