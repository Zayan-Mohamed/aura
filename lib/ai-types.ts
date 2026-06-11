/**
 * Shared, dependency-light types for the chat UI.
 *
 * Only `import type` from here in client components — `AuraTools` is type-only
 * so it never pulls the server-side MCP client into the browser bundle.
 */
import type { InferUITools, UIDataTypes, UIMessage } from "ai";
import type { AuraTools } from "./tools";

export type AuraUITools = InferUITools<AuraTools>;

/** The strongly-typed message shape exchanged with the chat endpoint. */
export type AuraUIMessage = UIMessage<never, UIDataTypes, AuraUITools>;

/** Convenience: a tool part's `type` string, e.g. "tool-searchProducts". */
export type AuraToolName = keyof AuraTools;
