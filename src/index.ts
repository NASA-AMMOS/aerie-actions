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
import { ActionsConfig, User } from './types';
export * from './types';

/**
 * Reads a list of sequences for a given `workspaceId`.
 *
 * @param dbClient - A client that is part of our connection pool.
 * @param workspaceId - The id of the workspace the sequence is a part of.
 * @returns The list of sequences in the workspace (without their contents)

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
*/

/**
 * Reads a Channel Dictionary for a given `id`.
 *
 * @param dbClient - A client that is part of our connection pool.
 * @param id - The id of the Channel Dictionary.
 * @returns The Channel Dictionary with the given ID
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
 * @returns The Command Dictionary with the given ID
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
 * @returns The Parameter Dictionary with the given ID
 */
export function queryReadParameterDictionary(
  dbClient: PoolClient,
  id: number,
): Promise<QueryResult<ReadDictionaryResult>> {
  return dbClient.query(dictionaryQuery('parameter_dictionary'), [id]);
}



// Queries used for new file-first workspaces
// export function queryReadFile(
//   name: string,
//   workspaceId: number,
// ): Promise<QueryResult<ReadSequenceResult>> {
//   return dbClient.query(
//     `
//       select name, id, workspace_id, parcel_id, definition, seq_json, owner, created_at, updated_at
//       from sequencing.user_sequence
//         where name = $1
//           and workspace_id = $2;
//     `,
//     [name, workspaceId],
//   );
// }

// export type ReadFileResult = {
//   name: string;
//   id: number;
//   workspace_id: number;
//   parcel_id: number;
//   definition: string;
//   seq_json?: string;
//   owner?: string;
//   created_at: string;
//   updated_at: string;
// };

// ---
// type for results of the Read Sequence db query
// export type ReadSequenceResult = {
//   name: string;
//   id: number;
//   workspace_id: number;
//   parcel_id: number;
//   definition: string;
//   seq_json?: string;
//   owner?: string;
//   created_at: string;
//   updated_at: string;
// };
//
// export function queryReadSequence(
//   dbClient: PoolClient,
//   name: string,
//   workspaceId: number,
// ): Promise<QueryResult<ReadSequenceResult>> {
//   return dbClient.query(
//     `
//       select name, id, workspace_id, parcel_id, definition, seq_json, owner, created_at, updated_at
//       from sequencing.user_sequence
//         where name = $1
//           and workspace_id = $2;
//     `,
//     [name, workspaceId],
//   );
// }

// ---
// type for results of the Read Sequence db query
// export type WriteSequenceResult = {};
//
// export function queryWriteSequence(
//   dbClient: PoolClient,
//   name: string,
//   workspaceId: number,
//   definition: string,
//   parcelId: number,
// ): Promise<QueryResult<WriteSequenceResult>> {
//   // find a sequence by name, in the same workspace as the action
//   // if it exists, overwrite its definition; else create it
//   return dbClient.query(
//     `
//       WITH updated AS (
//         UPDATE sequencing.user_sequence
//         SET definition = $3
//         WHERE name = $1 AND workspace_id = $2
//         RETURNING *
//       )
//       -- insert sequence if we didn't successfully update
//       INSERT INTO sequencing.user_sequence (name, workspace_id, definition, parcel_id)
//       SELECT $1, $2, $3, $4
//       WHERE NOT EXISTS (SELECT 1 FROM updated);
//     `,
//     [name, workspaceId, definition, parcelId],
//   );
// }

// Main API class used by the user's action
export class ActionsAPI {
  dbClient?: PoolClient;
  workspaceId: number;
  user: User | null;

  ACTION_FILE_STORE: string;
  SEQUENCING_FILE_STORE: string;
  WORKSPACE_BASE_URL: string;
  config: ActionsConfig;

  static ENVIRONMENT_VARIABLE_PREFIX = 'PUBLIC_ACTION_';

  /**
   *
   * @param dbClient - A client that is part of our connection pool.
   * @param workspaceId - The id of the Workspace the Action is associated with.
   * @param config - A config containing an `ACTION_FILE_STORE` and `SEQUENCING_FILE_STORE` so the action
   * can read files.
   */
  constructor(dbClient: PoolClient, workspaceId: number, config: ActionsConfig, user: User | null) {
    this.dbClient = dbClient;
    this.workspaceId = workspaceId;
    this.user = user;
    this.dbClient = dbClient;

    this.ACTION_FILE_STORE = config.ACTION_FILE_STORE;
    this.SEQUENCING_FILE_STORE = config.SEQUENCING_FILE_STORE;
    this.WORKSPACE_BASE_URL = config.WORKSPACE_BASE_URL;
  }

