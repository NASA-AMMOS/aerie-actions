import { ActionParameters } from './action-parameters';
import { ActionResult } from './action-result';
import { ActionSettings } from './action-settings';

export type ActionMain = (
  actionParameters: ActionParameters,
  actionSettings: ActionSettings,
  authToken: string,
) => Promise<ActionResult>;
