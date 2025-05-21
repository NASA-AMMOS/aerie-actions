import type { ActionsAPI } from '../index';

// parameter/setting schema types
export * from './schema';

export type ActionResult = {
  status: 'FAILED' | 'SUCCESS';
  data: any;
  [key: string]: any;
};

export type ActionMain = (
  // Parameters and settings are user-defined
  actionParameters: { [key: string]: any },
  actionSettings: { [key: string]: any },
  actionsAPI: ActionsAPI,
) => Promise<ActionResult>;

export interface Config {
  ACTION_FILE_STORE: string;
  SEQUENCING_FILE_STORE: string;
}