  /**
   * Finds an environment variable by name if it is prefixed with `PUBLIC_ACTION_`.
   *
   * @param name The name of the environment variable.
   * @returns The value of the environment variable if it was found, otherwise undefined.
   */

  getEnvironmentVariable(name: string): string | undefined {
    if (name.startsWith(ActionsAPI.ENVIRONMENT_VARIABLE_PREFIX)) {
      return process.env[name];
    } else {
      console.warn(
        `Only environment variables with the prefix: ${ActionsAPI.ENVIRONMENT_VARIABLE_PREFIX} can be accessed from within an action.`,
      );
    }

    return undefined;
  }

  // Helper to make HTTP requests to workspace service
  private async reqWorkspace<T = any>(
    path: string,
    method: string,
    body: any | null = null,
    asJson: boolean = true,
  ): Promise<T> {
    if (!this.WORKSPACE_BASE_URL) {
      throw new Error('WORKSPACE_BASE_URL not configured');
    }
    if (!this.user) {
      throw new Error('User auth info required for workspace HTTP requests');
    }

    const headers: HeadersInit = {
      Authorization: `Bearer ${this.user.token ?? 'TODO'}`,
      'x-hasura-role': this.user.activeRole ?? 'TODO',
      'x-hasura-user-id': this.user.id ?? 'TODO',
    };

    const methodsWithBody = ['POST', 'PUT', 'PATCH'];
    let requestBody: BodyInit | undefined = undefined;

    if (body !== null && methodsWithBody.includes(method.toUpperCase())) {
      if (body instanceof FormData) {
        // Don't set Content-Type; fetch will do it automatically
        requestBody = body;
      } else {
        headers['Content-Type'] = 'application/json';
        requestBody = JSON.stringify(body);
      }
    }

    const options: RequestInit = {
      method,
      headers,
      body: requestBody,
    };

    console.warn("Fetching from", `${this.WORKSPACE_BASE_URL}${path}`);
    console.warn("Headers:", headers);

    try {
      const response = await fetch(`${this.WORKSPACE_BASE_URL}${path}`, options);
      const text = await response.text();

      if (!response.ok) {
        throw new Error(`${response.status} - ${text}`);
      }

      return asJson ? JSON.parse(text) : (text as T);
    } catch (e) {
      console.error("Fetch error:", e);
      throw e;
    }
  }


  async listFiles(name: string): Promise<String> {
    if (this.WORKSPACE_BASE_URL) {
      // HTTP backend - fetch workspace contents
      // Example endpoint: GET /ws/:workspaceId
      const path = `/ws/${this.workspaceId}/${encodeURIComponent(name)}`;

      try {
        const data = await this.reqWorkspace<String>(path, 'GET', null);
        if (!data) throw new Error(`Contents for workspace ${this.workspaceId} not found`);
        return data;
      } catch (e) {
        throw new Error(`Failed to duh duh Node version: ${process.version}, typeof fetch: ${typeof fetch} read contents for workspace id ${this.workspaceId}: ${(e as Error).message} `);
      }
    } else {
      throw new Error('Backend not configured to read workspace contents');
    }
  }


  async readFile(name: string): Promise<String> {
    console.warn ('Debugging: this.WORKSPACE_BASE_URL:' + this.WORKSPACE_BASE_URL + ' path: '+`/ws/${this.workspaceId}/${encodeURIComponent(name)}`);

    if (this.WORKSPACE_BASE_URL) {
      // HTTP backend - fetch sequence file by name
      // Example endpoint: GET /ws/:workspaceId/:name
      const path = `/ws/${this.workspaceId}/${encodeURIComponent(name)}`;

      console.warn ('Attempting to query');

      try {
        const data = await this.reqWorkspace<String>(path, 'GET', '{}', false);
        if (!data) throw new Error(`File ${name} not found`);
        return data;
      } catch (e) {
        throw new Error(`Failed to read file '${name}': ${(e as Error).message}`);
      }
    } else {
      throw new Error('Backend not configured to read file');
    }
  }

