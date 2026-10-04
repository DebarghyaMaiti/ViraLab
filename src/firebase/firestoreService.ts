import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from './config';
import { SimulationConfig, SimulationEventLogEntry } from '../types/simulation';

/**
 * Saves a simulation log entry to Firestore under /users/{userId}/simulation_logs/{logId}
 */
export async function saveSimulationLogToCloud(
  userId: string,
  log: SimulationEventLogEntry
): Promise<void> {
  if (!userId || !log.id) return;

  try {
    const logRef = doc(db, 'users', userId, 'simulation_logs', log.id);
    // Sanitize any undefined properties for Firestore
    const sanitizedLog = JSON.parse(JSON.stringify(log));
    await setDoc(logRef, {
      ...sanitizedLog,
      userId,
      savedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Failed to save simulation log to Firestore:', err);
  }
}

/**
 * Loads simulation logs from Firestore for the given user
 */
export async function loadSimulationLogsFromCloud(
  userId: string
): Promise<SimulationEventLogEntry[]> {
  if (!userId) return [];

  try {
    const logsCol = collection(db, 'users', userId, 'simulation_logs');
    const q = query(logsCol, orderBy('timestamp', 'desc'), limit(50));
    const snapshot = await getDocs(q);

    const logs: SimulationEventLogEntry[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      logs.push(data as SimulationEventLogEntry);
    });

    return logs;
  } catch (err) {
    console.warn('Failed to load simulation logs from Firestore:', err);
    return [];
  }
}

/**
 * Deletes a simulation log from Firestore
 */
export async function deleteSimulationLogFromCloud(
  userId: string,
  logId: string
): Promise<void> {
  if (!userId || !logId) return;

  try {
    const logRef = doc(db, 'users', userId, 'simulation_logs', logId);
    await deleteDoc(logRef);
  } catch (err) {
    console.warn('Failed to delete simulation log from Firestore:', err);
  }
}

/**
 * Saves a custom simulation config scenario to Firestore under /users/{userId}/saved_simulations/{simId}
 */
export async function saveCustomConfigToCloud(
  userId: string,
  name: string,
  description: string,
  config: SimulationConfig
): Promise<string> {
  const simId = `sim-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  const simRef = doc(db, 'users', userId, 'saved_simulations', simId);

  await setDoc(simRef, {
    id: simId,
    userId,
    name,
    description,
    config: JSON.parse(JSON.stringify(config)),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return simId;
}

/**
 * Loads saved simulation configs from Firestore
 */
export async function loadSavedConfigsFromCloud(
  userId: string
): Promise<Array<{ id: string; name: string; description?: string; config: SimulationConfig; updatedAt: string }>> {
  if (!userId) return [];

  try {
    const simCol = collection(db, 'users', userId, 'saved_simulations');
    const q = query(simCol, orderBy('updatedAt', 'desc'), limit(30));
    const snapshot = await getDocs(q);

    const configs: any[] = [];
    snapshot.forEach((docSnap) => {
      configs.push(docSnap.data());
    });

    return configs;
  } catch (err) {
    console.warn('Failed to load saved configs from Firestore:', err);
    return [];
  }
}
