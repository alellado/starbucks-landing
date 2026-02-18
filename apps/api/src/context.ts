import { query } from "./db.js";

export interface RuntimeContext {
  workspaceId: string;
  userId: string;
}

export async function ensureRuntimeContext(): Promise<RuntimeContext> {
  const workspaceName = process.env.DEFAULT_WORKSPACE_NAME ?? "Default Workspace";
  const userEmail = process.env.DEFAULT_USER_EMAIL ?? "system@local.cms";
  const userName = process.env.DEFAULT_USER_NAME ?? "System User";

  const workspaceResult = await query<{ id: string }>(
    "INSERT INTO workspaces (name) VALUES ($1) ON CONFLICT DO NOTHING RETURNING id",
    [workspaceName]
  );

  let workspaceId = workspaceResult.rows[0]?.id;
  if (!workspaceId) {
    const existingWorkspace = await query<{ id: string }>("SELECT id FROM workspaces WHERE name = $1 LIMIT 1", [
      workspaceName
    ]);
    workspaceId = existingWorkspace.rows[0].id;
  }

  const userResult = await query<{ id: string }>(
    "INSERT INTO users (email, display_name) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING RETURNING id",
    [userEmail, userName]
  );

  let userId = userResult.rows[0]?.id;
  if (!userId) {
    const existingUser = await query<{ id: string }>("SELECT id FROM users WHERE email = $1 LIMIT 1", [userEmail]);
    userId = existingUser.rows[0].id;
  }

  await query(
    "INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, 'admin') ON CONFLICT DO NOTHING",
    [workspaceId, userId]
  );

  return { workspaceId, userId };
}

