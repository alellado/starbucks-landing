import "dotenv/config";
import crypto from "node:crypto";
import { Buffer } from "node:buffer";
import cors from "cors";
import express from "express";
import { z } from "zod";
import { ensureRuntimeContext, type RuntimeContext } from "./context.js";
import { query, withTransaction } from "./db.js";

const app = express();
const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim())
  : true;
app.use(cors({ origin: corsOrigin }));
app.use(express.json());

const port = Number(process.env.API_PORT ?? 3001);
const orchestratorUrl = process.env.AI_ORCHESTRATOR_URL ?? "http://localhost:4001";
const policyEngineUrl = process.env.POLICY_ENGINE_URL ?? "http://localhost:4002";

const createIntentSchema = z.object({
  title: z.string().min(1),
  objective: z.string().min(1),
  audience: z.string().min(1),
  tone: z.string().min(1),
  constraints: z.record(z.any()).optional()
});

const createDocumentSchema = z.object({
  title: z.string().min(1),
  intentId: z.string().uuid().optional()
});

const generateSchema = z.object({
  mode: z.enum(["draft", "rewrite", "expand", "shorten"]).default("draft"),
  instructions: z.string().optional()
});

const listIntentsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional()
});

const listDocumentsQuerySchema = z.object({
  status: z.enum(["draft", "in_review", "approved", "published", "archived"]).optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional()
});

const listJobsQuerySchema = z.object({
  status: z.enum(["queued", "running", "succeeded", "failed"]).optional(),
  type: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional()
});

const publishSchema = z.object({
  channel: z.enum(["web", "app", "newsletter", "social"]),
  variantKey: z.string().min(1).default("default"),
  externalRef: z.string().min(1).optional(),
  force: z.boolean().default(false)
});

let runtimeContext: RuntimeContext;

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/v1/intents", async (req, res) => {
  try {
    const queryParams = listIntentsQuerySchema.parse(req.query);
    const cursor = decodeCursor(queryParams.cursor);

    const params: unknown[] = [runtimeContext.workspaceId];
    const where: string[] = ["workspace_id = $1"];
    if (cursor) {
      params.push(cursor.ts);
      const tsIndex = params.length;
      params.push(cursor.id);
      const idIndex = params.length;
      where.push(
        `(created_at < $${tsIndex}::timestamptz OR (created_at = $${tsIndex}::timestamptz AND id < $${idIndex}::uuid))`
      );
    }
    params.push(queryParams.limit + 1);
    const limitIndex = params.length;

    const result = await query<{
      id: string;
      title: string;
      objective: string;
      audience: string;
      tone: string;
      created_at: string;
    }>(
      `SELECT id, title, objective, audience, tone, created_at
       FROM intents
       WHERE ${where.join(" AND ")}
       ORDER BY created_at DESC, id DESC
       LIMIT $${limitIndex}`,
      params
    );

    const hasMore = result.rows.length > queryParams.limit;
    const rows = hasMore ? result.rows.slice(0, queryParams.limit) : result.rows;
    const last = rows.length > 0 ? rows[rows.length - 1] : null;

    res.status(200).json({
      intents: rows.map((row) => ({
        id: row.id,
        title: row.title,
        objective: row.objective,
        audience: row.audience,
        tone: row.tone,
        createdAt: row.created_at
      })),
      nextCursor: hasMore && last ? encodeCursor(last.created_at, last.id) : null
    });
  } catch (error) {
    handleError(res, error);
  }
});

