// ============================================================
// Type declarations for packages without @types
// Session 131.
// ============================================================

declare module 'winston-daily-rotate-file' {
  import Transport from 'winston-transport';

  interface DailyRotateFileTransportOptions {
    dirname?: string;
    filename?: string;
    datePattern?: string;
    maxSize?: string;
    maxFiles?: string;
    level?: string;
    [key: string]: unknown;
  }

  class DailyRotateFile extends Transport {
    constructor(opts?: DailyRotateFileTransportOptions);
  }

  export = DailyRotateFile;
}

declare module 'snoowrap' {
  class Snoowrap {
    constructor(opts: Record<string, unknown>);
    getSubreddit(name: string): any;
  }
  export = Snoowrap;
}

declare module 'node-cron' {
  export function schedule(expression: string, func: () => void): unknown;
}

declare module 'rss-parser' {
  interface Item {
    title?: string;
    link?: string;
    pubDate?: string;
    isoDate?: string;
    [key: string]: unknown;
  }

  interface Feed {
    items: Item[];
    [key: string]: unknown;
  }

  interface ParserOptions {
    timeout?: number;
    headers?: Record<string, string>;
    [key: string]: unknown;
  }

  class Parser {
    constructor(opts?: ParserOptions);
    parseURL(url: string): Promise<Feed>;
  }

  export = Parser;
}
