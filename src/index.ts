import { readFile } from 'node:fs/promises';
import type { PoolClient, QueryResult } from 'pg';
import { ENVIRONMENT_VARIABLE_PREFIX } from './consts';
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

export type ReadDictionaryResult = {
  id: number;
  dictionary_path: string;
  dictionary_file_path: string;
  mission: string;
  version: number;
  parsed_json: any;
  created_at: string;
  updated_at: string;
};

function dictionaryQuery(tableName: 'channel_dictionary' | 'command_dictionary' | 'parameter_dictionary'): string {
  return `
    select id, dictionary_path, dictionary_file_path, mission, version, parsed_json, created_at, updated_at
    from sequencing.${tableName}
      where id = $1;
  `;
}

export function queryReadChannelDictionary(
  dbClient: PoolClient,
  id: number,
): Promise<QueryResult<ReadDictionaryResult>> {
  return dbClient.query(dictionaryQuery('channel_dictionary'), [id]);
}

export function queryReadCommandDictionary(
  dbClient: PoolClient,
  id: number,
): Promise<QueryResult<ReadDictionaryResult>> {
  return dbClient.query(dictionaryQuery('command_dictionary'), [id]);
}

export function queryReadParameterDictionary(
  dbClient: PoolClient,
  id: number,
): Promise<QueryResult<ReadDictionaryResult>> {
  return dbClient.query(dictionaryQuery('parameter_dictionary'), [id]);
}

export type ReadParcelResult = {
  id: number;
  name: string;
  command_dictionary_id: number;
  channel_dictionary_id: number;
  sequence_adaptation_id: number;
  created_at: string;
  owner?: string;
  updated_at: string;
  updated_by: string;
};

export function queryReadParcel(dbClient: PoolClient, id: number): Promise<QueryResult<ReadParcelResult>> {
  return dbClient.query(
    `
      select name, id, command_dictionary_id, channel_dictionary_id, sequence_adaptation_id, created_at, owner, updated_at, updated_by
      from sequencing.parcel
        where id = $1;
    `,
    [id],
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

export interface Config {
  ACTION_FILE_STORE: string;
  SEQUENCING_FILE_STORE: string;
}

// Main API class used by the user's action

export class ActionsAPI {
  dbClient: PoolClient;
  workspaceId: number;

  ACTION_FILE_STORE: string;
  SEQUENCING_FILE_STORE: string;

  constructor(dbClient: PoolClient, workspaceId: number, config: Config) {
    this.dbClient = dbClient;
    this.workspaceId = workspaceId;

    this.ACTION_FILE_STORE = config.ACTION_FILE_STORE;
    this.SEQUENCING_FILE_STORE = config.SEQUENCING_FILE_STORE;
  }

  /**
   * Finds an environment variable by name if it is prefixed with `PUBLIC_ACTION_`.
   *
   * @param name The name of the environment variable.
   * @returns The value of the environment variable if it was found, otherwise undefined.
   */
  getEnvironmentVariable(name: string): string | undefined {
    if (name.startsWith(ENVIRONMENT_VARIABLE_PREFIX)) {
      return process.env[name];
    }

    return undefined;
  }

  async listSequences(): Promise<SequenceListResult[]> {
    // List all sequences in the action's workspace
    const result = await queryListSequences(this.dbClient, this.workspaceId);
    return result.rows;
  }

  async readChannelDictionary(id: number): Promise<ReadDictionaryResult> {
    const result = await queryReadChannelDictionary(this.dbClient, id);
    const rows = result.rows;

    if (!rows.length) {
      throw new Error(`Channel Dictionary with id: ${id} does not exist`);
    }

    return rows[0];
  }

  async readCommandDictionary(id: number): Promise<ReadDictionaryResult> {
    const result = await queryReadCommandDictionary(this.dbClient, id);
    const rows = result.rows;

    if (!rows.length) {
      throw new Error(`Command Dictionary with id: ${id} does not exist`);
    }

    return rows[0];
  }

  async readParameterDictionary(id: number): Promise<ReadDictionaryResult> {
    const result = await queryReadParameterDictionary(this.dbClient, id);
    const rows = result.rows;

    if (!rows.length) {
      throw new Error(`Parameter Dictionary with id: ${id} does not exist`);
    }

    return rows[0];
  }

  async readDictionaryFile(filePath: string): Promise<string> {
    return await readFile(`${filePath.replace(this.SEQUENCING_FILE_STORE, this.ACTION_FILE_STORE)}`, 'utf-8');
  }

  async readParcel(id: number): Promise<ReadParcelResult> {
    const result = await queryReadParcel(this.dbClient, id);
    const rows = result.rows;

    if (!rows.length) {
      throw new Error(`Parcel with id: ${id} does not exist`);
    }

    return rows[0];
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

  // TODO: rethink whether or not parcelId can have a sane default value or should be required?
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
