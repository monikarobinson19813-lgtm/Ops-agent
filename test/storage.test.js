import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { LocalJsonStore } from '../src/storage/local-json-store.js';

const dir=path.resolve('.data/test-store');
fs.rmSync(dir,{recursive:true,force:true});

const store=new LocalJsonStore(dir);
store.saveApprovals([{approvalId:'APR-1',status:'PENDING'}]);
store.appendAudit({type:'APPROVAL_RECORDED',caseId:'OPS-1'});

assert.equal(store.listApprovals().length,1);
assert.equal(store.listAudit().length,1);

const store2=new LocalJsonStore(dir);
assert.equal(store2.listApprovals()[0].approvalId,'APR-1');

fs.rmSync(dir,{recursive:true,force:true});
console.log('storage tests passed');