app.get("/v1/documents", async (req, res) => {
  try {
    const queryParams = listDocumentsQuerySchema.parse(req.query);
    const cursor = decodeCursor(queryParams.cursor);
    const params: unknown[] = [runtimeContext.workspaceId];
    const where: string[] = ["d.workspace_id = $1"];

    if (queryParams.status) {
      params.push(queryParams.status);
      where.push(`d.status = $${params.length}`);
    }

    if (queryParams.search) {
      params.push(`%${queryParams.search}%`);
      where.push(`d.title ILIKE $${params.length}`);
    }

    if (cursor) {
      params.push(cursor.ts);
      const tsIndex = params.length;
      params.push(cursor.id);
      const idIndex = params.length;
      where.push(
        `(d.created_at < $${tsIndex}::timestamptz OR (d.created_at = $${tsIndex}::timestamptz AND d.id < $${idIndex}::uuid))`
      );
    }

    params.push(queryParams.limit + 1);
    const limitIndex = params.length;

    const result = await query<{
      id: string;
      title: string;
      status: string;
      intent_id: string | null;
      current_version_id: string | null;
      created_at: string;
    }>(
      `SELECT d.id, d.title, d.status, d.intent_id, d.current_version_id, d.created_at
       FROM documents d
       WHERE ${where.join(" AND ")}
       ORDER BY d.created_at DESC, d.id DESC
       LIMIT $${limitIndex}`,
      params
    );

    const hasMore = result.rows.length > queryParams.limit;
    const rows = hasMore ? result.rows.slice(0, queryParams.limit) : result.rows;
    const last = rows.length > 0 ? rows[rows.length - 1] : null;

    res.status(200).json({
      documents: rows.map((row) => ({
        id: row.id,
        title: row.title,
        status: row.status,
        intentId: row.intent_id,
        currentVersionId: row.current_version_id,
        createdAt: row.created_at
      })),
      nextCursor: hasMore && last ? encodeCursor(last.created_at, last.id) : null
    });
  } catch (error) {
    handleError(res, error);
  }
});

