export interface Config {
  ACTION_FILE_STORE: string;
  SEQUENCING_FILE_STORE: string;
}

export const configuration = (): Config => {
  const { env } = process;

  return {
    ACTION_FILE_STORE: env.ACTION_FILE_STORE ?? 'action_file_store',
    SEQUENCING_FILE_STORE: env.SEQUENCING_FILE_STORE ?? 'sequencing_file_store',
  };
};
