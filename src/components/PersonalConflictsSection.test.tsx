import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import PersonalConflictsSection from './PersonalConflictsSection';
import { Day, TimeSlot, Period } from '../models/types';
import userEvent from '@testing-library/user-event';
import { format, parseISO } from 'date-fns';

// Wrap component with required providers
const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      {ui}
    </LocalizationProvider>
  );
};

describe('PersonalConflictsSection', () => {
  it('renders correctly without conflicts', () => {
    const onChange = vi.fn();
    renderWithProviders(<PersonalConflictsSection conflicts={[]} onChange={onChange} />);
    
    // Check that the section title is displayed
    expect(screen.getByText('Personal Conflicts')).toBeInTheDocument();
    
    // Check that the date picker is visible with correct label
    expect(screen.getByLabelText('Select Week')).toBeInTheDocument();
    
    // Check that we have a calendar view with periods
    expect(screen.getAllByText('Period 1')[0]).toBeInTheDocument();
  });

  it('displays existing conflicts correctly', async () => {
    const today = new Date();
    const conflicts: TimeSlot[] = [
      { day: Day.MONDAY, period: 1, date: today }
    ];
    
    const onChange = vi.fn();
    renderWithProviders(<PersonalConflictsSection conflicts={conflicts} onChange={onChange} />);
    
    // Wait for the conflict list to be rendered
    await waitFor(() => {
      // Check that the conflict date is displayed in the conflicts table
      expect(screen.getByText(format(
        typeof today === 'string' ? parseISO(today) : today,
        'MMM d, yyyy'
      ))).toBeInTheDocument();
      // Check that Day.MONDAY is shown in the table
      expect(screen.getByText(Day.MONDAY)).toBeInTheDocument();
    });
  });

  it('allows adding new conflicts', async () => {
    const onChange = vi.fn();
    renderWithProviders(<PersonalConflictsSection conflicts={[]} onChange={onChange} />);
    
    // Find a period checkbox and click it to select
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]); // Select the first period
    
    // Click the Add button
    const addButton = screen.getByRole('button', { name: /add selected conflicts/i });
    fireEvent.click(addButton);
    
    // Verify that onChange was called with the new conflict
    expect(onChange).toHaveBeenCalled();
    
    // Get the conflicts that were passed to onChange
    const newConflicts = onChange.mock.calls[0][0];
    expect(newConflicts.length).toBeGreaterThan(0);
  });

  it('allows removing an existing conflict', async () => {
    const today = new Date();
    const conflicts: TimeSlot[] = [
      { day: Day.MONDAY, period: 1, date: today },
      { day: Day.TUESDAY, period: 2, date: new Date(today.getTime() + 86400000) } // tomorrow
    ];
    
    const onChange = vi.fn();
    renderWithProviders(<PersonalConflictsSection conflicts={conflicts} onChange={onChange} />);
    
    // Wait for the conflict list to be rendered
    await waitFor(() => {
      expect(screen.getByText(Day.MONDAY)).toBeInTheDocument();
    });
    
    // Find and click the delete button for the first conflict
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(deleteButtons[0]);
    
    // Verify that onChange was called with one conflict removed
    expect(onChange).toHaveBeenCalled();
    
    // Get the conflicts that were passed to onChange
    const updatedConflicts = onChange.mock.calls[0][0];
    expect(updatedConflicts).toHaveLength(1);
    expect(updatedConflicts[0].period).toBe(2);
  });
});
