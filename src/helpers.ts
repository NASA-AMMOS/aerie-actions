export async function createSequence(): Promise<void> {}
export async function getSequence(id: string): Promise<void> {}
// TODO: Workspace ID might be provided in the VM like our authToken?
export async function listSequences(workspaceId: string): Promise<void> {}
export async function updateSequence(): Promise<void> {}

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

export async function listFiles(): Promise<string[]> {
  console.warn(`List files - Not yet implemented`);
  return ["not implemented"];
}
export async function readFile(path: string): Promise<string> {
  console.warn(`Read file ${path} - Not yet implemented`);
  return "not implemented";
}
export async function writeFile(path: string, contents: string): Promise<void> {
  console.warn(`Write "${contents.slice(0, 50)}..." to ${path} - Not yet implemented`);
}

