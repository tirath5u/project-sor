import { afterEach, expect, it, vi } from 'vitest';
import { reserveDurableLabCall } from './quota.server';
const rpc = vi.hoisted(() => vi.fn());
vi.mock('@/integrations/supabase/client.server', () => ({supabaseAdmin: {rpc}}));
afterEach(() => {vi.unstubAllEnvs();vi.clearAllMocks();});
it('fails closed without trusted visitor identity',async()=>{
 expect(await reserveDurableLabCall(new Request('https://lab.test'))).toMatchObject({allowed:false,reason:'quota_storage_unavailable'});
 expect(rpc).not.toHaveBeenCalled();
});
it('fails closed on storage outage without retry',async()=>{
 vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','test-only');
 rpc.mockReturnValue({abortSignal:async()=>{throw new Error('private storage error');}});
 const result=await reserveDurableLabCall(new Request('https://lab.test',{headers:{'cf-connecting-ip':'192.0.2.1'}}));
 expect(result).toEqual({allowed:false,reason:'quota_storage_unavailable',retryAfterSeconds:null});
 expect(rpc).toHaveBeenCalledTimes(1);
});
it('rejects malformed storage success',async()=>{
 vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','test-only');
 rpc.mockReturnValue({abortSignal:async()=>({data:{allowed:true,dailyCallsUsed:201},error:null})});
 expect(await reserveDurableLabCall(new Request('https://lab.test',{headers:{'cf-connecting-ip':'192.0.2.1'}}))).toMatchObject({allowed:false});
});
