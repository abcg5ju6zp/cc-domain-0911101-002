import { createPortal } from './portal.js';
const portal=await createPortal({ledgerPath:process.env.PORTAL_LEDGER||'var/portal-ledger.jsonl'});console.log(JSON.stringify({origin:await portal.listen()}));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await portal.close();process.exit(0);});
