# Development Workflow Tracker

A tool for tracking and visualizing your current position in the software development workflow.

## Core Principles

- **No automatic judgment**: The system does not make decisions
- **Manual situation selection**: Users explicitly select their current situation
- **Fact-based tracking**: All decisions must be based on recorded facts
- **Explicit reasoning**: Every situation selection requires documented rationale

## Architecture

### Components

1. **WorkState**: Records factual information about the current work state
2. **SituationList**: Defines all possible development situations
3. **SituationSelection**: User-selected current situation (or Undetermined)
4. **DecisionRecord**: Documents why a situation was selected, referencing WorkState facts

### Data Flow

```
WorkState → SituationSelection
SituationList → SituationSelection
SituationSelection → DecisionRecord
DecisionRecord → SituationSelection
```

## Project Structure

### Core Definitions

- `situations.md`: Complete list of development situations extracted from the workflow diagram
- `situation-checklist.md`: Intuitive, actionable guidance for each situation (what to do, conditions to proceed, failure signs, tips)
- `workstate-schema.md`: Complete list of all WorkState fact items (deduplicated from checklists)
- `workstate-format.md`: Format specification for recording WorkState facts (JSON format)

### Rules and Schemas

- `rules.md`: Rules for SituationSelection (single selection, manual selection, no automatic changes)
- `decision-record-schema.md`: Schema and required conditions for DecisionRecord
- `undetermined-definition.md`: Explicit definition of the Undetermined state

### Examples and Scenarios

- `scenarios.md`: Complete workflow examples demonstrating WorkState → Selection → DecisionRecord flow

## Quick Start

1. **Review situations**: Read `situations.md` to understand available situations
2. **Record WorkState**: Use `workstate-schema.md` and `workstate-format.md` to record facts
3. **Review situation guide**: Review `situation-checklist.md` for actionable guidance on what to do, conditions to proceed, and tips for each situation
4. **Select situation**: Manually select a situation based on WorkState facts (see `rules.md`)
5. **Record decision**: Create a DecisionRecord documenting your selection (see `decision-record-schema.md`)

## Key Concepts

### WorkState

WorkState is a collection of boolean facts about the current work. Facts are recorded as `FACT_ID: true/false`. Only record facts that are known - omit unknown facts.

### Situation Selection

Situation selection is always manual. Compare your WorkState facts against situation checklists, then explicitly select the matching situation (or `Undetermined` if none match).

### DecisionRecord

Every situation selection (except when keeping the same situation) should have a DecisionRecord explaining:
- Which WorkState facts were used
- Why this situation was selected
- Which checklist items are satisfied

### Undetermined

`Undetermined` is a valid, normal state indicating the current situation is ambiguous or unclear. It's the default when no situation is selected.

## Next Steps

This foundation provides the structure for building a tool that:
- Visualizes current situation on the workflow graph
- Guides users through situation selection
- Tracks WorkState changes over time
- Provides context-aware guidance for each situation

See `scenarios.md` for complete examples of the workflow in action.
