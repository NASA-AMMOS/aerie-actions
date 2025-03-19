export const listSequencesQuery = `
  select name, id, workspace_id, parcel_id, owner, created_at, updated_at 
    from sequencing.user_sequence
    where workspace_id = $1;
`;

export type SequenceListResult = {
    name: string;
    id: number;
    workspace_id: number;
    // parcel
    created_at: string;
}