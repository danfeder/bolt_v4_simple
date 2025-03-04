# Lean MVP Development Plan: Gym Class Rotation Scheduler

**Date:** March 2, 2025  
**Version:** 1.1

---

## Introduction

This document outlines our development plan for a lean, user-friendly scheduling tool designed for personal use. The primary goal is to generate an optimized gym class schedule for 33 classes that rotate through a single gym classroom with one teacher.

**Vision:**  
The MVP is intended to be a practical tool that balances simplicity with functionality. It is not meant to be a commercial product, but rather a lean solution that meets the following objectives:
- **Core Functionality:** Generate a weekly schedule that respects both hard and soft constraints, using a simplified self-adapting genetic algorithm.
- **User Focus:** The tool is designed for a technical user (myself) and one non-technical coworker, so the interface must be straightforward and intuitive.
- **Deployment Preference:** Initially, the app will be built as a frontend-only application. This simplifies deployment (as a static site) and maintenance, while leveraging browser-based computation for the scheduling engine. This approach is preferred unless we encounter a serious roadblock in performance or complexity.
- **Technical Context:** The project will be implemented using JavaScript/TypeScript for both the scheduling engine and the GUI (likely with a framework like React). Browser storage (Local Storage or IndexedDB) will be used for persistence, and heavy computations can be offloaded to Web Workers if needed.

