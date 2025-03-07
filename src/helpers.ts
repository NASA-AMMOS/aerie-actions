import {Pool} from "pg";

export class Actions {
  pool: Pool;
  workspaceId: number;

  constructor(pool: Pool, workspaceId: number) {
    this.pool = pool;
    this.workspaceId = workspaceId;
  }

  async listSequences(): Promise<any> {
    console.warn(`List files - Not yet implemented`);
    const result = await this.pool.query(`
      select name, id, created_at, owner, parcel_id, updated_at, workspace_id 
        from sequencing.user_sequence
        where workspace_id = $1;
    `, [this.workspaceId]);
    const rows = result.rows;
    return rows;
  }
  async readSequence(name: string): Promise<any> {
    const result = await this.pool.query(`
      select definition, seq_json, name, id, created_at, owner, parcel_id, updated_at, workspace_id
      from sequencing.user_sequence
        where name = $1 
          and workspace_id = $2;
    `, [name, this.workspaceId]);
    const rows = result.rows;
    if(!rows.length) { throw new Error(`Sequence ${name} does not exist`)}
    return rows[0];
  }
  async writeSequence(name: string, definition: string): Promise<any> {
    console.warn(`Write "${definition.slice(0, 50)}..." to ${name} - Not yet implemented`);
    const result = await this.pool.query(`
      WITH updated AS (
        UPDATE sequencing.user_sequence
        SET definition = $3
        WHERE name = $1 AND workspace_id = $2
        RETURNING *
      )
      INSERT INTO sequencing.user_sequence (name, workspace_id, definition, parcel_id)
      SELECT $1, $2, $3, $4
      WHERE NOT EXISTS (SELECT 1 FROM updated);
    `, [name, this.workspaceId, definition, 1]);

    return result;
  }
}

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

// API for reading/writing sequences (& other files?) in workspace

export async function listSequences(): Promise<string[]> {
  console.warn(`List files - Not yet implemented`);
  return ["not implemented"];
}
export async function readSequence(path: string): Promise<string> {
  console.warn(`Read file ${path} - Not yet implemented`);
  return "not implemented";
}
export async function writeSequence(path: string, contents: string): Promise<void> {
  console.warn(`Write "${contents.slice(0, 50)}..." to ${path} - Not yet implemented`);
}

