import { PoolClient } from 'pg';
import {
  queryListSequences,
  queryReadSequence,
  queryWriteSequence,
  ReadSequenceResult,
  SequenceListResult,
} from './db';

export * from './types';

export class ActionsAPI {
  dbClient: PoolClient;
  workspaceId: number;

  constructor(dbClient: PoolClient, workspaceId: number) {
    this.dbClient = dbClient;
    this.workspaceId = workspaceId;
  }

  async listSequences(): Promise<SequenceListResult[]> {
    // List all sequences in the action's workspace
    const result = await queryListSequences(this.dbClient, this.workspaceId);
    return result.rows;
  }
  async readSequence(name: string): Promise<ReadSequenceResult> {
    // Find a single sequence in the workspace by name, and read its contents
    const result = await queryReadSequence(this.dbClient, name, this.workspaceId);
    const rows = result.rows;
    if (!rows.length) {
      throw new Error(`Sequence ${name} does not exist`);
    }
    return rows[0];
  }
  // todo: rethink whether or not parcelId can have a sane default value or should be required?
  async writeSequence(name: string, definition: string, parcelId: number = 1): Promise<any> {
    // find a sequence by name, in the same workspace as the action
    // if it exists, overwrite its definition; else create it
    return await queryWriteSequence(this.dbClient, name, this.workspaceId, definition, parcelId);
  }
}

/*
** Deprecated until we figure out how/if we should get a hasura auth token
** (currently we only have a PG DB connection in the action context)

export async function postToAerie(aerieInstanceUrl: string, endpoint: string, authToken: string): Promise<any> {
  const response = await fetch(`${aerieInstanceUrl}/${endpoint}`, {
    method: 'post',
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
  });

  return await response.json();
}

export async function getFromAerie(aerieInstanceUrl: string, endpoint: string, authToken: string): Promise<any> {
  const response = await fetch(`${aerieInstanceUrl}/${endpoint}`, {
    method: 'get',
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
  });

  return await response.json();
}
*/
