const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const page=body=>'<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>居民关联服务处置</title><body><h1>居民关联服务处置</h1>'+body+'</body></html>';
export const login=()=>page('<p>本地开发会话，不连接外部身份系统。</p><form action="/session" method="post"><button>开始本地会话</button></form>');
export const home=()=>page('<nav><a href="/lookup">查询账号</a> <a href="/receipts">查询回执</a></nav>');
export function lookup(rows,state,url){
 const resident=url.searchParams.get('residentRef')||'';
 const wanted=rows.filter(x=>x.residentRef===resident);
 if(state.duplicate&&wanted.length)wanted.push({...wanted[0]});
 const current=Number(url.searchParams.get('page')||1), shown=wanted.slice((current-1),current);
 const cards=shown.map(row=>{
  const actual=state.accountOverride||row.accountRef;
  const link='/confirm?residentRef='+encodeURIComponent(row.residentRef)+'&accountRef='+encodeURIComponent(actual);
  const content='<span>'+esc(row.name)+'</span><span>'+esc(row.masked)+'</span><span>'+esc(row.contact)+'</span><a href="'+esc(link)+'">处理关联服务</a>';
  return state.layout==='cards'?'<article aria-label="账号资料" data-account-ref="'+esc(actual)+'" data-resident-ref="'+esc(row.residentRef)+'">'+content+'</article>':'<tr data-account-ref="'+esc(actual)+'" data-resident-ref="'+esc(row.residentRef)+'"><td>'+content+'</td></tr>';
 }).join('');
 const results=state.layout==='cards'?'<section aria-label="账号列表">'+cards+'</section>':'<table aria-label="账号列表"><tbody>'+cards+'</tbody></table>';
 const next=current<wanted.length?'<a rel="next" href="/lookup?residentRef='+encodeURIComponent(resident)+'&page='+(current+1)+'">下一页</a>':'';
 const ui='<form method="get" action="/lookup"><label>居民编号<input name="residentRef" value="'+esc(resident)+'"></label><button>查找</button></form><p data-result-count="'+wanted.length+'">匹配 '+wanted.length+' 条</p>';
 if(!state.ready)return page(ui+'<p role="status">正在载入账号</p><script>const timer=setInterval(async()=>{const r=await fetch("/ready");const s=await r.json();if(s.ready){clearInterval(timer);location.reload();}},30);</script>');
 return page(ui+results+next);
}
export function confirmation(row,token,state){
 const extra=state.extraFields?'<label>补充联系地址<input name="extraAddress" required></label>':'';
 return page('<section aria-label="处置核对" data-account-ref="'+esc(row.accountRef)+'" data-resident-ref="'+esc(row.residentRef)+'" data-action="close" data-confirmation-token="'+esc(token)+'"><p>'+esc(row.masked)+'</p><p>关闭关联服务</p><form action="/close" method="post"><input type="hidden" name="accountRef" value="'+esc(row.accountRef)+'"><input type="hidden" name="residentRef" value="'+esc(row.residentRef)+'"><input type="hidden" name="token" value="'+esc(token)+'"><input type="hidden" name="action" value="close"><label>处置编号<input name="caseId" required></label>'+extra+'<button type="submit">确认关闭</button><button type="button" disabled>确认关闭</button></form></section>');
}
export function receiptPage(receipt,caseId){
 return page('<form action="/receipts"><label>处置编号<input name="caseId" value="'+esc(caseId||'')+'"></label><button>查询回执</button></form>'+(receipt?'<article aria-label="处置回执" data-case-id="'+esc(receipt.caseId)+'" data-account-ref="'+esc(receipt.accountRef)+'" data-action="'+esc(receipt.action)+'" data-receipt-id="'+esc(receipt.receiptId)+'"><p>已关闭</p><p>'+esc(receipt.receiptId)+'</p></article>':'<p role="status">暂未查到回执</p>'));
}
export const notice=message=>page('<p role="alert">'+esc(message)+'</p>');
