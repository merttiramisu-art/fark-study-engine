export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface JsonRpcMessage {
  jsonrpc: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: {
    code: number;
    message: string;
  };
}

export interface McpServerIo {
  input?: NodeJS.ReadableStream;
  output?: NodeJS.WritableStream;
  errorOutput?: NodeJS.WritableStream;
}

/** Maximum size of a complete MCP stdio request line, in UTF-8 bytes (1 MiB). */
export declare const MAX_MCP_MESSAGE_BYTES: number;

export declare const MCP_TOOLS: readonly McpToolDefinition[];

export function handleMcpRequest(message: JsonRpcMessage): JsonRpcResponse | null;

export function startMcpServer(io?: McpServerIo): Promise<void>;