app.get("/v1/documents/:documentId", async (req, res) => {
  try {
    const params = z.object({ documentId: z.string().uuid() }).parse(req.params);
    const result = await query<{
      id: string;
      title: string;
      status: string;
      intent_id: string | null;
      current_version_id: string | null;
      created_at: string;
      current_version_number: number | null;
      current_change_summary: string | null;
    }>(
      `SELECT
         d.id,
         d.title,
         d.status,
         d.intent_id,
         d.current_version_id,
         d.created_at,
         dv.version_number AS current_version_number,
         dv.change_summary AS current_change_summary
       FROM documents d
       LEFT JOIN document_versions dv ON dv.id = d.current_version_id
       WHERE d.id = $1 AND d.workspace_id = $2`,
      [params.documentId, runtimeContext.workspaceId]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    const row = result.rows[0];
    res.status(200).json({
      id: row.id,
      title: row.title,
      status: row.status,
      intentId: row.intent_id,
      currentVersionId: row.current_version_id,
      createdAt: row.created_at,
      currentVersion: row.current_version_id
        ? {
            id: row.current_version_id,
            versionNumber: row.current_version_number,
            changeSummary: row.current_change_summary
          }
        : null
    });
  } catch (error) {
    handleError(res, error);
  }
});

app.get("/v1/jobs", async (req, res) => {
  try {
    const queryParams = listJobsQuerySchema.parse(req.query);
    const cursor = decodeCursor(queryParams.cursor);
    const params: unknown[] = [runtimeContext.workspaceId];
    const where: string[] = ["workspace_id = $1"];

    if (queryParams.status) {
      params.push(queryParams.status);
      where.push(`status = $${params.length}`);
    }

    if (queryParams.type) {
      params.push(queryParams.type);
      where.push(`job_type = $${params.length}`);
    }

    if (cursor) {
      params.push(cursor.ts);
      const tsIndex = params.length;
      params.push(cursor.id);
      const idIndex = params.length;
      where.push(
        `(created_at < $${tsIndex}::timestamptz OR (created_at = $${tsIndex}::timestamptz AND id < $${idIndex}::uuid))`
      );
    }

    params.push(queryParams.limit + 1);
    const limitIndex = params.length;

    const result = await query<{
      id: string;
      job_type: string;
      status: string;
      created_at: string;
      updated_at: string;
      result_json: unknown;
      error_json: unknown;
    }>(
      `SELECT id, job_type, status, created_at, updated_at, result_json, error_json
       FROM jobs
       WHERE ${where.join(" AND ")}
       ORDER BY created_at DESC, id DESC
       LIMIT $${limitIndex}`,
      params
    );

    const hasMore = result.rows.length > queryParams.limit;
    const rows = hasMore ? result.rows.slice(0, queryParams.limit) : result.rows;
    const last = rows.length > 0 ? rows[rows.length - 1] : null;

    res.status(200).json({
      jobs: rows.map((row) => ({
        id: row.id,
        jobType: row.job_type,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        result: row.result_json,
        error: row.error_json
      })),
      nextCursor: hasMore && last ? encodeCursor(last.created_at, last.id) : null
    });
  } catch (error) {
    handleError(res, error);
  }
});

app.get("/v1/jobs/:jobId", async (req, res) => {
  try {
    const params = z.object({ jobId: z.string().uuid() }).parse(req.params);
    const jobResult = await query<{
      id: string;
      job_type: string;
      status: string;
      payload_json: unknown;
      result_json: unknown;
      error_json: unknown;
      created_at: string;
      updated_at: string;
    }>(
      `SELECT id, job_type, status, payload_json, result_json, error_json, created_at, updated_at
       FROM jobs
       WHERE id = $1 AND workspace_id = $2`,
      [params.jobId, runtimeContext.workspaceId]
    );

    if (jobResult.rowCount === 0) {
      res.status(404).json({ error: "Job not found" });
      return;
    }

    const job = jobResult.rows[0];
    res.status(200).json({
      id: job.id,
      jobType: job.job_type,
      status: job.status,
      payload: job.payload_json,
      result: job.result_json,
      error: job.error_json,
      createdAt: job.created_at,
      updatedAt: job.updated_at
    });
  } catch (error) {
    handleError(res, error);
  }
});

app.get("/v1/documents/:documentId/versions", async (req, res) => {
  try {
    const params = z.object({ documentId: z.string().uuid() }).parse(req.params);
    const queryParams = z
      .object({
        limit: z.coerce.number().int().min(1).max(100).default(20),
        cursor: z.string().optional()
      })
      .parse(req.query);

    const cursor = decodeVersionCursor(queryParams.cursor);
    const documentResult = await query<{ id: string }>("SELECT id FROM documents WHERE id = $1 AND workspace_id = $2", [
      params.documentId,
      runtimeContext.workspaceId
    ]);

    if (documentResult.rowCount === 0) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    const versionParams: unknown[] = [params.documentId];
    const where: string[] = ["dv.document_id = $1"];

    if (cursor) {
      versionParams.push(cursor.versionNumber);
      const versionIndex = versionParams.length;
      versionParams.push(cursor.id);
      const idIndex = versionParams.length;
      where.push(`(dv.version_number < $${versionIndex} OR (dv.version_number = $${versionIndex} AND dv.id < $${idIndex}::uuid))`);
    }

    versionParams.push(queryParams.limit + 1);
    const limitIndex = versionParams.length;

    const versionResult = await query<{
      id: string;
      version_number: number;
      change_summary: string;
      created_at: string;
      policy_report_id: string | null;
      score: number | null;
      blocking_issues: number | null;
      policy_created_at: string | null;
    }>(
      `SELECT
         dv.id,
         dv.version_number,
         dv.change_summary,
         dv.created_at,
         pr.id AS policy_report_id,
         pr.score,
         pr.blocking_issues,
         pr.created_at AS policy_created_at
       FROM document_versions dv
       LEFT JOIN LATERAL (
         SELECT id, score, blocking_issues, created_at
         FROM policy_reports
         WHERE document_version_id = dv.id
         ORDER BY created_at DESC
         LIMIT 1
       ) pr ON TRUE
       WHERE ${where.join(" AND ")}
       ORDER BY dv.version_number DESC, dv.id DESC
       LIMIT $${limitIndex}`,
      versionParams
    );

    const hasMore = versionResult.rows.length > queryParams.limit;
    const rows = hasMore ? versionResult.rows.slice(0, queryParams.limit) : versionResult.rows;
    const last = rows.length > 0 ? rows[rows.length - 1] : null;

    res.status(200).json({
      documentId: params.documentId,
      versions: rows.map((row) => ({
        id: row.id,
        versionNumber: row.version_number,
        changeSummary: row.change_summary,
        createdAt: row.created_at,
        latestPolicyReport: row.policy_report_id
          ? {
              id: row.policy_report_id,
              score: row.score !== null ? Number(row.score) : null,
              blockingIssues: row.blocking_issues,
              createdAt: row.policy_created_at
            }
          : null
      })),
      nextCursor: hasMore && last ? encodeVersionCursor(last.version_number, last.id) : null
    });
  } catch (error) {
    handleError(res, error);
  }
});

app.get("/v1/documents/:documentId/publications", async (req, res) => {
  try {
    const params = z.object({ documentId: z.string().uuid() }).parse(req.params);
    const queryParams = z
      .object({
        channel: z.enum(["web", "app", "newsletter", "social"]).optional(),
        limit: z.coerce.number().int().min(1).max(100).default(20),
        cursor: z.string().optional()
      })
      .parse(req.query);

    const cursor = decodeCursor(queryParams.cursor);
    const documentResult = await query<{ id: string }>("SELECT id FROM documents WHERE id = $1 AND workspace_id = $2", [
      params.documentId,
      runtimeContext.workspaceId
    ]);

    if (documentResult.rowCount === 0) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    const filterParams: unknown[] = [params.documentId];
    const where: string[] = ["dv.document_id = $1"];

    if (queryParams.channel) {
      filterParams.push(queryParams.channel);
      where.push(`p.channel = $${filterParams.length}`);
    }

    if (cursor) {
      filterParams.push(cursor.ts);
      const tsIndex = filterParams.length;
      filterParams.push(cursor.id);
      const idIndex = filterParams.length;
      where.push(
        `(COALESCE(p.published_at, p.created_at) < $${tsIndex}::timestamptz OR ` +
          `(COALESCE(p.published_at, p.created_at) = $${tsIndex}::timestamptz AND p.id < $${idIndex}::uuid))`
      );
    }

    filterParams.push(queryParams.limit + 1);
    const limitIndex = filterParams.length;

    const publicationResult = await query<{
      id: string;
      channel: string;
      variant_key: string;
      external_ref: string | null;
      published_at: string | null;
      created_at: string;
      document_version_id: string;
      version_number: number;
      policy_report_id: string | null;
      score: number | null;
      blocking_issues: number | null;
      sort_ts: string;
    }>(
      `SELECT
         p.id,
         p.channel,
         p.variant_key,
         p.external_ref,
         p.published_at,
         p.created_at,
         p.document_version_id,
         dv.version_number,
         pr.id AS policy_report_id,
         pr.score,
         pr.blocking_issues,
         COALESCE(p.published_at, p.created_at) AS sort_ts
       FROM publications p
       JOIN document_versions dv ON dv.id = p.document_version_id
       LEFT JOIN LATERAL (
         SELECT id, score, blocking_issues
         FROM policy_reports
         WHERE document_version_id = dv.id
         ORDER BY created_at DESC
         LIMIT 1
       ) pr ON TRUE
       WHERE ${where.join(" AND ")}
       ORDER BY COALESCE(p.published_at, p.created_at) DESC, p.id DESC
       LIMIT $${limitIndex}`,
      filterParams
    );

    const hasMore = publicationResult.rows.length > queryParams.limit;
    const rows = hasMore ? publicationResult.rows.slice(0, queryParams.limit) : publicationResult.rows;
    const last = rows.length > 0 ? rows[rows.length - 1] : null;

    res.status(200).json({
      documentId: params.documentId,
      publications: rows.map((row) => ({
        id: row.id,
        channel: row.channel,
        variantKey: row.variant_key,
        externalRef: row.external_ref,
        publishedAt: row.published_at,
        createdAt: row.created_at,
        version: {
          id: row.document_version_id,
          versionNumber: row.version_number
        },
        latestPolicyReport: row.policy_report_id
          ? {
              id: row.policy_report_id,
              score: row.score !== null ? Number(row.score) : null,
              blockingIssues: row.blocking_issues
            }
          : null
      })),
      nextCursor: hasMore && last ? encodeCursor(last.sort_ts, last.id) : null
    });
  } catch (error) {
    handleError(res, error);
  }
});

app.get("/v1/versions/:versionId", async (req, res) => {
  try {
    const params = z.object({ versionId: z.string().uuid() }).parse(req.params);
    const result = await query<{
      id: string;
      document_id: string;
      version_number: number;
      graph_json: unknown;
      plain_text: string;
      change_summary: string;
      created_at: string;
      policy_report_id: string | null;
      score: number | null;
      blocking_issues: number | null;
      findings_json: unknown;
    }>(
      `SELECT
         dv.id,
         dv.document_id,
         dv.version_number,
         dv.graph_json,
         dv.plain_text,
         dv.change_summary,
         dv.created_at,
         pr.id AS policy_report_id,
         pr.score,
         pr.blocking_issues,
         pr.findings_json
       FROM document_versions dv
       JOIN documents d ON d.id = dv.document_id
       LEFT JOIN LATERAL (
         SELECT id, score, blocking_issues, findings_json
         FROM policy_reports
         WHERE document_version_id = dv.id
         ORDER BY created_at DESC
         LIMIT 1
       ) pr ON TRUE
       WHERE dv.id = $1 AND d.workspace_id = $2`,
      [params.versionId, runtimeContext.workspaceId]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: "Version not found" });
      return;
    }

    const row = result.rows[0];
    res.status(200).json({
      id: row.id,
      documentId: row.document_id,
      versionNumber: row.version_number,
      graph: row.graph_json,
      plainText: row.plain_text,
      changeSummary: row.change_summary,
      createdAt: row.created_at,
      latestPolicyReport: row.policy_report_id
        ? {
            id: row.policy_report_id,
            score: row.score !== null ? Number(row.score) : null,
            blockingIssues: row.blocking_issues,
            findings: row.findings_json
          }
        : null
    });
  } catch (error) {
    handleError(res, error);
  }
});

