import { PoolClient, QueryResult } from 'pg';
import { ReadParcelResult } from '../types/db-types';

export function dictionaryQuery(
  tableName: 'channel_dictionary' | 'command_dictionary' | 'parameter_dictionary',
): string {
  return `
    select id, dictionary_path, dictionary_file_path, mission, version, parsed_json, created_at, updated_at
    from sequencing.${tableName}
      where id = $1;
  `;
}

export function queryReadParcel(dbClient: PoolClient, workspaceId: number): Promise<QueryResult<ReadParcelResult>> {
  return dbClient.query(
    `
      select 
        p.name, 
        p.id, 
        p.command_dictionary_id, 
        p.channel_dictionary_id, 
        p.sequence_adaptation_id, 
        p.created_at, 
        p.owner, 
        p.updated_at, 
        p.updated_by
      from sequencing.parcel p
      where p.id = (
        select parcel_id
        from sequencing.workspace
        where id = $1
      );
    `,
    [workspaceId],
  );
}

