import { PoolClient } from 'pg';

export class ActionsAPI {
  dbClient: PoolClient;
  workspaceId: number;

  constructor(dbClient: PoolClient, workspaceId: number) {
    this.dbClient = dbClient;
    this.workspaceId = workspaceId;
  }

  async listSequences(): Promise<any> {
    // List all sequences in the action's workspace
    const result = await this.dbClient.query(
      `
      select name, id, workspace_id, parcel_id, owner, created_at, updated_at 
        from sequencing.user_sequence
        where workspace_id = $1;
    `,
      [this.workspaceId],
    );
    const rows = result.rows;
    return rows;
  }
  async readSequence(name: string): Promise<any> {
    // Find a single sequence in the workspace by name, and read its contents
    const result = await this.dbClient.query(
      `
      select definition, seq_json, name, id, created_at, owner, parcel_id, updated_at, workspace_id
      from sequencing.user_sequence
        where name = $1 
          and workspace_id = $2;
    `,
      [name, this.workspaceId],
    );
    const rows = result.rows;
    if (!rows.length) {
      throw new Error(`Sequence ${name} does not exist`);
    }
    return rows[0];
  }
  async writeSequence(name: string, definition: string): Promise<any> {
    // find a sequence by name, in the same workspace as the action
    // if it exists, overwrite its definition; else create it
    const result = await this.dbClient.query(
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
      [name, this.workspaceId, definition, 1],
    );

    return result;
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
