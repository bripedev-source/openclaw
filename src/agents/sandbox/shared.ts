import path from "node:path";
import { resolveUserPath, slugifySessionKey } from "../../utils.js";
import { normalizeAgentId, resolveAgentIdFromSessionKey } from "../agent-scope.js";

export { slugifySessionKey };

export function resolveSandboxWorkspaceDir(root: string, sessionKey: string) {
  const resolvedRoot = resolveUserPath(root);
  const slug = slugifySessionKey(sessionKey);
  return path.join(resolvedRoot, slug);
}

export function resolveSandboxScopeKey(scope: "session" | "agent" | "shared", sessionKey: string) {
  const trimmed = sessionKey.trim() || "main";
  if (scope === "shared") {
    return "shared";
  }
  if (scope === "session") {
    return trimmed;
  }
  const agentId = resolveAgentIdFromSessionKey(trimmed);
  return `agent:${agentId}`;
}

export function resolveSandboxAgentId(scopeKey: string): string | undefined {
  const trimmed = scopeKey.trim();
  if (!trimmed || trimmed === "shared") {
    return undefined;
  }
  const parts = trimmed.split(":").filter(Boolean);
  if (parts[0] === "agent" && parts[1]) {
    return normalizeAgentId(parts[1]);
  }
  return resolveAgentIdFromSessionKey(trimmed);
}
