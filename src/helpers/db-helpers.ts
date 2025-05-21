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

export function queryReadParcel(dbClient: PoolClient, id: number): Promise<QueryResult<ReadParcelResult>> {
  return dbClient.query(
    `
      select name, id, command_dictionary_id, channel_dictionary_id, sequence_adaptation_id, created_at, owner, updated_at, updated_by
      from sequencing.parcel
        where id = $1;
    `,
    [id],
  );
}
