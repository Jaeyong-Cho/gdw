# WorkState Recording Format

This document defines the format for recording WorkState facts.

## Format Specification

### Basic Structure

WorkState is a collection of fact records. Each fact record has the following structure:

```
FACT_ID: boolean
```

Where:
- `FACT_ID` is the identifier from `workstate-schema.md` (e.g., `DOC_INTENT_EXISTS`)
- `boolean` is either `true` or `false`

### File Format

WorkState can be stored in multiple formats. The primary format is JSON for programmatic access, with optional human-readable formats.

#### JSON Format

```json
{
  "workstate": {
    "FACT_ID": boolean,
    "FACT_ID": boolean,
    ...
  },
  "metadata": {
    "created_at": "ISO8601_timestamp",
    "updated_at": "ISO8601_timestamp",
    "version": "1.0"
  }
}
```

#### Example

```json
{
  "workstate": {
    "DOC_INTENT_EXISTS": true,
    "CLARITY_INTENT_CLEAR": true,
    "REVIEW_INTENT_CONFIRMED": false,
    "SCOPE_INTENT_BOUNDED": true,
    "DOC_PROBLEM_STATEMENT_EXISTS": false
  },
  "metadata": {
    "created_at": "2026-01-28T10:00:00Z",
    "updated_at": "2026-01-28T10:15:00Z",
    "version": "1.0"
  }
}
```

### Recording Rules

1. **All facts are optional**: A WorkState does not need to contain all fact items. Only record facts that are known.

2. **Unknown facts are omitted**: If a fact is unknown or not applicable, do not include it in the WorkState. Do not use `null` or `undefined`.

3. **Facts are independent**: Each fact is recorded independently. The truth value of one fact does not automatically imply the truth value of another.

4. **Facts are immutable once recorded**: When a fact changes, update the timestamp in metadata. Do not delete old facts; record the new state.

5. **Minimal recording**: Only record facts that are relevant to determining the current situation. Do not record redundant or derived facts.

### Creating an Empty WorkState

An empty WorkState is valid and represents a state where no facts are known:

```json
{
  "workstate": {},
  "metadata": {
    "created_at": "2026-01-28T10:00:00Z",
    "updated_at": "2026-01-28T10:00:00Z",
    "version": "1.0"
  }
}
```

### Updating WorkState

When updating WorkState:

1. Add new facts or update existing facts
2. Update `updated_at` timestamp
3. Keep `created_at` unchanged
4. Maintain all existing facts unless they have changed

### Validation

A valid WorkState must:
- Have a `workstate` object (can be empty)
- Have a `metadata` object with `created_at`, `updated_at`, and `version`
- All fact values must be boolean (`true` or `false`)
- All fact IDs must exist in `workstate-schema.md`

### Human-Readable Format (Optional)

For manual editing or review, a simpler format can be used:

```
# WorkState
# Created: 2026-01-28T10:00:00Z
# Updated: 2026-01-28T10:15:00Z

DOC_INTENT_EXISTS: true
CLARITY_INTENT_CLEAR: true
REVIEW_INTENT_CONFIRMED: false
SCOPE_INTENT_BOUNDED: true
```

This format can be converted to/from JSON format.