app.post("/v1/intents", async (req, res) => {
  try {
    const payload = createIntentSchema.parse(req.body);
    const result = await query(
      `INSERT INTO intents (workspace_id, title, objective, audience, tone, constraints_json, created_by)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
       RETURNING id, title, objective, audience, tone, created_at`,
      [
        runtimeContext.workspaceId,
        payload.title,
        payload.objective,
        payload.audience,
        payload.tone,
        JSON.stringify(payload.constraints ?? {}),
        runtimeContext.userId
      ]
    );
    res.status(201).json({
      id: result.rows[0].id,
      title: result.rows[0].title,
      objective: result.rows[0].objective,
      audience: result.rows[0].audience,
      tone: result.rows[0].tone,
      createdAt: result.rows[0].created_at
    });
  } catch (error) {
    handleError(res, error);
  }
});

app.post("/v1/documents", async (req, res) => {
  try {
    const payload = createDocumentSchema.parse(req.body);
    const result = await query(
      `INSERT INTO documents (workspace_id, intent_id, title, status, created_by)
       VALUES ($1, $2, $3, 'draft', $4)
       RETURNING id, intent_id, title, status, current_version_id`,
      [runtimeContext.workspaceId, payload.intentId ?? null, payload.title, runtimeContext.userId]
    );
    res.status(201).json({
      id: result.rows[0].id,
      intentId: result.rows[0].intent_id,
      title: result.rows[0].title,
      status: result.rows[0].status,
      currentVersionId: result.rows[0].current_version_id
    });
  } catch (error) {
    handleError(res, error);
  }
});

