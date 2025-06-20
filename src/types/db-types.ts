export type ReadDictionaryResult = {
  id: number;
  dictionary_path: string;
  dictionary_file_path: string;
  mission: string;
  version: number;
  parsed_json: any;
  created_at: string;
  updated_at: string;
};

export type ReadParcelResult = {
  id: number;
  name: string;
  command_dictionary_id: number;
  channel_dictionary_id: number;
  sequence_adaptation_id: number;
  created_at: string;
  owner?: string;
  updated_at: string;
  updated_by: string;
};

export type ReadSequenceListResult = {
  name: string;
  id: number;
  workspace_id: number;
  parcel_id: number;
  owner?: string;
  created_at: string;
  updated_at: string;
};

export type ReadSequenceResult = {
  name: string;
  id: number;
  workspace_id: number;
  parcel_id: number;
  definition: string;
  seq_json?: string;
  owner?: string;
  created_at: string;
  updated_at: string;
};

export type WriteSequenceResult = {};
