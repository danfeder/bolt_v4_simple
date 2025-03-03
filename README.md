# Gym Class Rotation Scheduler

A lean, user-friendly scheduling tool designed to generate optimized gym class schedules for 33 classes rotating through a single gym classroom with one teacher.

## Project Overview

This application uses a simplified self-adapting genetic algorithm to generate weekly schedules that respect both hard and soft constraints. The MVP is built as a frontend-only application using React and TypeScript, with browser storage for persistence.

### Core Features

- **Constraint-based Scheduling**: Define hard constraints (must be satisfied) and soft constraints (preferences).
- **Genetic Algorithm Engine**: Generate optimized schedules that balance teacher workload.
- **Intuitive UI**: Form-based constraint input and weekly calendar view with drag-and-drop adjustments.
- **File Management**: Import/export class conflict data via CSV/JSON.

## Getting Started

### Prerequisites

- Node.js (v16+)
- npm (v8+)

### Installation

```bash
# Clone the repository
git clone https://github.com/danfeder/bolt_v4_simple.git
cd bolt_v3_simple

# Install dependencies
npm install

# Start the development server
npm run dev
```

## Project Structure

```
bolt_v3_simple/
├── src/
│   ├── components/  # UI components
│   ├── engine/      # Genetic algorithm scheduler
│   ├── hooks/       # Custom React hooks
│   ├── models/      # Data structure definitions
│   ├── utils/       # Helper functions
│   ├── App.tsx      # Main application component
│   └── main.tsx     # Entry point
├── public/          # Static assets
├── package.json     # Project dependencies and scripts
└── README.md        # Project documentation
```

## Development Roadmap

The project is being developed in 8 phases:

1. **Setup and Requirements Finalization** (Current Phase)
2. **Core Scheduling Engine Development**
3. **GUI and Constraint Input Module**
4. **Manual Adjustment Features**
5. **File Management**
6. **Schedule Export and Persistence**
7. **Testing and Validation**
8. **Finalization and Documentation**

## License

ISC

## Acknowledgements

- This project is built with React, TypeScript, and MUI
- Genetic algorithm implementation inspired by modern optimization techniques