app.post("/v1/documents/:documentId/generate", async (req, res) => {
  try {
    const params = z.object({ documentId: z.string().uuid() }).parse(req.params);
    const payload = generateSchema.parse(req.body ?? {});

    const documentResult = await query<{
      id: string;
      title: string;
      intent_id: string | null;
      workspace_id: string;
    }>("SELECT id, title, intent_id, workspace_id FROM documents WHERE id = $1 AND workspace_id = $2", [
      params.documentId,
      runtimeContext.workspaceId
    ]);

    if (documentResult.rowCount === 0) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    const document = documentResult.rows[0];

    const intent = document.intent_id
      ? await query<{ title: string; objective: string; audience: string; tone: string }>(
          "SELECT title, objective, audience, tone FROM intents WHERE id = $1",
          [document.intent_id]
        )
      : null;

    const jobInsert = await query<{ id: string; status: string; created_at: string }>(
      `INSERT INTO jobs (workspace_id, job_type, status, payload_json, created_by)
       VALUES ($1, 'generate', 'queued', $2::jsonb, $3)
       RETURNING id, status, created_at`,
      [
        document.workspace_id,
        JSON.stringify({
          documentId: document.id,
          mode: payload.mode,
          instructions: payload.instructions ?? ""
        }),
        runtimeContext.userId
      ]
    );

    const job = jobInsert.rows[0];

    res.status(202).json({
      job: {
        id: job.id,
        jobType: "generate",
        status: job.status,
        createdAt: job.created_at
      }
    });

    void runGenerateJob({
      jobId: job.id,
      documentId: document.id,
      documentTitle: document.title,
      mode: payload.mode,
      instructions: payload.instructions ?? "",
      intent:
        intent?.rows[0] && document.intent_id
          ? {
              id: document.intent_id,
              title: intent.rows[0].title,
              objective: intent.rows[0].objective,
              audience: intent.rows[0].audience,
              tone: intent.rows[0].tone
            }
          : null
    });
  } catch (error) {
    handleError(res, error);
  }
});

