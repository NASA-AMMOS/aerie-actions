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
import { ActionsConfig } from './types';
export * from './types';


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
  dbClient: PoolClient;
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
   */
  constructor(dbClient: PoolClient, workspaceId: number, config: ActionsConfig) {
    this.dbClient = dbClient;
    this.workspaceId = workspaceId;
    this.config = config;

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
   * @private
   */
  private async reqWorkspace(
    path: string,
    method: string,
    body: any | null = null,
  ): Promise<string> {
    if (!this.WORKSPACE_BASE_URL) {
      throw new Error('WORKSPACE_BASE_URL not configured');
    }

    const headers: HeadersInit = {};
    const methodsWithBody = ['POST', 'PUT'];
    let requestBody: BodyInit | undefined = undefined;

    if (body !== null && methodsWithBody.includes(method.toUpperCase())) {
      if (body instanceof FormData) {
        // Let fetch set Content-Type
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

    const response = await fetch(`${this.WORKSPACE_BASE_URL}${path}`, options);
    const text = await response.text();

    if (!response.ok) {
      throw new Error(`${response.status} - ${text}`);
    }

    return text;
  }


  /**
   * List files in the workspace at the given path.
   * @param path - The path of the given workspace context to query
   */
  async listFiles(path: string): Promise<String> {
    // HTTP backend - fetch workspace contents
    // Example endpoint: GET /ws/:workspaceId
    const fullPath = `/ws/${this.workspaceId}/${encodeURIComponent(path)}`;
    const data = await this.reqWorkspace(fullPath, 'GET', null);
    if (!data) throw new Error(`Contents for workspace ${this.workspaceId} not found`);
    return data;
  }

  /**
   * Read a single file's contents in the given workspace.
   * @param path - The path of the given workspace context to query
   */
  async readFile(path: string): Promise<String> {
    // HTTP backend - fetch sequence file by name
    // Example endpoint: GET /ws/:workspaceId/:name
    const fullPath = `/ws/${this.workspaceId}/${encodeURIComponent(path)}`;
    const data = await this.reqWorkspace(fullPath, 'GET', '{}');
    if (!data) throw new Error(`File ${path} not found`);
    return data;
  }

  /**
   * Write a file with the given name and definition to the workspace filesystem.
   * @param name - Full path of the file from the workspace root. This functions like mkdir -p; if parent folders
   * do not exist, they will be created.
   * @param contents - The contents of the file to be written.
   * @param overwrite - If the file already exists, overwrite its contents.
   */
  async writeFile(
    name: string,
    contents: string,
    overwrite: boolean = false
  ): Promise<any> {
    // Example: PUT /ws/:workspaceId/:name
    // Strip path, keep only the file name
    const filenameOnly = name.split(/[/\\]/).pop()!;

    const formData = new FormData();
    formData.append("file", new Blob([contents]), filenameOnly);
    const path = `/ws/${this.workspaceId}/${encodeURIComponent(name)}?type=file&overwrite=${overwrite}`;
    await this.reqWorkspace(
      path,
      'PUT',
      formData
    );
    return { success: true };
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
    const sourcePath = `/ws/${this.workspaceId}/${encodeURIComponent(source)}`;
    await this.reqWorkspace(
      sourcePath,
      'POST',
      {"copyTo": dest}
    );
    return { success: true };
  }

  /**
   * Move a file within the workspace to a new location.
   * @param source - Source path of the file
   * @param dest - Destination path of the file.
   */
  async moveFile(
    source: string,
    dest: string
  ): Promise<any> {
    const sourcePath = `/ws/${this.workspaceId}/${encodeURIComponent(source)}`;
    await this.reqWorkspace(
      sourcePath,
      'POST',
      {"moveTo": dest}
    );
    return { success: true };
  }

  /**
   * Delete a file or directory within the workspace to a new location.
   * @param source - Source path of the file or directory.
   */
  async deleteFile(
    source: string
  ): Promise<any> {
    const sourcePath = `/ws/${this.workspaceId}/${encodeURIComponent(source)}`;
    await this.reqWorkspace(
      sourcePath,
      'DELETE',
      {}
    );
    return { success: true };
  }



  /**
   * Create a new directory in the given workspace filesystem.
   * @param name - Name/path of the new directory.  This functions like mkdir -p; if parent folders
   * do not exist, they will be created. If a directory already exists, it will be skipped.
   */
  async createDirectory(
    name: string
  ): Promise<any> {
    // Example: PUT /ws/:workspaceId/:name
    const path = `/ws/${this.workspaceId}/${encodeURIComponent(name)}?type=directory`;
    await this.reqWorkspace(
      path,
      'PUT',
      '{}'
    );
    return { success: true };
  }

  /**
   * Create a new set of directories in the given workspace filesystem. Alias for createDirectory.
   * @param name - Name/path of the new directory.  This functions like mkdir -p; if parent folders
   * do not exist, they will be created. If a directory already exists, it will be skipped.
   */
  async createDirectories(
    name: string
  ): Promise<any> {
    await this.createDirectory(name);
  }


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
   * @returns The Command Dictionary with the given ID
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
   * @returns The Parameter Dictionary with the given ID
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
