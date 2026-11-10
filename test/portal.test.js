import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createPortal } from '../src/portal.js';
async function setup(t){const p=await createPortal();const origin=await p.listen();t.after(()=>p.close());return origin;}
async function login(o){const r=await fetch(o+'/session',{method:'POST',redirect:'manual'});return r.headers.get('set-cookie').split(';')[0];}
async function form(o,cookie,account='account-11',resident='resident-A',id='case-01'){
 const html=await(await fetch(o+'/confirm?accountRef='+account+'&residentRef='+resident,{headers:{cookie}})).text();
 const token=html.match(/name="token" value="([^"]+)"/)[1];return new URLSearchParams({caseId:id,accountRef:account,residentRef:resident,action:'close',token});
}
const state=(o,value)=>fetch(o+'/__control/state',{method:'POST',body:JSON.stringify(value)});
test('未开始本地会话时只有登录入口',async t=>{const o=await setup(t);assert.match(await(await fetch(o+'/')).text(),/开始本地会话/);});
test('重复处置只有一个回执且不同账号冲突',async t=>{const o=await setup(t),cookie=await login(o),data=await form(o,cookie);for(let i=0;i<2;i++)assert.equal((await fetch(o+'/close',{method:'POST',headers:{cookie},body:data,redirect:'manual'})).status,303);const other=await form(o,cookie,'account-22','resident-B');assert.equal((await fetch(o+'/close',{method:'POST',headers:{cookie},body:other,redirect:'manual'})).status,409);const l=await(await fetch(o+'/__control/ledger')).json();assert.equal(l.receipts.length,1);assert.equal(l.attempts.length,3);});
test('令牌刷新使旧表单失效',async t=>{const o=await setup(t),cookie=await login(o),data=await form(o,cookie);await fetch(o+'/__control/rotate',{method:'POST'});assert.equal((await fetch(o+'/close',{method:'POST',headers:{cookie},body:data,redirect:'manual'})).status,409);});
test('已受理可以丢失响应且暂不公开回执',async t=>{const o=await setup(t),cookie=await login(o),data=await form(o,cookie);await state(o,{dropAfterCommit:true,hideReceipts:true});await assert.rejects(fetch(o+'/close',{method:'POST',headers:{cookie},body:data}));assert.match(await(await fetch(o+'/receipts?caseId=case-01',{headers:{cookie}})).text(),/暂未查到回执/);const l=await(await fetch(o+'/__control/ledger')).json();assert.equal(l.receipts.length,1);await state(o,{hideReceipts:false});assert.match(await(await fetch(o+'/receipts?caseId=case-01',{headers:{cookie}})).text(),/data-receipt-id=/);});
test('门户重启后读取自己的回执账本',async()=>{const dir=await mkdtemp(join(tmpdir(),'portal-'));let p;try{p=await createPortal({ledgerPath:join(dir,'receipts.jsonl')});let o=await p.listen();const cookie=await login(o);const data=await form(o,cookie);await fetch(o+'/close',{method:'POST',headers:{cookie},body:data});await p.close();p=await createPortal({ledgerPath:join(dir,'receipts.jsonl')});o=await p.listen();assert.equal((await(await fetch(o+'/__control/ledger')).json()).receipts.length,1);}finally{if(p)await p.close();await rm(dir,{recursive:true,force:true});}});
