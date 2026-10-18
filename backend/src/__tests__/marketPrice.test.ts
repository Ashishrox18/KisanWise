/**
 * TC-BL-30 … TC-BL-45  — MarketPriceService unit tests
 * External HTTP (data.gov.in) is mocked via jest.mock('axios').
 */
import axios from 'axios';
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Import AFTER the mock is set up
import { marketPriceService } from '../services/market-price.service';

beforeEach(() => {
  marketPriceService.clearCache();
  jest.clearAllMocks();
});

describe('marketPriceService.getAveragePrice — API success path', () => {
  test('TC-BL-30 computes average from modal prices correctly', async () => {
    mockedAxios.get = jest.fn().mockResolvedValue({
      data: {
        records: [
          { commodity: 'Wheat', market: 'Pune', state: 'Maharashtra', district: 'Pune',
            min_price: '2000', max_price: '2600', modal_price: '2300', arrival_date: '2026-10-01' },
          { commodity: 'Wheat', market: 'Nashik', state: 'Maharashtra', district: 'Nashik',
            min_price: '2100', max_price: '2700', modal_price: '2500', arrival_date: '2026-10-01' },
        ],
      },
    });

    const result = await marketPriceService.getAveragePrice('Wheat');

    expect(result.average).toBe(2400); // (2300+2500)/2
    expect(result.min).toBe(2300);
    expect(result.max).toBe(2500);
    expect(['rising', 'falling', 'stable']).toContain(result.trend);
    expect(typeof result.change).toBe('number');
    expect(result.unit).toBe('quintal');
  });

  test('TC-BL-31 zero-modal-price records are skipped', async () => {
    mockedAxios.get = jest.fn().mockResolvedValue({
      data: {
        records: [
          { modal_price: '0', min_price: '0', max_price: '0' },
          { modal_price: '2500', min_price: '2000', max_price: '3000', arrival_date: '2026-10-01' },
        ],
      },
    });

    const result = await marketPriceService.getAveragePrice('Rice');
    expect(result.average).toBe(2500);
  });

  test('TC-BL-32 caches result; second call does not hit network', async () => {
    mockedAxios.get = jest.fn().mockResolvedValue({
      data: { records: [{ modal_price: '3000', min_price: '2800', max_price: '3200', arrival_date: '2026-10-01' }] },
    });

    await marketPriceService.getAveragePrice('Onion');
    await marketPriceService.getAveragePrice('Onion');

    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
  });
});

describe('marketPriceService.getAveragePrice — API failure fallback', () => {
  test('TC-BL-33 returns fallback data when API throws', async () => {
    mockedAxios.get = jest.fn().mockRejectedValue(new Error('Network error'));

    const result = await marketPriceService.getAveragePrice('Wheat');

    expect(result.average).toBeGreaterThan(0);
    expect(result.unit).toBe('quintal');
    expect(['rising', 'falling', 'stable']).toContain(result.trend);
  });

  test('TC-BL-34 returns fallback data when API returns empty records', async () => {
    mockedAxios.get = jest.fn().mockResolvedValue({ data: { records: [] } });

    const result = await marketPriceService.getAveragePrice('Tomato');

    expect(result.average).toBeGreaterThan(0);
    expect(result.average).toBe(2000); // Tomato fallback price
  });

  test('TC-BL-35 fallback price for Wheat is ~2450', async () => {
    mockedAxios.get = jest.fn().mockRejectedValue(new Error('fail'));

    const result = await marketPriceService.getAveragePrice('Wheat');

    expect(result.average).toBe(2450);
  });

  test('TC-BL-36 fallback for completely unknown crop returns 2200 default', async () => {
    mockedAxios.get = jest.fn().mockRejectedValue(new Error('fail'));

    const result = await marketPriceService.getAveragePrice('UnknownCrop999');

    expect(result.average).toBe(2200);
  });

  test('TC-BL-37 unit is "ton" for Cotton, "quintal" otherwise', async () => {
    mockedAxios.get = jest.fn().mockRejectedValue(new Error('fail'));

    const cottonResult = await marketPriceService.getAveragePrice('Cotton');
    expect(cottonResult.unit).toBe('ton');

    marketPriceService.clearCache();
    const wheatResult = await marketPriceService.getAveragePrice('Wheat');
    expect(wheatResult.unit).toBe('quintal');
  });
});

describe('marketPriceService — response shape contract', () => {
  test('TC-BL-38 response always has all required fields', async () => {
    mockedAxios.get = jest.fn().mockRejectedValue(new Error('fail'));

    const result = await marketPriceService.getAveragePrice('Potato');

    expect(result).toHaveProperty('average');
    expect(result).toHaveProperty('min');
    expect(result).toHaveProperty('max');
    expect(result).toHaveProperty('trend');
    expect(result).toHaveProperty('change');
    expect(result).toHaveProperty('unit');
  });

  test('TC-BL-39 average is always a positive integer', async () => {
    mockedAxios.get = jest.fn().mockRejectedValue(new Error('fail'));

    const result = await marketPriceService.getAveragePrice('Wheat');

    expect(Number.isInteger(result.average)).toBe(true);
    expect(result.average).toBeGreaterThan(0);
  });
});
