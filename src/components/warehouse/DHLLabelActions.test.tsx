import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { WhShipment } from '@/types/warehouse';

const mockCreateDHLLabel = vi.fn();
const mockGetDHLSettings = vi.fn();

vi.mock('@/services/supabase/dhl-carrier', () => ({
  createDHLLabel: (...args: unknown[]) => mockCreateDHLLabel(...args),
  createDeutschePostLetterLabel: vi.fn(),
  cancelDHLLabel: vi.fn(),
  getDHLSettings: (...args: unknown[]) => mockGetDHLSettings(...args),
  getDeutschePostLetterProducts: vi.fn(),
}));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));

import { DHLLabelActions } from './DHLLabelActions';

const shipment: WhShipment = {
  id: 'shipment-1',
  tenantId: 'tenant-1',
  shipmentNumber: 'SHP-TEST',
  status: 'packed',
  recipientType: 'customer',
  recipientName: 'Test Customer',
  shippingStreet: 'Test Street 1',
  shippingCity: 'Berlin',
  shippingPostalCode: '10115',
  shippingCountry: 'DE',
  carrier: 'DHL',
  currency: 'EUR',
  totalWeightGrams: 750,
  totalItems: 1,
  priority: 'normal',
  createdAt: '2026-10-23T00:00:00Z',
  updatedAt: '2026-10-23T00:00:00Z',
};

const label = {
  success: true,
  trackingNumber: '123456',
  shipmentNumber: '123456',
  labelPdf: '',
  labelUrl: 'https://example.test/label.pdf',
  product: 'V01PAK',
};

describe('DHL Kleinpaket confirmation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDHLSettings.mockResolvedValue({
      hasCredentials: true,
      internetmarke: { enabled: false, hasCredentials: false },
    });
  });

  async function openAndSubmit() {
    fireEvent.click(screen.getByRole('button', { name: 'Create shipping label' }));
    await screen.findByRole('dialog');
    fireEvent.click(screen.getByRole('button', { name: /Print with/ }));
    await screen.findByText('Really create a DHL Kleinpaket label?');
  }

  it('holds the purchase until the user chooses DHL Paket instead', async () => {
    const onUpdate = vi.fn();
    mockCreateDHLLabel
      .mockResolvedValueOnce({ requiresConfirmation: true, product: 'V62KP', weightGrams: 750 })
      .mockResolvedValueOnce(label);
    render(<MemoryRouter><DHLLabelActions shipment={shipment} onUpdate={onUpdate} /></MemoryRouter>);

    await openAndSubmit();
    expect(mockCreateDHLLabel).toHaveBeenCalledTimes(1);
    expect(onUpdate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Buy DHL Paket label instead' }));
    await waitFor(() => expect(onUpdate).toHaveBeenCalledTimes(1));
    expect(mockCreateDHLLabel).toHaveBeenNthCalledWith(2, 'shipment-1', 'V01PAK', undefined, false);
  });

  it('buys Kleinpaket only after an explicit second click', async () => {
    const onUpdate = vi.fn();
    mockCreateDHLLabel
      .mockResolvedValueOnce({ requiresConfirmation: true, product: 'V62KP', weightGrams: 750 })
      .mockResolvedValueOnce({ ...label, product: 'V62KP' });
    render(<MemoryRouter><DHLLabelActions shipment={shipment} onUpdate={onUpdate} /></MemoryRouter>);

    await openAndSubmit();
    expect(mockCreateDHLLabel).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Yes, buy Kleinpaket label' }));
    await waitFor(() => expect(onUpdate).toHaveBeenCalledTimes(1));
    expect(mockCreateDHLLabel).toHaveBeenNthCalledWith(2, 'shipment-1', 'V62KP', undefined, true);
  });

  it('returns to the weight dialog without buying a label', async () => {
    const onUpdate = vi.fn();
    mockCreateDHLLabel.mockResolvedValueOnce({ requiresConfirmation: true, product: 'V62KP', weightGrams: 750 });
    render(<MemoryRouter><DHLLabelActions shipment={shipment} onUpdate={onUpdate} /></MemoryRouter>);

    await openAndSubmit();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByText('Choose the shipping method and confirm the packed shipment weight before purchase.')).toBeVisible();
    expect(mockCreateDHLLabel).toHaveBeenCalledTimes(1);
    expect(onUpdate).not.toHaveBeenCalled();
  });
});
