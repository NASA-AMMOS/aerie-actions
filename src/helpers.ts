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
    return await this.pool.query(`
      SELECT name, id FROM user_sequence WHERE workspace_id = $1;
    `, [this.workspaceId]);
  }
  async readSequence(path: string): Promise<string> {
    console.warn(`Read file ${path} - Not yet implemented`);
    return "not implemented";
  }
  async writeSequence(path: string, contents: string): Promise<void> {
    console.warn(`Write "${contents.slice(0, 50)}..." to ${path} - Not yet implemented`);
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

