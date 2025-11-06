type ActionValueSchemaMetadata = {
  metadata?: Record<string, any>;
  description?: string;
  required?: boolean;
  defaultValue?: any;
};

export type ActionValueSchemaBoolean = {
  type: 'boolean';
} & ActionValueSchemaMetadata;

export type ActionValueSchemaDuration = {
  type: 'duration';
} & ActionValueSchemaMetadata;

export type ActionValueSchemaInt = {
  type: 'int';
} & ActionValueSchemaMetadata;

export type ActionValueSchemaReal = {
  type: 'real';
} & ActionValueSchemaMetadata;

export type ActionValueSchemaSequence = {
  type: 'sequence';
} & ActionValueSchemaMetadata;

export type ActionValueSchemaSequenceList = {
  type: 'sequenceList';
} & ActionValueSchemaMetadata;

export type ActionValueSchemaFile = {
  type: 'file';
  pattern: string;
} & ActionValueSchemaMetadata

export type ActionValueSchemaFileList = {
  type: 'fileList';
  pattern: string;
} & ActionValueSchemaMetadata;

export type ActionValueSchemaSecret = {
  type: 'secret';
} & ActionValueSchemaMetadata;

export type ActionValueSchemaSeries = {
  items: ActionValueSchema;
  type: 'series';
} & ActionValueSchemaMetadata;

export type ActionValueSchemaString = {
  type: 'string';
} & ActionValueSchemaMetadata;

export type ActionValueSchemaStruct = {
  items: Record<string, ActionValueSchema>;
  type: 'struct';
} & ActionValueSchemaMetadata;

export type Variant = {
  key: string;
  label: string;
};

export type ActionValueSchemaVariant = {
  type: 'variant';
  variants: Variant[];
} & ActionValueSchemaMetadata;

export type ActionValueSchema =
  | ActionValueSchemaBoolean
  | ActionValueSchemaDuration
  | ActionValueSchemaFile
  | ActionValueSchemaFileList
  | ActionValueSchemaInt
  | ActionValueSchemaReal
  | ActionValueSchemaSequence
  | ActionValueSchemaSequenceList
  | ActionValueSchemaSecret
  | ActionValueSchemaSeries
  | ActionValueSchemaString
  | ActionValueSchemaStruct
  | ActionValueSchemaVariant;

export type ActionParameterDefinitions = Record<string, ActionValueSchema>;
export type ActionSettingDefinitions = Record<string, ActionValueSchema>;

// InferSchemaType is a type that resolves to the underlying value type
// given an ActionValueSchema as a generic
type InferSchemaType<T extends ActionValueSchema> = T extends ActionValueSchemaBoolean
  ? boolean
  : T extends ActionValueSchemaString
    ? string
    : T extends ActionValueSchemaDuration
      ? string // ???
      : T extends ActionValueSchemaInt
        ? number
        : T extends ActionValueSchemaReal
          ? number // do we need this ???
          : T extends ActionValueSchemaSequence
            ? string
            : T extends ActionValueSchemaSequenceList
              ? string[]
              : T extends ActionValueSchemaFile
                ? string
                : T extends ActionValueSchemaFileList
                  ? string[]
                  : T extends ActionValueSchemaSeries
                    ? any[] // how to type???
                    : T extends ActionValueSchemaStruct
                      ? object
                      : T extends ActionValueSchemaVariant
                        ? Variant // ???
                        : never;

// the type of the user's parameters/settings object
export type ActionParameters<T extends ActionParameterDefinitions> = {
  [K in keyof T]: InferSchemaType<T[K]>;
};
export type ActionSettings<T extends ActionParameterDefinitions> = ActionParameters<T>;

export type ActionParameterDefinition = {
  name: string;
  schema: ActionValueSchema;
};
