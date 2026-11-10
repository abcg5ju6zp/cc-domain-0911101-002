import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { readFile, appendFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import * as views from './views.js';
const accounts=JSON.parse(await readFile(new URL('../fixtures/accounts.json',import.meta.url),'utf8'));
export async function createPortal({ledgerPath}={}){
 const state={layout:'table',ready:true,duplicate:false,extraFields:false,accountOverride:'',dropAfterCommit:false,hideReceipts:false};
 const sessions=new Map(),tokens=new Map(),ledger=new Map();let attempts=[];
 if(ledgerPath){await mkdir(dirname(ledgerPath),{recursive:true});try{for(const line of (await readFile(ledgerPath,'utf8')).split('\n').filter(Boolean)){const r=JSON.parse(line);ledger.set(r.caseId,r);}}catch(error){if(error.code!=='ENOENT')throw error;}}
 let writes=Promise.resolve();
 const save=fn=>{const result=writes.then(fn);writes=result.catch(()=>{});return result;};
 const html=(res,status,body,headers={})=>{res.writeHead(status,{'content-type':'text/html; charset=utf-8','cache-control':'no-store',...headers});res.end(body);};
 const json=(res,status,value)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(value));};
 const redirect=(res,path,headers={})=>{res.writeHead(303,{location:path,...headers});res.end();};
 const server=http.createServer(async(req,res)=>{
  try{
   const url=new URL(req.url,'http://localhost');
   let body='';if(req.method==='POST')for await(const part of req){body+=part;if(body.length>16384)throw new Error('请求过大');}
   if(url.pathname.startsWith('/__control/')){
    if(req.method==='GET'&&url.pathname==='/__control/ledger'){json(res,200,{receipts:[...ledger.values()],attempts});return;}
    if(req.method!=='POST'){json(res,405,{error:'控制需要 POST'});return;}
    const data=body?JSON.parse(body):{};
    if(url.pathname==='/__control/state'){for(const key of Object.keys(state))if(data[key]!==undefined)state[key]=data[key];json(res,200,state);return;}
    if(url.pathname==='/__control/rotate'){tokens.clear();json(res,200,{rotated:true});return;}
    if(url.pathname==='/__control/expire'){sessions.clear();tokens.clear();json(res,200,{expired:true});return;}
    json(res,404,{error:'控制地址不存在'});return;
   }
   if(url.pathname==='/session'&&req.method==='POST'){const id=randomUUID();sessions.set(id,true);redirect(res,'/',{'set-cookie':'portal_session='+id+'; HttpOnly; SameSite=Strict; Path=/'});return;}
   const session=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('portal_session='))?.slice(15);
   if(!session||!sessions.has(session)){html(res,200,views.login());return;}
   if(url.pathname==='/ready'){json(res,200,{ready:state.ready});return;}
   if(url.pathname==='/'){html(res,200,views.home());return;}
   if(url.pathname==='/lookup'){html(res,200,views.lookup(accounts,state,url));return;}
   if(url.pathname==='/confirm'){
    const accountRef=url.searchParams.get('accountRef'),residentRef=url.searchParams.get('residentRef');
    const row=accounts.find(x=>x.accountRef===accountRef&&x.residentRef===residentRef);
    if(!row){html(res,404,views.notice('账号归属无法核对'));return;}
    const key=session+':'+row.accountRef;let token=tokens.get(key);if(!token){token=randomUUID();tokens.set(key,token);}
    html(res,200,views.confirmation(row,token,state));return;
   }
   if(url.pathname==='/close'&&req.method==='POST'){
    const form=new URLSearchParams(body),caseId=form.get('caseId'),accountRef=form.get('accountRef'),residentRef=form.get('residentRef'),action=form.get('action');
    attempts.push({caseId,accountRef,action});
    if(!caseId||!/^case-[A-Za-z0-9-]+$/.test(caseId)||action!=='close'){html(res,400,views.notice('处置参数无效'));return;}
    if(!accounts.some(x=>x.accountRef===accountRef&&x.residentRef===residentRef)||tokens.get(session+':'+accountRef)!==form.get('token')){html(res,409,views.notice('确认信息已失效'));return;}
    const result=await save(async()=>{
     const existing=ledger.get(caseId);if(existing){return {receipt:existing,conflict:existing.accountRef!==accountRef||existing.residentRef!==residentRef||existing.action!==action};}
     const receipt={caseId,accountRef,residentRef,action,receiptId:'receipt-'+randomUUID(),status:'closed'};
     if(ledgerPath)await appendFile(ledgerPath,JSON.stringify(receipt)+'\n');ledger.set(caseId,receipt);return {receipt,conflict:false};
    });
    if(result.conflict){html(res,409,views.notice('处置编号已用于其他账号'));return;}
    if(state.dropAfterCommit){state.dropAfterCommit=false;req.socket.destroy();return;}
    redirect(res,'/receipts?caseId='+encodeURIComponent(caseId));return;
   }
   if(url.pathname==='/receipts'){const id=url.searchParams.get('caseId');html(res,200,views.receiptPage(state.hideReceipts?null:ledger.get(id),id));return;}
   html(res,404,views.notice('页面不存在'));
  }catch{if(!res.headersSent)html(res,400,views.notice('请求无法处理'));else res.end();}
 });
 return {server,async listen(){await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));return 'http://127.0.0.1:'+server.address().port;},async close(){await writes;server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}};
}