app.post("/v1/versions/:versionId/validate", async (req, res) => {
  try {
    const params = z.object({ versionId: z.string().uuid() }).parse(req.params);
    const versionResult = await query<{
      version_id: string;
      document_id: string;
      graph_json: unknown;
      plain_text: string;
      workspace_id: string;
    }>(
      `SELECT
         dv.id AS version_id,
         dv.document_id,
         dv.graph_json,
         dv.plain_text,
         d.workspace_id
       FROM document_versions dv
       JOIN documents d ON d.id = dv.document_id
       WHERE dv.id = $1 AND d.workspace_id = $2`,
      [params.versionId, runtimeContext.workspaceId]
    );

    if (versionResult.rowCount === 0) {
      res.status(404).json({ error: "Version not found" });
      return;
    }

    const version = versionResult.rows[0];
    const policyResponse = await fetch(`${policyEngineUrl}/validate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        versionId: version.version_id,
        documentId: version.document_id,
        plainText: version.plain_text,
        graph: version.graph_json
      })
    });

    if (!policyResponse.ok) {
      const errText = await policyResponse.text();
      throw new Error(`Policy engine error ${policyResponse.status}: ${errText}`);
    }

    const report = (await policyResponse.json()) as {
      score: number;
      blockingIssues: number;
      findings: Array<{ code: string; severity: string; message: string }>;
    };

    const insert = await query<{ id: string; created_at: string }>(
      `INSERT INTO policy_reports (workspace_id, document_version_id, score, findings_json, blocking_issues)
       VALUES ($1, $2, $3, $4::jsonb, $5)
       RETURNING id, created_at`,
      [version.workspace_id, version.version_id, report.score, JSON.stringify(report.findings ?? []), report.blockingIssues]
    );

    res.status(200).json({
      id: insert.rows[0].id,
      score: report.score,
      blockingIssues: report.blockingIssues,
      findings: report.findings,
      createdAt: insert.rows[0].created_at
    });
  } catch (error) {
    handleError(res, error);
  }
});

app.post("/v1/versions/:versionId/publish", async (req, res) => {
  try {
    const params = z.object({ versionId: z.string().uuid() }).parse(req.params);
    const payload = publishSchema.parse(req.body ?? {});

    const versionResult = await query<{
      version_id: string;
      document_id: string;
      workspace_id: string;
    }>(
      `SELECT
         dv.id AS version_id,
         dv.document_id,
         d.workspace_id
       FROM document_versions dv
       JOIN documents d ON d.id = dv.document_id
       WHERE dv.id = $1 AND d.workspace_id = $2`,
      [params.versionId, runtimeContext.workspaceId]
    );

    if (versionResult.rowCount === 0) {
      res.status(404).json({ error: "Version not found" });
      return;
    }

    const version = versionResult.rows[0];
    const latestPolicy = await query<{ id: string; blocking_issues: number; score: string }>(
      `SELECT id, blocking_issues, score
       FROM policy_reports
       WHERE document_version_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [version.version_id]
    );

    const hasBlockingIssues = latestPolicy.rowCount > 0 && Number(latestPolicy.rows[0].blocking_issues) > 0;
    if (hasBlockingIssues && !payload.force) {
      res.status(409).json({
        error: "Publication blocked by policy findings",
        blockingIssues: Number(latestPolicy.rows[0].blocking_issues),
        policyReportId: latestPolicy.rows[0].id,
        message: "Run publish with force=true to bypass this check"
      });
      return;
    }

    const publication = await withTransaction(async (client) => {
      const insert = await client.query<{ id: string; channel: string; variant_key: string; published_at: string }>(
        `INSERT INTO publications (
           workspace_id, document_version_id, channel, variant_key, external_ref, published_at, created_by
         ) VALUES ($1, $2, $3, $4, $5, NOW(), $6)
         RETURNING id, channel, variant_key, published_at`,
        [
          version.workspace_id,
          version.version_id,
          payload.channel,
          payload.variantKey,
          payload.externalRef ?? null,
          runtimeContext.userId
        ]
      );

      await client.query("UPDATE documents SET status = 'published' WHERE id = $1", [version.document_id]);

      return insert.rows[0];
    });

    res.status(201).json({
      id: publication.id,
      channel: publication.channel,
      variantKey: publication.variant_key,
      publishedAt: publication.published_at
    });
  } catch (error) {
    handleError(res, error);
  }
});