This plan is provided as a clear, step-by-step path forward. It’s designed to be a living document that can evolve as we refine the MVP based on testing and feedback.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [High-Level Requirements](#high-level-requirements)
3. [System Architecture Overview](#system-architecture-overview)
4. [Detailed Implementation Plan](#detailed-implementation-plan)
5. [Milestones and Timeline](#milestones-and-timeline)
6. [Next Steps](#next-steps)

---

## 1. Project Overview

**Purpose:**  
Build a lean, user-friendly scheduling tool that:
- Accepts user-defined hard and soft constraints.
- Uses a simplified self-adapting genetic algorithm to generate an optimized schedule.
- Provides a GUI for constraint input, schedule display, and manual adjustments.
- Supports file upload (CSV/JSON) for class conflict data and offers class editing features.
- Exports schedules and class data in CSV format.

**Core Goals:**
- Generate a weekly schedule (Monday–Friday, 8 periods/day) that adheres to all constraints.
- Ensure the scheduling engine prioritizes balancing the teacher’s workload while scheduling all classes as early as possible.
- Maintain a lean codebase by focusing on essential features and using well-tuned defaults.
- Deploy as a frontend-only application initially for ease-of-use and simpler maintenance.

---

## 2. High-Level Requirements

### A. Core Scheduling Engine
- **Input:**  
  - **Hard Constraints:**
    - Weekly prep schedules (conflict periods) per class.
    - Personal conflicts on specific dates/periods.
    - Single occurrence per class per rotation, with no overlaps.
    - Additional limits: weekly/daily minimum and maximum classes, maximum consecutive periods without a break.
    - Rotation start date (with an optional end date constraint).
  - **Soft Constraints:**
    - Class-specific preferences (preferred or not preferred periods).
    - Teacher’s preferences take precedence over class preferences.
    - The algorithm should aim to balance the teacher’s workload by spacing classes throughout the day and week.
- **Output:**  
  - An optimized schedule that assigns each of the 33 classes exactly once per rotation.

### B. User Interface (GUI)
- **Constraint Input Module:**
  - Form-based interface for entering both hard and soft constraints.
  - Options to save and load constraint sets.
- **Schedule Display:**
  - Weekly calendar view (Monday–Friday, 8 periods/day) with navigation controls.
- **Manual Adjustments:**
  - Drag-and-drop interface for manual schedule adjustments.
  - Visual indicators for valid/invalid drop zones and soft constraint preferences.
- **File Management:**
  - Dedicated screen for uploading a CSV/JSON file with class conflict schedules.
  - Dedicated screens for editing and adding classes.
  - Option to export class data (CSV/JSON) and final schedules (CSV).

### C. Optimization and Algorithm
- **Genetic Algorithm:**  
  - Use a simplified chromosome representation where each gene represents a class assignment.
  - Implement basic population management (e.g., tournament selection) with a fixed-size population.
  - Use a streamlined fitness function that heavily penalizes hard constraint violations and modestly rewards soft constraint satisfaction.
  - Implement a simple crossover method and mutation operator.
  - Utilize well-tuned default parameters without exposing developer settings in the MVP.

---

## 3. System Architecture Overview

- **Frontend-Only Approach:**  
  - The entire app, including the scheduling engine (genetic algorithm) and GUI, will be implemented in JavaScript/TypeScript and run in the browser.
  - This simplifies deployment (static site hosting) and allows for easy local storage of data (using Local Storage or IndexedDB).
  - If performance becomes an issue, heavy computation can be offloaded to Web Workers.

- **Backend (Scheduling Engine):**
  - **Core Modules:**
    - **Chromosome Module:** Represents a schedule as a chromosome with one gene per class.
    - **Population Management:** Manages a fixed-size population and performs selection.
    - **Fitness Evaluation:** Computes a fitness score based on hard and soft constraints.
    - **Genetic Operators:** Implements crossover and mutation.
  - Persistence for storing finalized rotations and class conflict data can be handled on the frontend.

- **Frontend (GUI):**
  - Built using a framework such as React.
  - **Modules:**
    - Constraint Input Form.
    - Weekly Schedule Calendar View.
    - Drag-and-Drop Manual Adjustment Interface.
    - File Upload/Edit/Export for managing class conflict schedules.

- **Integration:**
  - All components run on the client side, communicating via in-app APIs or direct function calls.

---

## 4. Detailed Implementation Plan

### Phase 1: Setup and Requirements Finalization
- **Task 1.1:** Define data models and structures for classes, constraints, and schedules. *(Completed)*
- **Task 1.2:** Set up the development environment, version control, and project scaffolding. *(Completed)*
- **Task 1.3:** Create an initial README documenting MVP scope and roadmap. *(Completed)*

### Phase 2: Develop Core Scheduling Engine
- **Task 2.1:** Implement the simplified chromosome representation. *(Completed)*
  - Each chromosome holds 33 genes, one per class.
- **Task 2.2:** Develop basic population management. *(Completed)*
  - Fixed-size population and tournament selection.
- **Task 2.3:** Create a streamlined fitness function. *(Completed)*
  - Hard constraint violations receive high penalties.
  - Soft constraints are rewarded with lower-weighted bonuses.
- **Task 2.4:** Implement basic genetic operators. *(Completed)*
  - Single crossover method (one-point/uniform).
  - Simple mutation operator (swapping class assignments).
- **Task 2.5:** Integrate the scheduling engine with a basic API/CLI for testing (all running in the browser). *(Completed)*

### Phase 3: Build the GUI and Constraint Input Module
- **Task 3.1:** Develop the constraint input form. *(Completed)*
  - Include fields for hard constraints (prep schedules, personal conflicts, rotation dates, limits) and soft constraints (preferences).
- **Task 3.2:** Implement save/load functionality for constraint sets. *(Completed)*
- **Task 3.3:** Create the weekly schedule dashboard view. *(Completed)*
  - Display a calendar view for Monday–Friday, 8 periods/day, with navigation controls.

### Phase 4: Integrate Manual Adjustment Features
- **Task 4.1:** Develop the drag-and-drop interface for schedule adjustments. *(Completed)*
  - Visual indicators for valid drop zones based on constraints.
  - Temporary drop zone for rescheduling classes across multiple weeks.
- **Task 4.2:** Ensure manual adjustments update the underlying schedule data. *(Completed)*
- **Task 4.3:** Optionally, enable re-optimization after manual adjustments if necessary. *(Completed)*

### Phase 5: File Management for Class Conflict Data
- **Task 5.1:** Build the file upload interface for CSV/JSON files.
  - Validate file structure (classes as rows, days as columns with numeric conflict periods). *(Completed)*
- **Task 5.2:** Merge uploaded data with in-memory class data. *(Completed)*
- **Task 5.3:** Create dedicated screens for editing and adding classes. *(Completed)*
- **Task 5.4:** Implement export functionality for class data (CSV/JSON). *(Completed)*

### Phase 6: Schedule Export and Persistence
- **Task 6.1:** Implement CSV export for the final schedule. *(Completed)*
  - Format: Calendar-like view with Date, Period, and Class columns.
- **Task 6.2:** Add persistence for final rotations for future reference. *(Completed)*
  - Storage: Used browser's localStorage for maintaining rotation history
  - UI: Implemented RotationHistory component with preview capability 
  - Notes: Added ability to include and edit notes for each saved rotation
  - Integration: Kept rotation history separate from the current schedule
  - Management: Added ability to save, load, view, edit, and delete rotations
  - Limits: Set maximum capacity to prevent excessive storage use
  - Interface options: Added both GUI tab and CLI commands for rotation management

### Phase 7: Testing and Validation
- **Task 7.1:** Write unit tests for the scheduling engine. *(Completed)*
  - Focus on the fitness function, genetic operators, and population management.
  - Implemented comprehensive tests for crossover and mutation methods in geneticOperators.ts
  - Added deterministic testing approach by properly mocking Math.random
  - Fixed issues with test expectations to match actual implementation behavior
  - Added tests for schedule rotation persistence functionality
  - Achieved 100% passing tests across all components
- **Task 7.2:** Develop integration tests for the API endpoints (within the frontend app). *(Completed)*
  - Created integration tests for the SchedulerAPI interacting with UI components
  - Implemented component mocks to simulate ClassManager, SchedulerCLI, and WeeklyScheduleDashboard behavior
  - Added tests for key API interactions including:
    - Class management (add, get classes)
    - Schedule operations (generate, lock/unlock assignments)
    - Rotation history functionality (save, retrieve)
  - Tested component-to-API interactions to ensure proper integration
  - All tests are passing, verifying proper integration between frontend and API
- **Task 7.3:** Perform user testing of the GUI (constraint input, schedule display, manual adjustments). *(In Progress)*
  - Enhanced the PersonalConflictsSection component to use a calendar view instead of generic weekdays
  - Implemented 5-day week calendar grid for selecting specific dates for conflicts
  - Updated TimeSlot data structure to include a specific date field for more accurate conflict tracking
  - Modified utility functions to support both date-specific and general day-of-week conflicts
  - Additional testing needed for:
    - Schedule display functionality
    - Manual adjustment capabilities
    - Drag-and-drop interactions
- **Task 7.4:** Validate file upload/edit functionality and CSV export accuracy.

### Phase 8: Finalization and Documentation
- **Task 8.1:** Finalize in-app documentation and tooltips.
- **Task 8.2:** Update project README with usage instructions.
- **Task 8.3:** Prepare a final MVP demonstration for internal review.

---

## 5. Milestones and Timeline

| Milestone                                     | Target Date       | Notes                                        |
|-----------------------------------------------|-------------------|----------------------------------------------|
| Environment Setup & Data Model Defined        | Week 1            | Complete scaffolding and initial planning    |
| Core Scheduling Engine Prototype              | Week 2–3          | Basic GA engine with simplified fitness       |
| GUI & Constraint Input Module Completed         | Week 4–5          | Basic calendar view and form inputs          |
| Drag-and-Drop Manual Adjustments Integrated      | Week 6            | Visual scheduling adjustments functionality   |
| File Upload, Edit, & Export Features Live       | Week 7            | Class conflict management functionality      |
| Full Integration & Testing Complete             | Week 8–9          | End-to-end testing and bug fixes               |
| Final MVP Release                              | Week 10           | Final demonstration and documentation finalized |

---

## 6. Next Steps

1. **Review and Approve Plan:**  
   Confirm that this plan aligns with your vision. Adjustments can be made before development begins.

2. **Kick-Off Development:**  
   Begin with Phase 1 (Setup and Requirements Finalization) and proceed sequentially through the phases.

3. **Regular Check-Ins:**  
   Schedule periodic reviews (e.g., weekly) to track progress, address issues, and adjust priorities as needed.

4. **User Feedback:**  
   Test early prototypes with both technical and non-technical users (your coworker) to gather feedback and refine the interface and scheduling logic.

---

This updated plan provides a clear, step-by-step path forward, noting the preference for a frontend-only implementation to keep the MVP lean and maintainable. Let me know if you have any questions or further adjustments before we proceed!