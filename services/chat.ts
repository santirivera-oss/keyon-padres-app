// ==========================================
// CHAT PADRE <-> ADMIN (ESCUELA)
// ==========================================

import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  increment,
  Timestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { getDb } from './firebase';

const COLECCION = 'chats_padres';
const SUBCOLECCION = 'mensajes';

export type ChatFrom = 'admin' | 'padre';

export interface ChatMensaje {
  id: string;
  from: ChatFrom;
  texto: string;
  autorNombre?: string;
  autorId?: string;
  createdAt?: Timestamp;
}

export interface ConversacionMeta {
  alumnoId: string;
  alumnoNombre?: string;
  padreId?: string;
  padreNombre?: string;
  lastMessage?: string;
  lastMessageAt?: Timestamp;
  lastMessageFrom?: ChatFrom;
  unreadByAdmin?: number;
  unreadByPadre?: number;
}

/**
 * Suscribe a mensajes de la conversacion del alumno.
 * Devuelve funcion para cancelar la suscripcion.
 */
export function subscribirMensajes(
  alumnoId: string,
  onUpdate: (mensajes: ChatMensaje[]) => void
): Unsubscribe {
  const db = getDb();
  const q = query(
    collection(db, COLECCION, alumnoId, SUBCOLECCION),
    orderBy('createdAt', 'asc')
  );

  return onSnapshot(q, (snap) => {
    const mensajes: ChatMensaje[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<ChatMensaje, 'id'>),
    }));
    onUpdate(mensajes);
  });
}

/**
 * Suscribe a la metadata de la conversacion (unread, last message).
 */
export function subscribirConversacion(
  alumnoId: string,
  onUpdate: (meta: ConversacionMeta | null) => void
): Unsubscribe {
  const db = getDb();
  return onSnapshot(doc(db, COLECCION, alumnoId), (snap) => {
    if (!snap.exists()) {
      onUpdate(null);
      return;
    }
    onUpdate({ alumnoId, ...(snap.data() as Omit<ConversacionMeta, 'alumnoId'>) });
  });
}

/**
 * Envia mensaje del padre al admin.
 * Crea/actualiza la conversacion y agrega el mensaje a la subcoleccion.
 */
export async function enviarMensaje(params: {
  alumnoId: string;
  alumnoNombre?: string;
  padreId?: string;
  padreNombre?: string;
  texto: string;
}): Promise<{ success: boolean; error?: string }> {
  const texto = (params.texto || '').trim();
  if (!texto) {
    return { success: false, error: 'Mensaje vacio' };
  }
  if (!params.alumnoId) {
    return { success: false, error: 'Falta alumnoId' };
  }

  try {
    const db = getDb();
    const convRef = doc(db, COLECCION, params.alumnoId);

    await addDoc(collection(convRef, SUBCOLECCION), {
      from: 'padre' as ChatFrom,
      texto,
      autorNombre: params.padreNombre || 'Padre/Madre',
      autorId: params.padreId || params.alumnoId,
      createdAt: serverTimestamp(),
    });

    await setDoc(
      convRef,
      {
        alumnoId: params.alumnoId,
        alumnoNombre: params.alumnoNombre || '',
        padreId: params.padreId || params.alumnoId,
        padreNombre: params.padreNombre || '',
        lastMessage: texto,
        lastMessageAt: serverTimestamp(),
        lastMessageFrom: 'padre' as ChatFrom,
        unreadByAdmin: increment(1),
      },
      { merge: true }
    );

    return { success: true };
  } catch (e: any) {
    console.error('Error enviando mensaje chat:', e);
    return { success: false, error: e.message };
  }
}

/**
 * Marca la conversacion como leida por el padre (unreadByPadre = 0).
 */
export async function marcarLeidoPadre(alumnoId: string): Promise<void> {
  try {
    const db = getDb();
    await updateDoc(doc(db, COLECCION, alumnoId), {
      unreadByPadre: 0,
    });
  } catch (e) {
    // silencioso: puede no existir aun la conversacion
  }
}

export default {
  subscribirMensajes,
  subscribirConversacion,
  enviarMensaje,
  marcarLeidoPadre,
};
