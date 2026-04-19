// ==========================================
// 🔥 KEYON PADRES - SERVICIO FIREBASE
// ==========================================

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  Firestore
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { FIREBASE_CONFIG, COLLECTIONS } from '../constants/Config';

// ============ INICIALIZACIÓN ============

let app: FirebaseApp;
let db: Firestore;

// Configuración directa de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDD4DbbZzT6Mm1guTJUYE-HEtG4hq1qaP8",
  authDomain: "scanner-v3.firebaseapp.com",
  databaseURL: "https://scanner-v3-default-rtdb.firebaseio.com",
  projectId: "scanner-v3",
  storageBucket: "scanner-v3.firebasestorage.app",
  messagingSenderId: "547241024349",
  appId: "1:547241024349:web:5665e19ce04c5e658ba6b4",
  measurementId: "G-0BEPYTG88V"
};

export function initializeFirebase(): FirebaseApp {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
    console.log('🔥 Firebase inicializado');
  } else {
    app = getApps()[0];
  }

  db = getFirestore(app);

  // Anonymous Auth — LFPDPPP Art. 22.
  // Las reglas Firestore requieren request.auth != null para leer alumnos,
  // consentimientos, padres_codigos, etc. La app de padres no hace login
  // con email/password, así que usamos anon auth para cumplir la rule.
  try {
    const auth = getAuth(app);
    onAuthStateChanged(auth, (user) => {
      if (!user) {
        signInAnonymously(auth).catch((err) => {
          console.warn('[Firebase] signInAnonymously falló:', err?.message || err);
        });
      }
    });
  } catch (err) {
    console.warn('[Firebase] No se pudo inicializar auth anónima:', err);
  }

  return app;
}

export function getDb(): Firestore {
  if (!db) {
    initializeFirebase();
  }
  return db;
}

// Inicializar automáticamente
initializeFirebase();

// ============ HELPERS ============

export function timestampToDate(timestamp: Timestamp | any): Date {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  if (timestamp?.toDate) {
    return timestamp.toDate();
  }
  if (timestamp?.seconds) {
    return new Date(timestamp.seconds * 1000);
  }
  return new Date(timestamp);
}

export function formatFirestoreDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// ============ RE-EXPORTAR ============

export {
  db,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  COLLECTIONS
};

export default { initializeFirebase, getDb };