async function runGenerateJob(input: {
  jobId: string;
  documentId: string;
  documentTitle: string;
  mode: "draft" | "rewrite" | "expand" | "shorten";
  instructions: string;
  intent: {
    id: string;
    title: string;
    objective: string;
    audience: string;
    tone: string;
  } | null;
}) {
  try {
    await query("UPDATE jobs SET status = 'running', updated_at = NOW() WHERE id = $1", [input.jobId]);

    const orchestratorResponse = await fetch(`${orchestratorUrl}/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        documentTitle: input.documentTitle,
        mode: input.mode,
        instructions: input.instructions,
        intent: input.intent
      })
    });

    if (!orchestratorResponse.ok) {
      const errText = await orchestratorResponse.text();
      throw new Error(`Orchestrator error ${orchestratorResponse.status}: ${errText}`);
    }

    const generated = (await orchestratorResponse.json()) as {
      graph: unknown;
      plainText: string;
      changeSummary: string;
      trace: {
        modelName: string;
        promptText: string;
        tools: unknown[];
        sources: unknown[];
        tokenInput: number;
        tokenOutput: number;
        latencyMs: number;
      };
    };

    const output = await withTransaction(async (client) => {
      const versionResult = await client.query<{ next_version: number }>(
        "SELECT COALESCE(MAX(version_number), 0) + 1 AS next_version FROM document_versions WHERE document_id = $1",
        [input.documentId]
      );
      const nextVersion = Number(versionResult.rows[0].next_version);

      const insertVersion = await client.query<{ id: string }>(
        `INSERT INTO document_versions (document_id, version_number, graph_json, plain_text, change_summary, created_by)
         VALUES ($1, $2, $3::jsonb, $4, $5, $6)
         RETURNING id`,
        [
          input.documentId,
          nextVersion,
          JSON.stringify(generated.graph),
          generated.plainText,
          generated.changeSummary,
          runtimeContext.userId
        ]
      );

      const versionId = insertVersion.rows[0].id;

      await client.query("UPDATE documents SET current_version_id = $1 WHERE id = $2", [versionId, input.documentId]);

      const promptHash = crypto.createHash("sha256").update(generated.trace.promptText).digest("hex");

      await client.query(
        `INSERT INTO ai_trace_events (
          workspace_id, document_version_id, job_id, model_name, prompt_hash, prompt_text, tools_json, sources_json,
          token_input, token_output, latency_ms
        ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10, $11)`,
        [
          runtimeContext.workspaceId,
          versionId,
          input.jobId,
          generated.trace.modelName,
          promptHash,
          generated.trace.promptText,
          JSON.stringify(generated.trace.tools ?? []),
          JSON.stringify(generated.trace.sources ?? []),
          generated.trace.tokenInput,
          generated.trace.tokenOutput,
          generated.trace.latencyMs
        ]
      );

      return { versionId, nextVersion };
    });

    await query(
      "UPDATE jobs SET status = 'succeeded', result_json = $1::jsonb, updated_at = NOW() WHERE id = $2",
      [JSON.stringify({ versionId: output.versionId, versionNumber: output.nextVersion }), input.jobId]
    );
  } catch (error) {
    await query("UPDATE jobs SET status = 'failed', error_json = $1::jsonb, updated_at = NOW() WHERE id = $2", [
      JSON.stringify({ message: error instanceof Error ? error.message : "unknown error" }),
      input.jobId
    ]);
  }
}

function handleError(res: express.Response, error: unknown) {
  if (error instanceof z.ZodError) {
    res.status(400).json({ error: "Validation error", details: error.flatten() });
    return;
  }
  res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
}

function encodeCursor(ts: string, id: string): string {
  return Buffer.from(JSON.stringify({ ts, id }), "utf8").toString("base64url");
}

function decodeCursor(raw?: string): { ts: string; id: string } | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as { ts?: string; id?: string };
    if (!parsed.ts || !parsed.id) {
      return null;
    }
    return { ts: parsed.ts, id: parsed.id };
  } catch {
    return null;
  }
}

function encodeVersionCursor(versionNumber: number, id: string): string {
  return Buffer.from(JSON.stringify({ versionNumber, id }), "utf8").toString("base64url");
}

function decodeVersionCursor(raw?: string): { versionNumber: number; id: string } | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as {
      versionNumber?: number;
      id?: string;
    };
    if (typeof parsed.versionNumber !== "number" || !parsed.id) {
      return null;
    }
    return { versionNumber: parsed.versionNumber, id: parsed.id };
  } catch {
    return null;
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }
  runtimeContext = await ensureRuntimeContext();
  app.listen(port, () => {
    console.log(`API listening on :${port}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
