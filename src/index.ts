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

// Main API class used by the user's action
export class ActionsAPI {
  config: ActionsConfig;
  dbClient?: PoolClient;
  user: User | null;
  workspaceId: number;

  ACTION_FILE_STORE: string;
  SEQUENCING_FILE_STORE: string;
  WORKSPACE_BASE_URL: string;

  static ENVIRONMENT_VARIABLE_PREFIX = 'PUBLIC_ACTION_';

  /**
   *
   * @param dbClient - A client that is part of our connection pool.
   * @param workspaceId - The id of the Workspace the Action is associated with.
   * @param config - A config containing an `ACTION_FILE_STORE`, `SEQUENCING_FILE_STORE`, and `WORKSPACE_BASE_URL`
   * so the action can read files.
   * @param user - A User object for future use in authorization.
   */
  constructor(dbClient: PoolClient, workspaceId: number, config: ActionsConfig, user: User | null) {
    this.dbClient = dbClient;
    this.workspaceId = workspaceId;
    this.user = user;

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

  /**
   * A helper method to perform GET, PUT, and POST methods on the workspace endpoint.
   * @param path - URL path to be queried
   * @param method - URL method to be used (GET, PUT, POST)
   * @param body - Request body, if needed.
   * @param asJson - Whether the response is expected to be formatted as JSON. Defaults to true.
   * @private
   */
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

    // TODO: These will need to be populated in the future once action auth is supported
    const headers: HeadersInit = {
      Authorization: `Bearer ${this.user.token ?? 'TODO'}`,
      'x-hasura-role': this.user.activeRole ?? 'TODO',
      'x-hasura-user-id': this.user.id ?? 'TODO',
    };

    const methodsWithBody = ['POST', 'PUT'];
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


  /**
   * List files in the workspace at the given path.
   * @param path - The path of the given workspace context to query
   */
  async listFiles(path: string): Promise<String> {
    if (this.WORKSPACE_BASE_URL) {
      // HTTP backend - fetch workspace contents
      // Example endpoint: GET /ws/:workspaceId
      const fullPath = `/ws/${this.workspaceId}/${encodeURIComponent(path)}`;

      try {
        const data = await this.reqWorkspace<String>(fullPath, 'GET', null, false);
        if (!data) throw new Error(`Contents for workspace ${this.workspaceId} not found`);
        return data;
      } catch (e) {
        throw new Error(`Failed to read contents for workspace id ${this.workspaceId}: ${(e as Error).message} `);
      }
    } else {
      throw new Error('Backend not configured to read workspace contents');
    }
  }

  /**
   * Read a single file's contents in the given workspace.
   * @param path - The path of the given workspace context to query
   */
  async readFile(path: string): Promise<String> {

    if (this.WORKSPACE_BASE_URL) {
      // HTTP backend - fetch sequence file by name
      // Example endpoint: GET /ws/:workspaceId/:name
      const fullPath = `/ws/${this.workspaceId}/${encodeURIComponent(path)}`;

      try {
        const data = await this.reqWorkspace<String>(fullPath, 'GET', '{}', false);
        if (!data) throw new Error(`File ${path} not found`);
        return data;
      } catch (e) {
        throw new Error(`Failed to read file '${path}': ${(e as Error).message}`);
      }
    } else {
      throw new Error('Backend not configured to read file');
    }
  }

  /**
   * Write a file with the given name and definition to the workspace filesystem.
   * @param name - Full path of the file from the workspace root. This functions like mkdir -p; if parent folders
   * do not exist, they will be created.
   * @param definition - The contents of the file to be written.
   * @param overwrite - If the file already exists, overwrite its contents.
   */
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

  /**
   * Copy a file within the workspace to a new location.
   * @param source - Source path of the file
   * @param dest - Destination path of the file.
   */
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

  /**
   * Create a new directory in the given workspace filesystem.
   * @param name - Name/path of the new directory.  This functions like mkdir -p; if parent folders
   * do not exist, they will be created.
   * @param overwrite - If the directory already exists, overwrite it.
   */
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
