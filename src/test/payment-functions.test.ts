// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { z } from 'zod';

function loadHandler(name: string, overrides: Record<string, unknown> = {}) {
  const order = { id: 'order-id', user_id: 'buyer', order_code: 'FM-TEST', payment_status: 'pending', total_amount: 29.9,
    items: [{ name: 'Product', qty: 1 }], address_state: 'SP', address_zip: '01001000', due_at: new Date(Date.now()+86400000).toISOString(), ...overrides };
  const catalog = [{ name: 'Product', unit_price: 10, wholesale_price: 8, min_qty: 1, stock: 20, active: true }];
  const updates: unknown[] = [];
  const filters: unknown[] = [];
  const rpc = vi.fn(async (name: string) => ({ data: name === 'partner_checkout_valid' ? overrides.partner_checkout_valid !== false : true, error: null }));
  function from(table: string) {
    let updating = false;
    const chain = { select: () => chain, in: () => chain, eq: (...args: unknown[]) => { filters.push(args); return chain; },
      neq: (...args: unknown[]) => { filters.push(['neq',...args]); return chain; },
      maybeSingle: async () => ({ data: order, error: null }),
      update: (value: unknown) => { updating = true; updates.push(value); return chain; },
      then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: updating ? null : table === 'products' ? catalog : order, error: null }).then(resolve) };
    return chain;
  }
  const fetchMock = vi.fn(async (url: string) => new Response(JSON.stringify(url.includes('viacep') ? { uf:'SP' } : { url:'https://checkout.infinitepay.io/test', paid:true, amount:2990 }), {status:200}));
  let handler!: (req: Request) => Promise<Response>;
  const source = readFileSync(`supabase/functions/${name}/index.ts`, 'utf8').replace(/^import .*;\n/gm,'');
  vm.runInNewContext(ts.transpile(source, { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None }), {
    Deno: { env: { get: (key: string) => key === 'CHECKOUT_REDIRECT_ORIGINS' ? undefined : 'configured' }, serve: (fn: typeof handler) => { handler = fn; } },
    createClient: () => ({ auth: {getUser: async () => ({data:{user:{id:'buyer'}},error:null})}, from, rpc, schema: () => ({ rpc }) }),
    z, corsHeaders: {}, Response, Request, URL, AbortSignal, fetch:fetchMock, console,
  });
  const request = (body: unknown, authenticated = true) => handler(new Request('https://example.test', {
    method:'POST', headers:{'Content-Type':'application/json', ...(authenticated ? {Authorization:'Bearer test'} : {})}, body:JSON.stringify(body),
  }));
  return {request,fetchMock,updates,filters,rpc};
}
const linkBody = {order_code:'FM-TEST',redirect_url:'https://wholesale-warriors-hub.lovable.app/recibo/FM-TEST'};
describe('Payment integration boundaries', () => {
  it('rejects anonymous callers without contacting provider', async () => {
    const x=loadHandler('payment-link'); expect((await x.request(linkBody,false)).status).toBe(401); expect(x.fetchMock).not.toHaveBeenCalled();
  });
  it('rejects an order belonging to another customer',async()=>{
    const x=loadHandler('payment-link',{user_id:'someone-else'}); expect((await x.request(linkBody)).status).toBe(404); expect(x.fetchMock).not.toHaveBeenCalled();
  });
  it('rejects duplicate lines exceeding combined stock',async()=>{
    const x=loadHandler('payment-link',{items:[{name:'Product',qty:11},{name:'Product',qty:10}]}); expect((await x.request(linkBody)).status).toBe(409); expect(x.fetchMock).not.toHaveBeenCalled();
  });
  it('rejects changed totals before creating a charge',async()=>{
    const x=loadHandler('payment-link',{total_amount:1}); expect((await x.request(linkBody)).status).toBe(409); expect(x.fetchMock.mock.calls.every(([u])=>u.includes('viacep'))).toBe(true);
  });
  it('rejects redirect outside the store',async()=>{
    const x=loadHandler('payment-link'); expect((await x.request({...linkBody,redirect_url:'https://other.test'})).status).toBe(400);
  });
  it('creates a checkout containing retail catalog price and shipping below six units',async()=>{
    const x=loadHandler('payment-link'); const r=await x.request(linkBody); expect(r.status).toBe(200); expect((await r.json()).url).toContain('infinitepay.io'); expect(x.fetchMock).toHaveBeenCalledTimes(2); expect(x.rpc).toHaveBeenCalledWith('reserve_order_inventory',{_order_id:'order-id'});
  });
  it('reuses a recent trusted InfinitePay link without creating another charge',async()=>{
    const x=loadHandler('payment-link',{payment_provider:'infinitepay',payment_checked_at:new Date().toISOString(),payment_details:{url:'https://checkout.infinitepay.io/existing'}});
    const r=await x.request(linkBody); const body=await r.json();
    expect(r.status).toBe(200); expect(body.reused).toBe(true); expect(body.url).toContain('/existing');
    expect(x.fetchMock).not.toHaveBeenCalled(); expect(x.rpc).toHaveBeenCalledWith('expire_stale_orders'); expect(x.rpc).not.toHaveBeenCalledWith('reserve_order_inventory',expect.anything());
  });
  it('rejects a partner checkout when its reservation is no longer valid',async()=>{
    const x=loadHandler('payment-link',{fulfillment_store_id:'store-id',delivery_quote:19.9,total_amount:29.9,partner_checkout_valid:false});
    const r=await x.request(linkBody); expect(r.status).toBe(409); expect(x.fetchMock).not.toHaveBeenCalled();
  });
  it('does not reuse a lookalike InfinitePay hostname',async()=>{
    const x=loadHandler('payment-link',{payment_provider:'infinitepay',payment_checked_at:new Date().toISOString(),payment_details:{url:'https://evilinfinitepay.io/existing'}});
    const r=await x.request(linkBody); expect(r.status).toBe(200); expect(x.fetchMock).toHaveBeenCalled();
  });
  it('does not reserve central inventory for a partner order',async()=>{
    const x=loadHandler('payment-link',{fulfillment_store_id:'store-id',delivery_quote:19.9,total_amount:29.9});
    const r=await x.request(linkBody);
    expect(r.status).toBe(200);
    expect(x.rpc).not.toHaveBeenCalledWith('reserve_order_inventory',{_order_id:'order-id'});
  });
  it('applies wholesale catalog price automatically from six units',async()=>{
    const x=loadHandler('payment-link',{items:[{name:'Product',qty:6}],total_amount:67.9}); const r=await x.request(linkBody); expect(r.status).toBe(200); expect((await r.json()).url).toContain('infinitepay.io'); expect(x.fetchMock).toHaveBeenCalledTimes(2); expect(x.rpc).toHaveBeenCalledWith('reserve_order_inventory',{_order_id:'order-id'});
  });
  it('routes a late confirmed payment for an expired order to reconciliation without contacting provider',async()=>{
    const x=loadHandler('payment-check',{payment_status:'expired'});
    const r=await x.request({order_code:'FM-TEST',transaction_nsu:'transaction',slug:'invoice'});
    const body=await r.json();
    expect(r.status).toBe(409);
    expect(body.paid).toBe(false);
    expect(body.reconciliation_required).toBe(true);
    expect(x.fetchMock).not.toHaveBeenCalled();
    expect(x.updates).toEqual([]);
  });
  it('rejects a provider confirmation with the wrong amount',async()=>{
    const x=loadHandler('payment-check',{total_amount:100}); expect((await x.request({order_code:'FM-TEST'})).status).toBe(409); expect(x.updates).toEqual([]);
  });
});
