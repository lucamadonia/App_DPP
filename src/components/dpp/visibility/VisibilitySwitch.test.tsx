import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { VisibilitySwitch } from './VisibilitySwitch';

describe('visibility switch labels', () => {
  it('toggles the selected field when multiple consumer switches are rendered', () => {
    const first = vi.fn();
    const second = vi.fn();
    render(<>
      <VisibilitySwitch level="consumer" checked={false} onChange={first} label="Materials" />
      <VisibilitySwitch level="consumer" checked={false} onChange={second} label="Manufacturer" />
    </>);
    fireEvent.click(screen.getByText('Manufacturer'));
    expect(second).toHaveBeenCalledWith(true);
    expect(first).not.toHaveBeenCalled();
    expect(screen.getByRole('switch', { name: 'Materials' }).id).not.toBe(screen.getByRole('switch', { name: 'Manufacturer' }).id);
  });
});
