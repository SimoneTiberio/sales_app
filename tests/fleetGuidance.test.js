import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {catalog,workloads} from '../src/catalog.js';
import {defaults} from '../src/engine.js';
import {getFleetGuidance} from '../src/fleetGuidance.js';
test('all six workloads carry original storage guidance',()=>{
 for(const workload of Object.keys(workloads)) {const g=getFleetGuidance({...defaults,workload});assert.ok(g.storage.vendors);assert.ok(g.storage.reason);assert.ok(g.storage.considerations);}
});
test('guidance scopes platforms without changing customer inputs',()=>{
 const input={...defaults,vendor:'AMD',workload:'hpc'};const before=structuredClone(input);
 assert.deepEqual(getFleetGuidance(input).platforms.map(p=>p.id),['mi325x','mi355x']);assert.deepEqual(input,before);
 assert.equal(getFleetGuidance({...defaults,workload:'digitalTwin'}).warnings.length,1);
});
test('catalog preserves all eight source rows and storage text',()=>{
 const source=JSON.parse(fs.readFileSync('source-table.json','utf8').replace(/^\uFEFF/,''));assert.equal(catalog.platforms.length,8);
 for(const p of catalog.platforms){const row=Number(p.source.range.match(/A(\d+)/)[1]);const c=source[0].rows.find(x=>x.row===row).cells;
 assert.equal(p.power.description,c['K'+row]);assert.equal(p.power.source.range,`K${row}`);
 for(const [field,col] of Object.entries({name:'B',memory:'C',configuration:'D',cooling:'E',scalableUnit:'F',storage:'H',network:'I',considerations:'J'})) assert.equal(p[field],c[col+row]);}
 for(const s of Object.values(catalog.storage)){const row=Number(s.source.range.match(/A(\d+)/)[1]);const c=source[1].rows.find(x=>x.row===row).cells;assert.equal(s.vendors,c['B'+row]);assert.equal(s.reason,c['C'+row]);assert.equal(s.considerations,c['D'+row]);}
});
