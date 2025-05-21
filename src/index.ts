import { readFile } from 'node:fs/promises';
import type { PoolClient, QueryResult } from 'pg';
import {
  ReadDictionaryResult,
  ReadSequenceResult,
  ReadSequenceListResult,
  WriteSequenceResult,
  ReadParcelResult,
} from './types/db-types';
import { dictionaryQuery, queryReadParcel } from './helpers/db-helpers';
import { Config } from './types';
export * from './types';

/**
 * Reads a list of sequences for a given `workspaceId`.
 *
 * @param dbClient - A client that is part of our connection pool.
 * @param workspaceId - The id of the workspace the sequence is a part of.
 * @returns {@link ReadSequenceListResult}
 */
export function queryListSequences(
  dbClient: PoolClient,
  workspaceId: number,
): Promise<QueryResult<ReadSequenceListResult>> {
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

/**
 * Reads a Channel Dictionary for a given `id`.
 *
 * @param dbClient - A client that is part of our connection pool.
 * @param id - The id of the Channel Dictionary.
 * @returns {@link ReadDictionaryResult}
 */
export function queryReadChannelDictionary(
  dbClient: PoolClient,
  id: number,
): Promise<QueryResult<ReadDictionaryResult>> {
  return dbClient.query(dictionaryQuery('channel_dictionary'), [id]);
}

/**
 * Reads a Command Dictionary for a given `id`.
 *
 * @param dbClient - A client that is part of our connection pool.
 * @param id - The id of the Command Dictionary.
 * @returns {@link ReadDictionaryResult}
 */
export function queryReadCommandDictionary(
  dbClient: PoolClient,
  id: number,
): Promise<QueryResult<ReadDictionaryResult>> {
  return dbClient.query(dictionaryQuery('command_dictionary'), [id]);
}

/**
 * Reads a Parameter Dictionary for a given `id`.
 *
 * @param dbClient - A client that is part of our connection pool.
 * @param id - The id of the Parameter Dictionary.
 * @returns {@link ReadDictionaryResult}
 */
export function queryReadParameterDictionary(
  dbClient: PoolClient,
  id: number,
): Promise<QueryResult<ReadDictionaryResult>> {
  return dbClient.query(dictionaryQuery('parameter_dictionary'), [id]);
}

/**
 * Reads a Sequence for a given `name` and `workspaceId`.
 *
 * @param dbClient - A client that is part of our connection pool.
 * @param name - The name of the Sequence.
 * @param workspaceId - The id of the Workspace that the Sequence is a part of.
 * @returns {@link ReadSequenceResult}
 */
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

/**
 * Find a Sequence by name in the same Workspace that the Action is running in, if it exists
 * overwrite its definition otherwise create it.
 *
 * @param dbClient - A client that is part of our connection pool.
 * @param name - The name of the Sequence.
 * @param workspaceId - The id of the Workspace that the Sequence is a part of.
 * @param definition - The definition of the Sequence.
 * @param parcelId - The id of the Parcel that the Sequence was written with.
 * @returns {@link WriteSequenceResult}
 */
export function queryWriteSequence(
  dbClient: PoolClient,
  name: string,
  workspaceId: number,
  definition: string,
  parcelId: number,
): Promise<QueryResult<WriteSequenceResult>> {
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

  ACTION_FILE_STORE: string;
  SEQUENCING_FILE_STORE: string;

  /**
   *
   * @param dbClient - A client that is part of our connection pool.
   * @param workspaceId - The id of the Workspace the Action is associated with.
   * @param config - {@link Config} A config containing an `ACTION_FILE_STORE` and `SEQUENCING_FILE_STORE` so the action
   * can read files.
   */
  constructor(dbClient: PoolClient, workspaceId: number, config: Config) {
    this.dbClient = dbClient;
    this.workspaceId = workspaceId;

    this.ACTION_FILE_STORE = config.ACTION_FILE_STORE;
    this.SEQUENCING_FILE_STORE = config.SEQUENCING_FILE_STORE;
  }

  /**
   * Lists all the Sequences in the Action's Workspace.
   *
   * @returns - {@link ReadSequenceListResult}
   */
  async listSequences(): Promise<ReadSequenceListResult[]> {
    const result = await queryListSequences(this.dbClient, this.workspaceId);
    return result.rows;
  }

  /**
   * Reads a Channel Dictionary from the database.
   *
   * @param id - The id of the Channel Dictionary.
   * @returns {@link ReadDictionaryResult}
   */
  async readChannelDictionary(id: number): Promise<ReadDictionaryResult> {
    const result = await queryReadChannelDictionary(this.dbClient, id);
    const rows = result.rows;

    if (!rows.length) {
      throw new Error(`Channel Dictionary with id: ${id} does not exist`);
    }

    return rows[0];
  }

  /**
   * Reads a Command Dictionary from the database.
   *
   * @param id - The id of the Command Dictionary.
   * @returns {@link ReadDictionaryResult}
   */
  async readCommandDictionary(id: number): Promise<ReadDictionaryResult> {
    const result = await queryReadCommandDictionary(this.dbClient, id);
    const rows = result.rows;

    if (!rows.length) {
      throw new Error(`Command Dictionary with id: ${id} does not exist`);
    }

    return rows[0];
  }

  /**
   * Reads a Parameter Dictionary from the database.
   *
   * @param id - The id of the Parameter Dictionary.
   * @returns {@link ReadDictionaryResult}
   */
  async readParameterDictionary(id: number): Promise<ReadDictionaryResult> {
    const result = await queryReadParameterDictionary(this.dbClient, id);
    const rows = result.rows;

    if (!rows.length) {
      throw new Error(`Parameter Dictionary with id: ${id} does not exist`);
    }

    return rows[0];
  }

  /**
   * Reads the file contents from file given a path to that file. The path is sanitized so the requester cannot
   * look outside of the file store.
   *
   * @param filePath - The path to the file.
   * @returns The file contents as a string.
   */
  async readDictionaryFile(filePath: string): Promise<string> {
    return await readFile(`${filePath.replace(this.SEQUENCING_FILE_STORE, this.ACTION_FILE_STORE)}`, 'utf-8');
  }

  /**
   * Reads a Parcel for a given id.
   *
   * @param id - The id of the Parcel.
   * @returns {@link ReadParcelResult}
   */
  async readParcel(id: number): Promise<ReadParcelResult> {
    const result = await queryReadParcel(this.dbClient, id);
    const rows = result.rows;

    if (!rows.length) {
      throw new Error(`Parcel with id: ${id} does not exist`);
    }

    return rows[0];
  }

  /**
   * Reads a Sequence for a given Sequence name.
   *
   * @param name - The name of the Sequence.
   * @returns {@link ReadSequenceResult}
   */
  async readSequence(name: string): Promise<ReadSequenceResult> {
    const result = await queryReadSequence(this.dbClient, name, this.workspaceId);
    const rows = result.rows;

    if (!rows.length) {
      throw new Error(`Sequence ${name} does not exist`);
    }
    return rows[0];
  }

  /**
   * Find a Sequence by name in the same Workspace as the Action, if it exists overwrite its definition otherwise
   * create it.
   *
   * @param name - The name of the Sequence.
   * @param definition - The new definition of the Sequence.
   * @param parcelId - The Parcel id of the sequence, @defaultValue `1`.
   * @returns
   */
  async writeSequence(name: string, definition: string, parcelId: number = 1): Promise<any> {
    // TODO: rethink whether or not parcelId can have a sane default value or should be required?
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
