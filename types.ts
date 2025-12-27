
export interface ProcessingOptions {
  removeLinks: boolean;
  removeCodeBlocks: boolean;
  flattenLists: boolean;
  removeImages: boolean;
  preserveSpacing: boolean;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  input: string;
  output: string;
  title: string;
}

export enum ProcessingStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}
