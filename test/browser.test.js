import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createPortal } from '../src/portal.js';
test('真实浏览器核对两种布局、刷新后确认与回执',async()=>{
 const portal=await createPortal();const origin=await portal.listen();const browser=await chromium.launch({headless:true,executablePath:chromium.executablePath(),args:['--no-sandbox']});
 try{
  const page=await browser.newPage();await page.goto(origin);await page.getByRole('button',{name:'开始本地会话'}).click();
  await page.getByRole('link',{name:'查询账号'}).click();await page.getByLabel('居民编号').fill('resident-A');await page.getByRole('button',{name:'查找',exact:true}).click();
  assert.equal(await page.locator('[data-account-ref="account-11"]').count(),1);
  await fetch(origin+'/__control/state',{method:'POST',body:JSON.stringify({layout:'cards'})});await page.reload();assert.equal(await page.getByRole('article',{name:'账号资料'}).count(),1);
  await page.getByRole('link',{name:'处理关联服务'}).click();const first=await page.locator('[data-confirmation-token]').getAttribute('data-confirmation-token');
  await fetch(origin+'/__control/rotate',{method:'POST'});await page.reload();assert.notEqual(await page.locator('[data-confirmation-token]').getAttribute('data-confirmation-token'),first);
  await page.getByLabel('处置编号').fill('case-browser');await page.locator('button[type="submit"]').click();
  assert.equal(await page.getByRole('article',{name:'处置回执'}).getAttribute('data-case-id'),'case-browser');
  const ledger=await(await fetch(origin+'/__control/ledger')).json();assert.equal(ledger.attempts.length,1);assert.equal(ledger.receipts.length,1);
 }finally{await browser.close();await portal.close();}
});
