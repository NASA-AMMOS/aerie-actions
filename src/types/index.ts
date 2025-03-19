import type {ActionsAPI} from "../index";

// Parameters and settings are user-defined
export type ActionParameters = { [key: string]: any };
export type ActionSettings = { [key: string]: any };

export type ActionResult = {
    status: "FAILED" | "SUCCESS",
    data: any,
    [key: string]: any
};

export type ActionMain = (
    actionParameters: ActionParameters,
    actionSettings: ActionSettings,
    actionsAPI: ActionsAPI
) => Promise<ActionResult>;
