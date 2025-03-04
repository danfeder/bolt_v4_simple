import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import ConstraintInputForm from './ConstraintInputForm';
import { SchedulingConstraints, TimeSlot, Day } from '../models/types';

// Wrap component with required providers
const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      {ui}
    </LocalizationProvider>
  );
};

describe('ConstraintInputForm', () => {
  it('renders correctly with initial constraints', () => {
    const initialConstraints: SchedulingConstraints = {
      hard: {
        personalConflicts: [],
        maxConsecutivePeriods: 3,
        dailyMinClasses: 0,
        dailyMaxClasses: 8,
        weeklyMinClasses: 0,
        weeklyMaxClasses: 33,
        rotationStartDate: new Date()
      },
      soft: {
        teacherPreferences: {
          preferred: [],
          notPreferred: []
        },
        balanceWorkload: true
      }
    };

    const onSubmit = vi.fn();
    renderWithProviders(<ConstraintInputForm initialConstraints={initialConstraints} onSubmit={onSubmit} />);
    
    // Check that the form title is displayed
    expect(screen.getByText('Scheduling Constraints')).toBeInTheDocument();
    
    // Check that PersonalConflictsSection is rendered
    expect(screen.getByText('Personal Conflicts')).toBeInTheDocument();
  });

  it('integrates with PersonalConflictsSection for adding conflicts', async () => {
    const initialConstraints: SchedulingConstraints = {
      hard: {
        personalConflicts: [],
        maxConsecutivePeriods: 3,
        dailyMinClasses: 0,
        dailyMaxClasses: 8,
        weeklyMinClasses: 0,
        weeklyMaxClasses: 33,
        rotationStartDate: new Date()
      },
      soft: {
        teacherPreferences: {
          preferred: [],
          notPreferred: []
        },
        balanceWorkload: true
      }
    };

    const onSubmit = vi.fn();
    renderWithProviders(<ConstraintInputForm initialConstraints={initialConstraints} onSubmit={onSubmit} />);
    
    // Find a checkbox in the calendar grid and click it
    // Wait for calendar to be rendered
    await waitFor(() => {
      expect(screen.getByText('Period 1')).toBeInTheDocument();
    });
    
    // Find checkboxes and click one to select a conflict
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]); // Select the first period in the grid
    
    // Click the "Add Selected Conflicts" button
    const addButton = screen.getByRole('button', { name: 'Add Selected Conflicts' });
    fireEvent.click(addButton);
    
    // Submit the form
    const submitButton = screen.getByRole('button', { name: 'Save Constraints' });
    fireEvent.click(submitButton);
    
    // Verify the form was submitted with at least one personal conflict included
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
      const submittedConstraints = onSubmit.mock.calls[0][0];
      expect(submittedConstraints.hard.personalConflicts.length).toBeGreaterThan(0);
    });
  });

  it('handles existing personal conflicts with dates', async () => {
    const today = new Date();
    const personalConflicts: TimeSlot[] = [
      { day: Day.MONDAY, period: 1, date: today }
    ];
    
    const initialConstraints: SchedulingConstraints = {
      hard: {
        personalConflicts,
        maxConsecutivePeriods: 3,
        dailyMinClasses: 0,
        dailyMaxClasses: 8,
        weeklyMinClasses: 0,
        weeklyMaxClasses: 33,
        rotationStartDate: new Date()
      },
      soft: {
        teacherPreferences: {
          preferred: [],
          notPreferred: []
        },
        balanceWorkload: true
      }
    };

    const onSubmit = vi.fn();
    renderWithProviders(<ConstraintInputForm initialConstraints={initialConstraints} onSubmit={onSubmit} />);
    
    // Wait for conflicts list to be rendered
    await waitFor(() => {
      expect(screen.getByText(Day.MONDAY)).toBeInTheDocument();
    });
    
    // Delete the existing conflict
    const deleteButtons = screen.getAllByRole('button', { name: 'delete' });
    fireEvent.click(deleteButtons[0]);
    
    // Submit the form
    const submitButton = screen.getByRole('button', { name: 'Save Constraints' });
    fireEvent.click(submitButton);
    
    // Verify the form was submitted with no personal conflicts
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
      const submittedConstraints = onSubmit.mock.calls[0][0];
      expect(submittedConstraints.hard.personalConflicts.length).toBe(0);
    });
  });
});
