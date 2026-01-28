# Development Workflow Tracker UI

UI application for tracking and visualizing your current position in the software development workflow.

## Features

- **Interactive State Diagram**: Visualize the complete development workflow as an interactive graph
- **Situation Highlighting**: See your current situation highlighted on the graph
- **Situation Information**: View detailed information and required facts for each situation
- **Manual Selection**: Select your current situation manually (no automatic judgment)

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Usage

1. **View the Graph**: The workflow state diagram is displayed on the left side
2. **Select a Situation**: Click on any node in the graph to select it
3. **View Details**: The right panel shows information about the selected situation, including:
   - Situation description
   - Required facts checklist
4. **Navigate**: Use the graph controls (zoom, pan, minimap) to explore the workflow

## Project Structure

- `src/components/`: React components
  - `WorkflowGraph.tsx`: Main graph visualization using react-flow
  - `CustomNode.tsx`: Custom node component for workflow states
  - `SituationInfoPanel.tsx`: Information panel for selected situation
- `src/data/`: Data definitions
  - `situations.ts`: Situation definitions, node positions, and transitions
- `src/types.ts`: TypeScript type definitions
- `src/App.tsx`: Main application component
- `src/main.tsx`: Application entry point

## Technologies

- **React 18**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool and dev server
- **react-flow**: Interactive graph visualization (MIT license)
