import * as fs from 'fs';
import * as path from 'path';
import { initializeApp, cert, applicationDefault, getApps, ServiceAccount } from 'firebase-admin/app';
import { getFirestore as initFirestore, Firestore, Query, WhereFilterOp } from 'firebase-admin/firestore';
import { localStorageService } from './local-storage.service';

const CREDENTIALS_KEY = path.resolve(__dirname, '../../credentials/firebase-adminsdk.json');

// Initialise Firebase Admin SDK once
let firestoreInstance: Firestore | null = null;
let firestoreDisabled = process.env.USE_LOCAL_STORAGE === 'true';

function getFirestore(): Firestore | null {
  if (firestoreDisabled) return null;
  if (firestoreInstance) return firestoreInstance;

  try {
    if (!getApps().length) {
      let credential;
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
        credential = applicationDefault();
      } else if (fs.existsSync(CREDENTIALS_KEY)) {
        credential = cert(CREDENTIALS_KEY);
      } else if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
        credential = cert({
          projectId: process.env.FIREBASE_PROJECT_ID || 'kisanwise-f18e4',
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        } as ServiceAccount);
      } else {
        console.warn('⚠️ No Firebase credentials found. Falling back to local storage.');
        firestoreDisabled = true;
        return null;
      }

      initializeApp({
        credential,
        projectId: process.env.FIREBASE_PROJECT_ID || 'kisanwise-f18e4',
      });
    }

    firestoreInstance = initFirestore();
    firestoreInstance.settings({ ignoreUndefinedProperties: true });
    return firestoreInstance;
  } catch (err: any) {
    console.warn('⚠️ Firebase Admin initialization failed, using local storage fallback:', err.message);
    firestoreDisabled = true;
    return null;
  }
}

/**
 * FirestoreService — drop-in replacement for DynamoDBService.
 * Provides put/get/query/update/delete/scan operations that match the
 * existing dynamoDBService interface so controllers need minimal changes.
 *
 * Automatically falls back to local storage if Firestore is disabled
 * or unprovisioned in the GCP project.
 */
export class FirestoreService {
  private db() { return getFirestore(); }

  /** Write / overwrite a document; key field used as document ID */
  async put(collectionName: string, item: any): Promise<any> {
    const db = this.db();
    if (!db) return localStorageService.put(collectionName, item);

    try {
      const docId = this.resolveDocId(collectionName, item);
      await db.collection(collectionName).doc(docId).set(item, { merge: false });
      return item;
    } catch (err: any) {
      console.warn(`Firestore put failed for ${collectionName}, falling back to local:`, err.message);
      return localStorageService.put(collectionName, item);
    }
  }

  /** Read a single document by key */
  async get(collectionName: string, key: any): Promise<any | null> {
    const db = this.db();
    if (!db) return localStorageService.get(collectionName, key);

    try {
      const docId = this.resolveDocIdFromKey(key);
      const snap = await db.collection(collectionName).doc(docId).get();
      return snap.exists ? snap.data() : null;
    } catch (err: any) {
      console.warn(`Firestore get failed for ${collectionName}, falling back to local:`, err.message);
      return localStorageService.get(collectionName, key);
    }
  }

  /**
   * Query using a simple DynamoDB-style KeyConditionExpression.
   * Supported patterns: "fieldName = :alias", "fieldName begins_with :alias"
   */
  async query(
    collectionName: string,
    keyConditionExpression: string,
    expressionAttributeValues: Record<string, any>,
  ): Promise<any[]> {
    const db = this.db();
    if (!db) return localStorageService.query(collectionName, keyConditionExpression, expressionAttributeValues);

    try {
      const conditions = this.parseConditions(keyConditionExpression, expressionAttributeValues);
      let ref: Query = db.collection(collectionName);
      for (const [field, op, value] of conditions) {
        ref = ref.where(field, op as WhereFilterOp, value);
      }
      const snap = await ref.get();
      return snap.docs.map((d: any) => d.data());
    } catch (err: any) {
      console.warn(`Firestore query failed for ${collectionName}, falling back to local:`, err.message);
      return localStorageService.query(collectionName, keyConditionExpression, expressionAttributeValues);
    }
  }

  /** Update specific fields using DynamoDB-style UpdateExpression */
  async update(
    collectionName: string,
    key: any,
    updateExpression: string,
    expressionAttributeValues: Record<string, any>,
    expressionAttributeNames?: Record<string, string>,
  ): Promise<any> {
    const db = this.db();
    if (!db) return localStorageService.update(collectionName, key, updateExpression, expressionAttributeValues, expressionAttributeNames);

    try {
      const docId = this.resolveDocIdFromKey(key);
      const fields = this.parseUpdateExpression(updateExpression, expressionAttributeValues, expressionAttributeNames);
      await db.collection(collectionName).doc(docId).update(fields);
      const snap = await db.collection(collectionName).doc(docId).get();
      return snap.data();
    } catch (err: any) {
      console.warn(`Firestore update failed for ${collectionName}, falling back to local:`, err.message);
      return localStorageService.update(collectionName, key, updateExpression, expressionAttributeValues, expressionAttributeNames);
    }
  }

