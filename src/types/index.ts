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


export type UserRole = string | 'aerie_admin';

export type ActionsConfig = {
  ACTION_FILE_STORE: string;
  SEQUENCING_FILE_STORE: string;
  WORKSPACE_BASE_URL: string;
  HASURA_GRAPHQL_ADMIN_SECRET: string;
  SECRETS?: Record<string, string>;
};
