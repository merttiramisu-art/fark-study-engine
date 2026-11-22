import type { ImportedOpenContentPack } from './content-adapter.js';

export declare const MARKDOWN_CONTENT_LIMITS: Readonly<{
  maxBytes: number;
  maxLines: number;
}>;

/** Restricted, offline FARK Markdown v1; lesson bodies stay inert. */
export declare function importMarkdownContentPack(markdown: string): ImportedOpenContentPack;
