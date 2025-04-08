type ActionValueSchemaMetadata = {
  metadata?: Record<string, any>;
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

export type ActionValueSchemaPath = {
  type: 'path';
  pattern: string;
} & ActionValueSchemaMetadata;

export type ActionValueSchemaSequence = {
  type: 'sequence';
} & ActionValueSchemaMetadata;
export type ActionValueSchemaSequenceList = {
  type: 'sequenceList';
} & ActionValueSchemaMetadata;

export type ActionValueSchemaSeries = {
  items: ActionValueSchema;
  type: 'series';
} & ActionValueSchemaMetadata;

export type ActionValueSchemaString = {
  type: 'string';
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
  | ActionValueSchemaInt
  | ActionValueSchemaPath
  | ActionValueSchemaReal
  | ActionValueSchemaSequence
  | ActionValueSchemaSequenceList
  | ActionValueSchemaSeries
  | ActionValueSchemaString
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
      : T extends ActionValueSchemaPath
        ? string
        : T extends ActionValueSchemaInt
          ? number
          : T extends ActionValueSchemaReal
            ? number // do we need this ???
            : T extends ActionValueSchemaSequence
              ? string
              : T extends ActionValueSchemaSequenceList
                ? string[]
                : T extends ActionValueSchemaSeries
                  ? any[] // how to type???
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
