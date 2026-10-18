import { BigQuery } from '@google-cloud/bigquery';
import { v4 as uuidv4 } from 'uuid';
import { firestoreService } from './firestore.service';

/**
 * BigQuery Audit Service
 * Writes every Trust Engine verdict and Scenario Mapper recommendation
 * to the `kisanwise_ai.ai_decision_audit` table and mirrors to Firestore
 * for instant sub-second retrieval by the "Why this answer?" UI.
 *
 * Table is auto-created on first write if it doesn't exist.
 */

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || 'kisanwise-f18e4';
const DATASET   = 'kisanwise_ai';
const TABLE     = 'ai_decision_audit';

export interface AuditRecord {
  userId: string;
  fieldId?: string;
  decisionType: 'resource_allocation' | 'crop_planning' | 'crop_selling' | 'trust_engine' | 'scenario_mapper';
  inputsJson: any;
  signalsAgreed: string[];
  signalsDisagreed: string[];
  confidenceScore: number;
  modelVersion: string;
  outputJson: any;
}

const TABLE_SCHEMA = [
  { name: 'decision_id',        type: 'STRING',    mode: 'REQUIRED' },
  { name: 'user_id',            type: 'STRING',    mode: 'REQUIRED' },
  { name: 'field_id',           type: 'STRING',    mode: 'NULLABLE' },
  { name: 'decision_type',      type: 'STRING',    mode: 'REQUIRED' },
  { name: 'inputs_json',        type: 'JSON',      mode: 'NULLABLE' },
  { name: 'signals_agreed',     type: 'STRING',    mode: 'REPEATED' },
  { name: 'signals_disagreed',  type: 'STRING',    mode: 'REPEATED' },
  { name: 'confidence_score',   type: 'FLOAT64',   mode: 'REQUIRED' },
  { name: 'model_version',      type: 'STRING',    mode: 'NULLABLE' },
  { name: 'output_json',        type: 'JSON',      mode: 'NULLABLE' },
  { name: 'created_at',         type: 'TIMESTAMP', mode: 'REQUIRED' },
];

class BigQueryService {
  private bq: BigQuery | null = null;
  private tableReady = false;
  private enabled = false;

  constructor() {
    try {
      this.bq = new BigQuery({ projectId: PROJECT_ID });
      this.enabled = true;
      console.log('✅ BigQuery audit service initialised');
    } catch (err) {
      console.warn('⚠️ BigQuery not available — using Firestore for audit storage:', err);
    }
  }

  /** Write an AI decision to the audit table (non-blocking) */
  async writeAuditRecord(record: AuditRecord): Promise<string> {
    const decisionId = uuidv4();

    const doc = {
      id: decisionId,
      decision_id: decisionId,
      user_id: record.userId,
      field_id: record.fieldId ?? null,
      decision_type: record.decisionType,
      inputs_json: record.inputsJson,
      signals_agreed: record.signalsAgreed,
      signals_disagreed: record.signalsDisagreed,
      confidence_score: record.confidenceScore,
      model_version: record.modelVersion || 'gemini-1.5-flash',
      output_json: record.outputJson,
      created_at: new Date().toISOString(),
    };

    // Mirror to Firestore for instant local & cloud retrieval
    try {
      await firestoreService.put('aiDecisions', doc);
    } catch (e) {
      // Non-blocking
    }

    if (!this.enabled || !this.bq) {
      console.log('📝 [Audit (Firestore)]', { decisionId, decisionType: record.decisionType, confidence: record.confidenceScore });
      return decisionId;
    }

    // Fire-and-forget BigQuery insert — never block the main response
    this.writeAsync(decisionId, record).catch(err => console.error('BigQuery write error:', err));

    return decisionId;
  }

  /** Fetch audit records for a user (for "Why this answer?" UI) */
  async getAuditRecords(userId: string, limit = 20): Promise<any[]> {
    if (this.enabled && this.bq) {
      try {
        await this.ensureTable();
        const query = `
          SELECT *
          FROM \`${PROJECT_ID}.${DATASET}.${TABLE}\`
          WHERE user_id = @userId
          ORDER BY created_at DESC
          LIMIT @limit
        `;
        const [rows] = await this.bq.query({ query, params: { userId, limit } });
        if (rows && rows.length > 0) return rows;
      } catch (err) {
        console.error('BigQuery read error:', err);
      }
    }

    // Fallback to Firestore
    try {
      const docs = await firestoreService.query(
        'aiDecisions',
        'user_id = :userId',
        { ':userId': userId }
      );
      return docs.slice(0, limit);
    } catch {
      return [];
    }
  }

  /** Fetch a single audit record by ID */
  async getAuditRecord(decisionId: string): Promise<any | null> {
    if (this.enabled && this.bq) {
      try {
        await this.ensureTable();
        const query = `
          SELECT *
          FROM \`${PROJECT_ID}.${DATASET}.${TABLE}\`
          WHERE decision_id = @decisionId
          LIMIT 1
        `;
        const [rows] = await this.bq.query({ query, params: { decisionId } });
        if (rows && rows[0]) return rows[0];
      } catch (err) {
        console.error('BigQuery read error:', err);
      }
    }

    // Fallback to Firestore
    try {
      const doc = await firestoreService.get('aiDecisions', { id: decisionId });
      return doc || null;
    } catch {
      return null;
    }
  }

  private async writeAsync(decisionId: string, record: AuditRecord): Promise<void> {
    await this.ensureTable();

    const row = {
      decision_id:       decisionId,
      user_id:           record.userId,
      field_id:          record.fieldId ?? null,
      decision_type:     record.decisionType,
      inputs_json:       JSON.stringify(record.inputsJson),
      signals_agreed:    record.signalsAgreed,
      signals_disagreed: record.signalsDisagreed,
      confidence_score:  record.confidenceScore,
      model_version:     record.modelVersion || 'gemini-1.5-flash',
      output_json:       JSON.stringify(record.outputJson),
      created_at:        BigQuery.timestamp(new Date()),
    };

    await this.bq!.dataset(DATASET).table(TABLE).insert([row]);
    console.log(`📊 Audit record written: ${decisionId}`);
  }

  private async ensureTable(): Promise<void> {
    if (this.tableReady || !this.bq) return;

    try {
      const dataset = this.bq.dataset(DATASET);
      const [dsExists] = await dataset.exists();
      if (!dsExists) {
        await this.bq.createDataset(DATASET, { location: 'US' });
        console.log(`✅ BigQuery dataset "${DATASET}" created`);
      }

      const table = dataset.table(TABLE);
      const [tExists] = await table.exists();
      if (!tExists) {
        await dataset.createTable(TABLE, { schema: TABLE_SCHEMA, timePartitioning: { type: 'DAY', field: 'created_at' } });
        console.log(`✅ BigQuery table "${TABLE}" created`);
      }

      this.tableReady = true;
    } catch (err) {
      console.error('BigQuery ensureTable error:', err);
    }
  }
}

export const bigQueryService = new BigQueryService();
