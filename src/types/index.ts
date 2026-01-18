import { WebSocket } from "ws";

export interface CDPConnection {
  ws: WebSocket;
  call: (method: string, params: any) => Promise<any>;
  contexts: any[];
  lastSuccessfulContextId?: number;
}

export interface ScrollInfo {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
  scrollPercent: number;
}

export interface SnapshotStats {
  nodes: number;
  htmlSize: number;
  cssSize: number;
}

export interface Snapshot {
  html: string;
  css: string;
  backgroundColor: string;
  color: string;
  fontFamily: string;
  scrollInfo: ScrollInfo;
  stats: SnapshotStats;
  error?: string;
}

export interface AppState {
  mode: string;
  model: string;
  error?: string;
}

export interface ActionResult {
  success?: boolean;
  ok?: boolean;
  error?: string;
  reason?: string;
  method?: string;
  alreadySet?: boolean;
  [key: string]: any;
}

export interface ClickParams {
  selector: string;
  index: number;
  textContent?: string;
}

export interface ScrollParams {
  scrollTop?: number;
  scrollPercent?: number;
}

export interface CDPRef {
  current: CDPConnection | null;
}