  async writeFile(
    name: string,
    definition: string,
    overwrite: boolean
  ): Promise<any> {
    if (this.WORKSPACE_BASE_URL) {
      // Example: PUT /ws/:workspaceId/:name

      try {
        const formData = new FormData();
        formData.append("file", new Blob([definition]), name);
        const path = `/ws/${this.workspaceId}/${encodeURIComponent(name)}?type=file&overwrite=${overwrite}`;

        await this.reqWorkspace(
          path,
          'PUT',
          formData,
          false
        );        
        return { success: true };
      } catch (e) {
        throw new Error(`Failed to write file '${name}': ${(e as Error).message}`);
      }
    } else {
      throw new Error('No backend configured to write file');
    }
  }

  async copyFile(
    source: string,
    dest: string
  ): Promise<any> {
    if (this.WORKSPACE_BASE_URL) {
      try {
        const path = `/ws/${this.workspaceId}/${encodeURIComponent(source)}`;
        await this.reqWorkspace(
          path,
          'POST',
          {"copyTo": dest},
          false
        );
        return { success: true };
      } catch (e) {
        throw new Error(`Failed to copy file '${source}' to '${dest}': ${(e as Error).message}`);
      }
    } else {
      throw new Error('No backend configured to copy file');
    }
  }

  async createDirectory(
    name: string,
    overwrite: boolean
  ): Promise<any> {
    if (this.WORKSPACE_BASE_URL) {
      // Example: PUT /ws/:workspaceId/:name

      try {
        // const formData = new FormData();
        // formData.append("file", new Blob([definition]), name);
        const path = `/ws/${this.workspaceId}/${encodeURIComponent(name)}?type=directory&overwrite=${overwrite}`;

        await this.reqWorkspace(
          path,
          'PUT',
          '{}',
          false
        );
        return { success: true };
      } catch (e) {
        throw new Error(`Failed to create directory '${name}': ${(e as Error).message}`);
      }
    } else {
      throw new Error('No backend configured to create directory');
    }
  }


  // async listSequences(): Promise<SequenceListResult[]> {
  //   // List all sequences in the action's workspace
  //   const result = await queryListSequences(this.dbClient, this.workspaceId);
  //   return result.rows;
  // }

  async readChannelDictionary(id: number): Promise<ReadDictionaryResult> {
    const result = await queryReadChannelDictionary(this.dbClient!, id);
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
   * @returns The Command Dictionary with the given ID
   */
  async readCommandDictionary(id: number): Promise<ReadDictionaryResult> {
    const result = await queryReadCommandDictionary(this.dbClient!, id);
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
   * @returns The Parameter Dictionary with the given ID
   */
  async readParameterDictionary(id: number): Promise<ReadDictionaryResult> {
    const result = await queryReadParameterDictionary(this.dbClient!, id);
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
    return await readFile(
      `${filePath.replace(this.config.SEQUENCING_FILE_STORE, this.config.ACTION_FILE_STORE)}`,
      'utf-8',
    );
  }

  /**
   * Reads a Parcel for a given id.
   *
   * @param id - The id of the Parcel.
   * @returns The parcel detail, including ids for dictionaries it contains
   */
  async readParcel(id: number): Promise<ReadParcelResult> {
    const result = await queryReadParcel(this.dbClient!, id);
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
   * @returns The requested Sequence (including contents)
   */
  // async readSequence(name: string): Promise<ReadSequenceResult> {
  //   const result = await queryReadSequence(this.dbClient, name, this.workspaceId);
  //   const rows = result.rows;
  //
  //   if (!rows.length) {
  //     throw new Error(`Sequence ${name} does not exist`);
  //   }
  //   return rows[0];
  // }

  /**
   * Find a Sequence by name in the same Workspace as the Action, if it exists overwrite its definition otherwise
   * create it.
   *
   * @param name - The name of the Sequence.
   * @param definition - The new definition of the Sequence.
   * @param parcelId - The Parcel id of the sequence, @defaultValue `1`.
   * @returns The result of the attempt to write the sequence
   */
  // async writeSequence(name: string, definition: string, parcelId: number = 1): Promise<any> {
  //   // TODO: rethink whether or not parcelId can have a sane default value or should be required?
  //   return await queryWriteSequence(this.dbClient, name, this.workspaceId, definition, parcelId);
  // }
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
