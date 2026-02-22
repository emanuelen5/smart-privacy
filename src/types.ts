/** Shared types used across background, content, popup, and options scripts. */

export interface StorageData {
  approvedDomains: string[];
  deniedDomains: string[];
  visitCounts: Record<string, number>;
  promptedDomains: string[];
  visitThreshold: number;
}

export type PromptReason = 'repeated_visits' | 'password';

export interface GetStatusMessage { type: 'getStatus'; domain?: string; }
export interface ApproveMessage { type: 'approve'; domain?: string; }
export interface DenyMessage { type: 'deny'; domain?: string; }
export interface RemoveMessage { type: 'remove'; domain: string; }
export interface PasswordDetectedMessage { type: 'passwordDetected'; }
export interface ShowPromptMessage { type: 'showPrompt'; domain: string; reason: PromptReason; }

export type BackgroundMessage =
  | GetStatusMessage
  | ApproveMessage
  | DenyMessage
  | RemoveMessage
  | PasswordDetectedMessage;

export interface DomainStatus {
  approved: boolean;
  denied: boolean;
  prompted: boolean;
  visitCount: number;
}
