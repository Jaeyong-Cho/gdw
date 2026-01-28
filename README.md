# Development Workflow Tracker

A tool for tracking and visualizing your current position in the software development workflow.

## Features

- **Interactive State Diagram**: Visualize the complete development workflow as an interactive graph
- **Situation Highlighting**: See your current situation highlighted on the graph
- **Situation Information**: View detailed information and required facts for each situation
- **Manual Selection**: Select your current situation manually (no automatic judgment)

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

```
gdw/
├── ui/                    # React UI application
│   ├── src/              # Source code
│   │   ├── components/   # React components
│   │   ├── data/         # Data definitions
│   │   ├── types.ts      # TypeScript types
│   │   ├── App.tsx       # Main app component
│   │   └── main.tsx      # Entry point
│   ├── package.json      # UI dependencies
│   └── README.md         # UI-specific documentation
└── docs/                 # Documentation
    ├── situations.md
    ├── situation-checklist.md
    ├── workstate-schema.md
    ├── workstate-format.md
    ├── rules.md
    ├── decision-record-schema.md
    ├── undetermined-definition.md
    └── scenarios.md
```

## Getting Started

### UI Application

The UI is located in the `ui/` directory. To run it:

```bash
cd ui
npm install
npm run dev
```

The application will be available at `http://localhost:5173`

For more details, see [ui/README.md](ui/README.md)

### Usage

1. **View the Graph**: The workflow state diagram is displayed on the left side
2. **Select a Situation**: Click on any node in the graph to select it
3. **View Details**: The right panel shows information about the selected situation, including:
   - Situation description
   - Required facts checklist
4. **Navigate**: Use the graph controls (zoom, pan, minimap) to explore the workflow

## Documentation

All documentation is in the `docs/` directory:

- `docs/situations.md`: Complete list of development situations
- `docs/situation-checklist.md`: Intuitive, actionable guidance for each situation (what to do, conditions to proceed, failure signs, tips)
- `docs/workstate-schema.md`: Complete list of all WorkState fact items
- `docs/workstate-format.md`: Format specification for recording WorkState facts
- `docs/rules.md`: Rules for SituationSelection
- `docs/decision-record-schema.md`: Schema and required conditions for DecisionRecord
- `docs/undetermined-definition.md`: Explicit definition of the Undetermined state
- `docs/scenarios.md`: Complete workflow examples

## Technologies

- **React 18**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool and dev server
- **react-flow**: Interactive graph visualization (MIT license)

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

This foundation provides the structure for building a complete tool that:
- Visualizes current situation on the workflow graph ✅
- Guides users through situation selection ✅
- Tracks WorkState changes over time (future)
- Provides context-aware guidance for each situation (future)
- Stores and manages WorkState and DecisionRecords (future)

See `docs/scenarios.md` for complete examples of the workflow in action.
