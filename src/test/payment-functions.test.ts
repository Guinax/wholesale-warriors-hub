// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { z } from 'zod';

function loadHandler(name: string, overrides: Record<string, unknown> = {}) {
  const order = { id: 'order-id', user_id: 'buyer', order_code: 'FM-TEST', payment_status: 'pending', total_amount: 29.9,
    items: [{ name: 'Product', qty: 1 }], address_state: 'SP', address_zip: '01001000', due_at: new Date(Date.now()+86400000).toISOString(), ...overrides };
  const catalog = [{ id:'11111111-1111-4111-8111-111111111111', name: 'Product', unit_price: 10, wholesale_price: 8, min_qty: 1, stock: 20, active: true, weight_kg:1, width_cm:10, height_cm:10, length_cm:10 }];
  const updates: unknown[] = [];
  const filters: unknown[] = [];
  const rpc = vi.fn(async (name: string) => ({ data: name === 'service_partner_checkout_valid' ? overrides.partner_checkout_valid !== false : true, error: null }));
  function from(table: string) {
    let updating = false;
    const chain = { select: () => chain, in: () => chain, eq: (...args: unknown[]) => { filters.push(args); return chain; },
      neq: (...args: unknown[]) => { filters.push(['neq',...args]); return chain; },
      maybeSingle: async () => ({ data: table === 'user_roles' ? (overrides.admin === true ? {role:'admin'} : null) : order, error: null }),
      update: (value: unknown) => { updating = true; updates.push(value); return chain; },
      then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: updating ? null : table === 'products' ? catalog : order, error: null }).then(resolve) };
    return chain;
  }
  const fetchMock = vi.fn(async (url: string, _init?: RequestInit) => {
    if (url.includes('viacep')) return new Response(JSON.stringify({uf:'SP'}),{status:200});
    if (url.includes('melhor-envio-quote')) {
      const livePrice=Number(overrides.liveShippingPrice);
      return new Response(JSON.stringify(Number.isFinite(livePrice)&&livePrice>0
        ? {available:true,price:livePrice,eta_days:2,service:{service_name:'SEDEX',company:'Correios'}}
        : {available:false,fallback:true}),{status:200});
    }
    return new Response(JSON.stringify({url:'https://checkout.infinitepay.io/test',paid:true,amount:2990}),{status:200});
  });
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
  it('keeps payment Edge Functions on service-only public RPC wrappers', () => {
    for (const name of ['payment-link','payment-check','payment-webhook']) {
      const source=readFileSync(`supabase/functions/${name}/index.ts`,'utf8');
      expect(source).not.toContain('.schema("private")');
    }
    expect(readFileSync('supabase/functions/payment-link/index.ts','utf8')).toContain('service_partner_checkout_valid');
    expect(readFileSync('supabase/functions/payment-check/index.ts','utf8')).toContain('service_partner_mark_order_paid');
    expect(readFileSync('supabase/functions/payment-webhook/index.ts','utf8')).toContain('service_partner_mark_order_paid');
  });
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
  it('uses a live Melhor Envio quote in the trusted payment total when product ids are present',async()=>{
    const x=loadHandler('payment-link',{
      items:[{product_id:'11111111-1111-4111-8111-111111111111',name:'Product',qty:1}],
      total_amount:27.5,
      liveShippingPrice:17.5,
    });
    const r=await x.request(linkBody);
    expect(r.status).toBe(200);
    expect(x.fetchMock).toHaveBeenCalledTimes(3);
    const providerInit=x.fetchMock.mock.calls[2]?.[1] as RequestInit|undefined;
    const payload=JSON.parse(String(providerInit?.body??'{}'));
    expect(payload.items).toContainEqual({description:'Frete',price:1750,quantity:1});
  });
  it('allows zero shipping only for an authenticated admin test order',async()=>{
    const x=loadHandler('payment-link',{total_amount:10,admin:true});
    const r=await x.request(linkBody);
    expect(r.status).toBe(200);
    expect((await r.json()).url).toContain('infinitepay.io');
    expect(x.fetchMock).toHaveBeenCalledTimes(2);
    const providerInit=x.fetchMock.mock.calls[1]?.[1] as RequestInit|undefined;
    const providerPayload=JSON.parse(String(providerInit?.body??'{}'));
    expect(providerPayload.items).toHaveLength(1);
    expect(providerPayload.items[0]).toMatchObject({description:'Product',price:1000,quantity:1});
  });
  it('rejects zero shipping when the buyer is not an admin',async()=>{
    const x=loadHandler('payment-link',{total_amount:10});
    const r=await x.request(linkBody);
    expect(r.status).toBe(409);
    expect(x.fetchMock).toHaveBeenCalledTimes(1);
    expect(x.rpc).not.toHaveBeenCalledWith('reserve_order_inventory',{_order_id:'order-id'});
  });
  it('reuses a recent trusted InfinitePay link without creating another charge',async()=>{
    const x=loadHandler('payment-link',{payment_provider:'infinitepay',payment_checked_at:new Date().toISOString(),payment_details:{url:'https://checkout.infinitepay.io/existing'}});
    const r=await x.request(linkBody); const body=await r.json();
    expect(r.status).toBe(200); expect(body.reused).toBe(true); expect(body.url).toContain('/existing');
    expect(x.fetchMock).not.toHaveBeenCalled(); expect(x.rpc).toHaveBeenCalledWith('service_expire_stale_orders'); expect(x.rpc).not.toHaveBeenCalledWith('reserve_order_inventory',expect.anything());
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
  it('verifies and records a late confirmed payment for an expired order without reopening it',async()=>{
    const x=loadHandler('payment-check',{payment_status:'expired'});
    const r=await x.request({order_code:'FM-TEST',transaction_nsu:'transaction',slug:'invoice'});
    const body=await r.json();
    expect(r.status).toBe(409);
    expect(body.paid).toBe(false);
    expect(body.provider_paid).toBe(true);
    expect(body.reconciliation_required).toBe(true);
    expect(x.fetchMock).toHaveBeenCalledTimes(1);
    expect(x.updates).toHaveLength(1);
    expect(x.updates[0]).not.toHaveProperty('payment_status');
    expect(x.updates[0]).toMatchObject({payment_provider:'infinitepay'});
  });
  it('acknowledges a verified late-payment webhook without reopening the order',async()=>{
    const x=loadHandler('payment-webhook',{payment_status:'expired'});
    const r=await x.request({order_nsu:'FM-TEST',transaction_nsu:'transaction',slug:'invoice'});
    const body=await r.json();
    expect(r.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.reconciliation_required).toBe(true);
    expect(x.fetchMock).toHaveBeenCalledTimes(1);
    expect(x.updates).toHaveLength(1);
    expect(x.updates[0]).not.toHaveProperty('payment_status');
    expect(x.updates[0]).toMatchObject({payment_provider:'infinitepay'});
  });
  it('rejects a provider confirmation with the wrong amount',async()=>{
    const x=loadHandler('payment-check',{total_amount:100}); expect((await x.request({order_code:'FM-TEST'})).status).toBe(409); expect(x.updates).toEqual([]);
  });
});