  /** Delete a document */
  async delete(collectionName: string, key: any): Promise<void> {
    const db = this.db();
    if (!db) {
      await localStorageService.delete(collectionName, key);
      return;
    }

    try {
      const docId = this.resolveDocIdFromKey(key);
      await db.collection(collectionName).doc(docId).delete();
    } catch (err: any) {
      console.warn(`Firestore delete failed for ${collectionName}, falling back to local:`, err.message);
      await localStorageService.delete(collectionName, key);
    }
  }

  /**
   * Scan (full collection scan with optional filter).
   */
  async scan(
    collectionName: string,
    filterExpression?: string,
    expressionAttributeValues?: Record<string, any>,
    expressionAttributeNames?: Record<string, string>,
  ): Promise<any[]> {
    const db = this.db();
    if (!db) return localStorageService.scan(collectionName, filterExpression, expressionAttributeValues, expressionAttributeNames);

    try {
      if (!filterExpression) {
        const snap = await db.collection(collectionName).get();
        return snap.docs.map((d: any) => d.data());
      }

      const conditions = this.parseConditions(
        filterExpression,
        expressionAttributeValues ?? {},
        expressionAttributeNames,
      );

      let ref: Query = db.collection(collectionName);
      for (const [field, op, value] of conditions) {
        try {
          ref = ref.where(field, op as WhereFilterOp, value);
        } catch {
          // Skip unsupported operators; filter in-memory below
        }
      }

      const snap = await ref.get();
      return snap.docs.map((d: any) => d.data());
    } catch (err: any) {
      console.warn(`Firestore scan failed for ${collectionName}, falling back to local:`, err.message);
      return localStorageService.scan(collectionName, filterExpression, expressionAttributeValues, expressionAttributeNames);
    }
  }

  // ── Private helpers ────────────────────────────────────────────

  /** Resolve the document ID from the item being stored */
  private resolveDocId(collectionName: string, item: any): string {
    const pkField = this.primaryKey(collectionName);
    const id = item[pkField] ?? item.id ?? item.userId;
    if (!id) throw new Error(`No primary key "${pkField}" found in item for collection "${collectionName}"`);
    return String(id);
  }

  /** Resolve document ID from a DynamoDB-style key object */
  private resolveDocIdFromKey(key: any): string {
    const id = key.id ?? key.userId ?? key.listingId ?? key.offerId ?? key.requestId ?? Object.values(key)[0];
    return String(id);
  }

  /** Per-collection primary key field names */
  private primaryKey(collectionName: string): string {
    const map: Record<string, string> = {
      users: 'id',
      listings: 'id',
      procurementRequests: 'id',
      offers: 'id',
      negotiations: 'id',
      invoices: 'id',
      notifications: 'id',
      quotes: 'id',
      fields: 'id',
      diagnosticReports: 'id',
      communitySignals: 'id',
      aiDecisions: 'id',
    };
    return map[collectionName] ?? 'id';
  }

  /**
   * Parse DynamoDB-style conditions into Firestore where-clause tuples.
   */
  private parseConditions(
    expression: string,
    values: Record<string, any>,
    names?: Record<string, string>,
  ): Array<[string, string, any]> {
    const conditions: Array<[string, string, any]> = [];
    const parts = expression.split(/\s+AND\s+/i);

    for (const part of parts) {
      const trimmed = part.trim();

      const bwMatch = trimmed.match(/begins_with\s*\(\s*(\S+)\s*,\s*(\S+)\s*\)/i);
      if (bwMatch) {
        let field = this.resolveField(bwMatch[1], names);
        const value = values[bwMatch[2]];
        if (value !== undefined) conditions.push([field, '>=', value]);
        continue;
      }

      const opMatch = trimmed.match(/(\S+)\s*(=|<>|<=|>=|<|>)\s*(\S+)/);
      if (opMatch) {
        const field = this.resolveField(opMatch[1], names);
        let op = opMatch[2];
        if (op === '<>') op = '!=';
        if (op === '=') op = '==';
        const value = values[opMatch[3]];
        if (value !== undefined) conditions.push([field, op, value]);
      }
    }

    return conditions;
  }

  /** Parse DynamoDB UpdateExpression "SET #f1 = :v1, f2 = :v2" */
  private parseUpdateExpression(
    expression: string,
    values: Record<string, any>,
    names?: Record<string, string>,
  ): Record<string, any> {
    const fields: Record<string, any> = {};
    const setPart = expression.replace(/^SET\s+/i, '');
    const assignments = setPart.split(',');

    for (const assignment of assignments) {
      const [lhs, rhs] = assignment.split('=').map(s => s.trim());
      const field = this.resolveField(lhs, names);
      const value = values[rhs];
      if (field && value !== undefined) fields[field] = value;
    }

    fields.updatedAt = new Date().toISOString();
    return fields;
  }

  /** Resolve #alias from ExpressionAttributeNames or return field as-is */
  private resolveField(token: string, names?: Record<string, string>): string {
    if (token.startsWith('#') && names?.[token]) return names[token];
    return token;
  }
}

export const firestoreService = new FirestoreService();
// Keep backward-compatible alias so controllers that import dynamoDBService still work
export const dynamoDBService = firestoreService;
