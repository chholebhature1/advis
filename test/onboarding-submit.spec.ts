import { vi, describe, it, expect, beforeEach } from 'vitest';

// Prepare a mock for createClient from @supabase/supabase-js
const rpcMock = vi.fn(async (_name: string, _args: any) => ({ data: { success: true }, error: null }));
const getUserMock = vi.fn(async () => ({ data: { user: { id: 'user-1' } }, error: null }));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: getUserMock },
    rpc: rpcMock,
  })),
}));

// Mock invalidateAgentContext import path alias used by route
vi.mock('@/lib/agent/context', () => ({
  invalidateAgentContext: vi.fn(),
}));

// Provide minimal env vars the route expects
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://localhost';
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? 'test-anon-key';

import { POST } from '../src/app/api/onboarding/submit/route';

function makeRequest(body: unknown, token = 'test-token') {
  return new Request('http://localhost/api/onboarding/submit', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  rpcMock.mockClear();
  getUserMock.mockClear();
});

describe('onboarding submit API compatibility', () => {
  it('accepts band-only payload and sends BOTH numeric + band fields', async () => {
    const req = makeRequest({ sessionId: 's1', answers: {
      time_horizon_band: '1_3_years',
      monthly_investment_capacity_band: '5000_10000',
      monthly_income_band: 'below_25000',
    }});

    const res = await POST(req as any);
    expect(res.status).toBe(200);
    expect(rpcMock).toHaveBeenCalled();
    const lastArgs = rpcMock.mock.calls[0][1];
    expect(lastArgs.p_payload.time_horizon_band).toBe('1_3_years');
    expect(lastArgs.p_payload.monthly_investment_capacity_band).toBe('5000_10000');
    expect(lastArgs.p_payload.monthly_income_band).toBe('below_25000');
    expect(lastArgs.p_payload.target_horizon_years).toBe(2);
    expect(lastArgs.p_payload.time_horizon_years).toBe(2);
    expect(lastArgs.p_payload.monthly_investable_surplus_inr).toBe(7500);
    expect(lastArgs.p_payload.sip_capacity_inr).toBe(7500);
    expect(lastArgs.p_payload.monthly_income_inr).toBe(20000);
  });

  it('accepts custom-only payload and derives numeric and band fields', async () => {
    const req = makeRequest({ sessionId: 's2', answers: {
      time_horizon_band: 'custom',
      time_horizon_custom_years: '7',
      monthly_investment_capacity_band: 'custom',
      sip_custom_amount: '12000',
      monthly_income_band: 'custom',
      income_custom_amount: '85000',
    }});

    const res = await POST(req as any);
    expect(res.status).toBe(200);
    expect(rpcMock).toHaveBeenCalled();
    const lastArgs = rpcMock.mock.calls[0][1];
    // numeric fields
    expect(lastArgs.p_payload.target_horizon_years).toBe(7);
    expect(lastArgs.p_payload.monthly_investable_surplus_inr).toBe(12000);
    expect(lastArgs.p_payload.monthly_income_inr).toBe(85000);
    // derived bands
    expect(typeof lastArgs.p_payload.time_horizon_band).toBe('string');
    expect(typeof lastArgs.p_payload.monthly_investment_capacity_band).toBe('string');
    expect(typeof lastArgs.p_payload.monthly_income_band).toBe('string');
  });

  it('accepts numeric-only payload and derives bands', async () => {
    const req = makeRequest({ sessionId: 's3', answers: {
      target_horizon_years: '4',
      sip_capacity_inr: '20000',
      monthly_income_inr: '60000',
    }});

    const res = await POST(req as any);
    expect(res.status).toBe(200);
    expect(rpcMock).toHaveBeenCalled();
    const lastArgs = rpcMock.mock.calls[0][1];
    expect(lastArgs.p_payload.target_horizon_years).toBe(4);
    expect(lastArgs.p_payload.time_horizon_band).toBeDefined();
    expect(lastArgs.p_payload.monthly_investable_surplus_inr).toBe(20000);
    expect(lastArgs.p_payload.monthly_investment_capacity_band).toBeDefined();
    expect(lastArgs.p_payload.monthly_income_inr).toBe(60000);
    expect(lastArgs.p_payload.monthly_income_band).toBeDefined();
  });

  it('mixed conflicting input keeps numeric values and ignores lower bands', async () => {
    const req = makeRequest({ sessionId: 's4', answers: {
      target_horizon_years: '9',
      time_horizon_band: '1_3_years',
      monthly_investable_surplus_inr: '150000',
      monthly_investment_capacity_band: '25000_50000',
      monthly_income_inr: '300000',
      monthly_income_band: '25000_50000',
    }});

    const res = await POST(req as any);
    expect(res.status).toBe(200);
    expect(rpcMock).toHaveBeenCalled();
    const lastArgs = rpcMock.mock.calls[0][1];
    expect(lastArgs.p_payload.target_horizon_years).toBe(9);
    expect(lastArgs.p_payload.time_horizon_band).toBe('5_10_years');
    expect(lastArgs.p_payload.monthly_investable_surplus_inr).toBe(150000);
    expect(lastArgs.p_payload.sip_capacity_inr).toBe(150000);
    expect(lastArgs.p_payload.monthly_investment_capacity_band).toBe('50000_plus');
    expect(lastArgs.p_payload.monthly_income_inr).toBe(300000);
    expect(lastArgs.p_payload.monthly_income_band).toBe('100000_300000');
  });

  it('preserves custom SIP exactly without rounding or capping', async () => {
    const req = makeRequest({ sessionId: 's5', answers: {
      monthly_investable_surplus_inr: '150000.75',
      monthly_investment_capacity_band: '25000_50000',
      monthly_income_inr: '300000',
      target_horizon_years: '10',
    }});

    const res = await POST(req as any);
    expect(res.status).toBe(200);
    expect(rpcMock).toHaveBeenCalled();
    const lastArgs = rpcMock.mock.calls[0][1];
    expect(lastArgs.p_payload.monthly_investable_surplus_inr).toBe(150000.75);
    expect(lastArgs.p_payload.sip_capacity_inr).toBe(150000.75);
    expect(lastArgs.p_payload.monthly_investment_capacity_band).toBe('50000_plus');
  });
});
