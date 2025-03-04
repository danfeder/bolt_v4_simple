# User Testing Plan: Gym Class Rotation Scheduler

**Date:** March 3, 2025  
**Version:** 1.2

---

## Introduction

This document outlines a streamlined user testing plan for the Gym Class Rotation Scheduler application. The testing will focus on the graphical user interface (GUI) components, including constraint input, schedule display, and manual adjustment features. The plan is designed for a developer-guided testing session where I (the developer) will guide you (the user) through specific test scenarios to gather feedback on the application's usability and functionality.

**Testing Objectives:**
- Validate that you can effectively interact with all UI components
- Identify any usability issues or pain points in the interface
- Ensure the application's workflow aligns with your expected mental model
- Verify that you can successfully complete key tasks
- Gather feedback for potential refinements and improvements

**Testing Relationship:**
- Developer (Me): Guiding the testing process, providing instructions, and documenting feedback
- User (You): Performing tasks, providing real-time feedback, and evaluating the application

**Iterative Approach:**
This plan employs multiple rounds of testing with feedback-driven improvements between each round, allowing us to:
- Address identified issues incrementally
- Validate that improvements actually solve the problems
- Focus on different aspects of the application in each round
- Build upon insights gained from previous rounds

---

## Table of Contents

1. [Testing Methodology](#1-testing-methodology)
2. [Test Environment](#2-test-environment)
3. [Test Scenarios](#3-test-scenarios)
4. [Feedback Collection](#4-feedback-collection)
5. [Success Criteria](#5-success-criteria)
6. [Iterative Testing Process](#6-iterative-testing-process)

---

## 1. Testing Methodology

### A. Testing Approach
- **Task-Based Testing:** I'll provide you with specific tasks to complete using the application
- **Concurrent Feedback:** You'll share your thoughts, expectations, and any frustrations while using the application
- **Post-Task Discussion:** After each task, we'll briefly discuss your experience
- **Satisfaction Ratings:** You'll provide satisfaction ratings for different aspects of the interface
- **Iterative Improvement:** We'll conduct multiple rounds of testing with improvements between rounds

### B. User Perspective
I'll be gathering feedback from your perspective as:
- Someone who needs to understand the scheduling system
- A potential regular user of the application
- Someone who may need to make schedule adjustments

### C. Testing Focus Areas
- **Usability:** How intuitive and easy-to-use the interface is
- **Functionality:** Whether features work as expected
- **Workflow:** How natural the process feels for accomplishing tasks
- **User Experience:** Your overall satisfaction with the application

---

## 2. Test Environment

### A. Application Setup
- The application will be pre-populated with sample class data (approximately 33 classes)
- Test scenarios will use predefined constraints when needed
- We'll reset the application state between test scenarios as needed

### B. Testing Context
- Testing will occur through our current communication interface
- You'll have direct access to the application during testing
- I'll provide clear instructions for each task
- You'll be able to ask questions and provide feedback throughout the process

---

## 3. Test Scenarios

### A. Constraint Input Module Testing

#### Scenario A1: Basic Constraint Entry
- **Task:** Enter a new set of hard constraints including:
  - Personal conflicts for specific dates/periods
  - Weekly/daily minimum and maximum classes
  - Maximum consecutive periods without a break
- **Expected Outcome:** You successfully create and save a new constraint set
- **Feedback Points:** Ease of use, clarity of input fields, any confusion points

#### Scenario A2: Soft Constraint Configuration
- **Task:** Configure class-specific preferences and teacher workload balancing options
- **Expected Outcome:** You correctly set and save soft constraints
- **Feedback Points:** Intuitiveness of the interface, clarity of options, ease of making selections

#### Scenario A3: Constraint Set Management
- **Task:** Save, load, and modify different constraint sets
- **Expected Outcome:** You can manage multiple constraint sets effectively
- **Feedback Points:** Navigation experience, clarity of the saving/loading process

### B. Schedule Display Testing

#### Scenario B1: Schedule Navigation
- **Task:** Navigate through a multi-week schedule rotation
- **Expected Outcome:** You can efficiently view different days/weeks
- **Feedback Points:** Clarity of navigation controls, ease of finding specific dates

#### Scenario B2: Schedule Information Comprehension
- **Task:** Answer specific questions about the displayed schedule (e.g., "Which class is scheduled for Tuesday, period 3?")
- **Expected Outcome:** You correctly interpret the schedule display
- **Feedback Points:** Readability of the schedule, information organization, visual clarity

#### Scenario B3: Schedule Analysis
- **Task:** Identify potential issues in a given schedule (e.g., constraint violations, unbalanced workload)
- **Expected Outcome:** You successfully identify key issues
- **Feedback Points:** Visibility of potential problems, clarity of schedule status

### C. Manual Adjustment Testing

#### Scenario C1: Basic Class Rescheduling
- **Task:** Move a class from one time slot to another valid time slot
- **Expected Outcome:** You successfully complete the drag-and-drop operation
- **Feedback Points:** Intuitiveness of the drag-and-drop interface, visual feedback during dragging

#### Scenario C2: Complex Rescheduling with Constraints
- **Task:** Reschedule multiple classes while respecting hard constraints
- **Expected Outcome:** You understand constraint visualization and successfully complete rescheduling
- **Feedback Points:** Clarity of constraint indicators, ease of working within constraints

#### Scenario C3: Temporary Storage Usage
- **Task:** Use the temporary drop zone to facilitate complex schedule changes
- **Expected Outcome:** You effectively utilize the temporary storage area
- **Feedback Points:** Discoverability of the feature, clarity of purpose, ease of use

### D. End-to-End Workflow Testing

#### Scenario D1: Complete Schedule Generation Workflow
- **Task:** Set up constraints, generate a schedule, make manual adjustments, and export the result
- **Expected Outcome:** You complete the entire workflow without major issues
- **Feedback Points:** Overall flow, transition between steps, any pain points in the process

#### Scenario D2: Data Import/Export Workflow
- **Task:** Import class data, review and verify the import, modify as needed, and export the final schedule
- **Expected Outcome:** You successfully complete the import/export workflow
- **Feedback Points:** Clarity of import/export options, feedback during the process

---

## 4. Feedback Collection

### A. During-Task Feedback
- I'll ask you to share your thoughts as you work through tasks
- You can highlight points of confusion or appreciation in real-time
- I'll note any observed hesitations or difficulties

### B. Post-Task Questions
For each task, I may ask questions such as:
- How difficult was this task to complete? (1-5 scale)
- What was the most confusing aspect of this task?
- Is there anything you would change about how this feature works?
- Did the interface behave as you expected?

### C. Overall Evaluation
At the end of testing, I'll ask for your feedback on:
- Which features were most useful or intuitive
- Which aspects of the interface need improvement
- Any missing functionality you would expect
- Your overall satisfaction with the application

---

## 5. Success Criteria

### A. Task Completion
- You should be able to successfully complete most tasks with minimal guidance
- Any task failures will be analyzed to understand the underlying usability issues

### B. Usability Goals
- **Learnability:** You should grasp how to use features quickly
- **Efficiency:** Common tasks should feel straightforward and not overly cumbersome
- **Error Recovery:** If you make mistakes, it should be easy to recover
- **Satisfaction:** Your overall impression should be positive

### C. Feedback-Based Improvements
- Your feedback will directly inform prioritized improvements to the interface
- Critical usability issues will be addressed first
- Feature requests will be evaluated for inclusion in future updates

---

## 6. Iterative Testing Process

### A. Testing Rounds

#### Round 1: Core Functionality & Basic Usability
- **Focus:** Basic interface navigation, constraint input, and schedule display
- **Key Scenarios:** A1, A2, B1, B2, D1 (simplified version)
- **Primary Goal:** Identify major usability issues and navigation obstacles
- **Timeline:** Complete initial testing, implement critical fixes (1-3 days)

#### Round 2: Advanced Features & Manual Adjustments
- **Focus:** Schedule manipulation, drag-and-drop interface, constraint visualization
- **Key Scenarios:** C1, C2, C3, B3
- **Primary Goal:** Validate improvements from Round 1 and test more complex interactions
- **Timeline:** Complete after Round 1 improvements are implemented (3-5 days after Round 1)

#### Round 3: End-to-End Workflows & Refinement
- **Focus:** Complete workflows, data import/export, and overall experience
- **Key Scenarios:** D1 (complete), D2, and retesting of any problematic areas from earlier rounds
- **Primary Goal:** Validate the entire application experience and any remaining improvements
- **Timeline:** Final testing round after Round 2 improvements (5-7 days after Round 2)

### B. Between-Round Activities

#### After Round 1:
- Analyze feedback to identify critical usability issues
- Implement high-priority fixes for major obstacles
- Adjust testing plan for Round 2 based on findings
- Document improvements made for validation in next round

#### After Round 2:
- Address more complex interaction issues
- Implement refinements to the drag-and-drop interface
- Enhance visualization and feedback mechanisms
- Fine-tune the application based on cumulative feedback

### C. Session Structure (Each Round)

1. **Introduction (5 minutes)**
   - Overview of this round's testing goals
   - Explanation of what has changed since previous round (after Round 1)
   - Setting expectations for the session

2. **Task-Based Testing (30-45 minutes)**
   - Guided tasks from the test scenarios for this round
   - Real-time feedback collection
   - Short breaks between major task groups

3. **Summary Discussion (10-15 minutes)**
   - Overall impressions for this testing round
   - Most significant remaining usability issues
   - Validation of improvements from previous round (after Round 1)
   - Priorities for the next iteration

### D. Developer Role (My Responsibilities)
- Provide clear instructions for each task
- Avoid leading questions that might bias feedback
- Document all feedback accurately
- Clarify questions about the application when needed
- Maintain a supportive, non-judgmental environment
- Implement improvements between testing rounds

### E. User Role (Your Participation)
- Attempt tasks as instructed
- Share honest thoughts and reactions
- Ask questions when instructions are unclear
- Provide specific feedback about pain points
- Suggest improvements based on your experience
- In later rounds, evaluate whether previous issues have been resolved

---

After completing all testing rounds, I'll compile your feedback into a final prioritized list of improvements for the application. The iterative nature of this testing process will help ensure that the most critical issues are addressed early, and that improvements actually solve the identified problems.

Thank you for your participation in this testing process! Your feedback across multiple rounds will be invaluable for creating a more effective and user-friendly Gym Class Rotation Scheduler.
