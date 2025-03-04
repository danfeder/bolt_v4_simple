# User Testing Feedback: Gym Class Rotation Scheduler

**Date:** March 3, 2025  
**Testing Round:** Round 1 - Core Functionality & Basic Usability

## Scenario A1: Basic Constraint Entry

### Personal Conflicts Section
- ✅ Calendar grid for selecting conflicts is working as expected

### Hard Constraints Section
- ✅ Weekly and daily minimum/maximum constraints are functioning well
- ❗ **ISSUE**: Maximum consecutive periods slider should be limited to only 3 choices (0, 1, or 2) instead of the current range
- 📝 Business rule: Never schedule 3 consecutive classes

## Scenario A2: Soft Constraint Configuration

### Teacher Preferences Section
- ❗ **ISSUE**: Teacher preferences are misaligned with intended functionality - should be associated with individual classes in the Class Manager, not with the gym teacher
- 📋 Need to evaluate how the UI should be reorganized to fix this conceptual issue

### Balance Schedule Feature
- ❗ **ISSUE**: The purpose and function of the "balance schedule" switch is unclear to users
- 📋 Need to add descriptive text, tooltip, or other clarification explaining what this setting actually does in the application
- 🔎 Consider whether this feature needs to be renamed or repositioned for better usability
- 🔍 **Technical finding**: The switch is labeled "Balance teacher workload throughout day/week" in the code, but there's a disconnection between the UI and implementation. While the setting is stored in the soft constraints model, a code search shows limited integration with the actual scheduling algorithm.

### Class Manager Constraints
- ❗ **ISSUE**: Teacher preferences should be moved from the Constraint Input form to the Class Manager screen
- 🔄 **Proposed solution**: Redesign the Class Manager to make the weekly schedule grid interactive:
  - The current grid already shows conflicts as red X markers
  - Convert this to an interactive grid where users can directly click to set different constraint types:
    - **Red X**: Hard conflict (cannot schedule during this period)
    - **Yellow exclamation**: Soft constraint - preferred to avoid this period
    - **Green check**: Soft constraint - preferred to schedule during this period
    - **Purple circle**: Must be scheduled during this period (or one of the other marked purple periods)
- 🛠️ **Implementation note**: This approach is more intuitive than the current complicated edit interface and better aligns with the user's mental model
- 📊 **UX improvement**: Visual differentiation between constraint types makes the interface more intuitive and informative

## Scenario A3: Class-Specific Constraints

## Scenario B1: Schedule Navigation

### Weekly Schedule Dashboard Issues
- ❗ **ISSUE**: The Weekly Schedule Dashboard shows an empty grid with "No Class" in all cells
- 🔄 **Navigation problem**: Unable to test schedule navigation because no schedule has been generated
- 📊 **UI clarity**: The empty dashboard is confusing and doesn't provide clear next steps for the user
- 🛠️ **Suggested improvement**: Either auto-generate a sample schedule or provide clear guidance on how to generate a schedule when the dashboard is empty

### Schedule Generation Issues
- ❗ **ISSUE**: No explicit button to generate a schedule in the Weekly Schedule Dashboard
- 🔄 **UX problem**: The application may be trying to auto-generate a schedule when switching to the schedule tab, which is not the desired behavior
- 🛠️ **Suggested improvement**: Add a clear "Generate Schedule" button to the dashboard interface
- 📊 **User preference**: User prefers explicit actions (button click) over automatic generation

### CLI Command Inconsistencies
- ❗ **ISSUE**: CLI suggests using "view schedule" command after generation, but the correct command is "list schedule"
- 🔄 **Documentation problem**: The help text or command suggestion doesn't match the actual available commands
- 🛠️ **Suggested improvement**: Update CLI command help text and suggestions to match actual available commands
- 📝 **Error handling**: Improve error messages when invalid commands are entered, possibly with suggestions for correct commands
- 📊 **UI coordination**: The "RE-OPTIMIZE SCHEDULE" button is greyed out, presumably because no schedule exists yet

### Integration Issues Between CLI and UI
- ❗ **CRITICAL ISSUE**: Schedule generated and displayed in CLI does not appear in the Weekly Schedule Dashboard
- 🔄 **Integration problem**: Disconnect between schedule data generated via CLI and what's displayed in the UI
- 🛠️ **Technical root cause**: Possible data synchronization issue between components
- 📊 **UX impact**: Confusing user experience where actions in one part of the app don't affect other parts as expected
- 🔍 **Suggested solution**: Ensure proper state management between CLI and Dashboard views, potentially using a shared data store or proper event propagation

### Schedule Format and Representation
- ❗ **ISSUE**: The generated schedule is a simple weekday-based schedule (Mon-Fri) rather than a calendar date-based schedule
- 📊 **Format limitations**: CLI displays the schedule as a text list organized by day and period, showing only class ID and name
- 🔄 **Missing functionality**: No representation of schedule rotation over multiple calendar weeks
- 🛠️ **Suggested improvement**: Enhance the schedule model to include actual calendar dates for proper rotation planning

### Weekly Schedule Dashboard Redesign
- ❗ **CRITICAL ISSUE**: User indicates need for complete rework of the Weekly Schedule view page
- 🔄 **Usability problem**: Current grid-based view is not suitable for displaying or navigating the generated schedules
- 📊 **UX improvement needed**: Design should match how the schedule is actually generated and used
- 🛠️ **Suggested approach**: 
  - Create a calendar-based view with proper date representation
  - Include navigation controls between weeks/rotation cycles
  - Clearly display class information in an easy-to-read format
  - Add proper integration with the scheduler engine

## User Testing Summary

### Most Functional and Useful Features
- ✅ **Personal conflicts selection**: The calendar-based interface for selecting specific dates works well
- ✅ **Hard constraints selection**: The interface for setting minimum/maximum classes per day/week is intuitive
- ✅ **File management component**: Features for saving, loading, and managing data are working as expected

### Highest Priority Issues
- 🚨 **Schedule display**: Complete rework needed for the Weekly Schedule Dashboard
- 🚨 **Calendar integration**: Schedule generation should work with actual calendar dates rather than generic weekdays
- 🚨 **CLI-UI synchronization**: Fix the disconnect between schedule generation in CLI and display in the UI

### Desired Additional Features
- 🌟 **Interactive Class Manager**: Redesign the Class Manager with an interactive grid interface where users can:
  - Mark hard conflicts (red X)
  - Mark soft constraints - preferred to avoid (yellow exclamation)
  - Mark soft constraints - preferred to schedule (green check)
  - Mark required scheduling periods (purple circle)
- 🌟 **Clearer constraint visualization**: Improve how different types of constraints are displayed throughout the application
