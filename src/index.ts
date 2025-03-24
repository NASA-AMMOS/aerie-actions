import type { PoolClient, QueryResult } from 'pg';
export * from './types';

// types and helpers for making DB queries

// type for results of the Sequence List db query
export type SequenceListResult = {
  name: string;
  id: number;
  workspace_id: number;
  parcel_id: number;
  owner?: string;
  created_at: string;
  updated_at: string;
};

export function queryListSequences(
    dbClient: PoolClient,
    workspaceId: number,
): Promise<QueryResult<SequenceListResult>> {
  // List all sequences in the action's workspace
  return dbClient.query(
      `
      select name, id, workspace_id, parcel_id, owner, created_at, updated_at 
        from sequencing.user_sequence
        where workspace_id = $1;
    `,
      [workspaceId],
  );
}

// ---
// type for results of the Read Sequence db query
export type ReadSequenceResult = {
  name: string;
  id: number;
  workspace_id: number;
  parcel_id: number;
  definition: string;
  seq_json?: string;
  owner?: string;
  created_at: string;
  updated_at: string;
};

export function queryReadSequence(
    dbClient: PoolClient,
    name: string,
    workspaceId: number,
): Promise<QueryResult<ReadSequenceResult>> {
  return dbClient.query(
      `
      select name, id, workspace_id, parcel_id, definition, seq_json, owner, created_at, updated_at
      from sequencing.user_sequence
        where name = $1 
          and workspace_id = $2;
    `,
      [name, workspaceId],
  );
}

// ---
// type for results of the Read Sequence db query
export type WriteSequenceResult = {};

export function queryWriteSequence(
    dbClient: PoolClient,
    name: string,
    workspaceId: number,
    definition: string,
    parcelId: number,
): Promise<QueryResult<WriteSequenceResult>> {
  // find a sequence by name, in the same workspace as the action
  // if it exists, overwrite its definition; else create it
  return dbClient.query(
      `
      WITH updated AS (
        UPDATE sequencing.user_sequence
        SET definition = $3
        WHERE name = $1 AND workspace_id = $2
        RETURNING *
      )
      -- insert sequence if we didn't successfully update 
      INSERT INTO sequencing.user_sequence (name, workspace_id, definition, parcel_id)
      SELECT $1, $2, $3, $4
      WHERE NOT EXISTS (SELECT 1 FROM updated);
    `,
      [name, workspaceId, definition, parcelId],
  );
}

// Main API class used by the user's action

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
