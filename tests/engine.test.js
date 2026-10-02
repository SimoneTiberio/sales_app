import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults,evaluate,validateStep} from '../src/engine.js';
import {catalog} from '../src/catalog.js';
// Preserve coverage for older/incomplete catalogs as well as the refreshed workbook.
const incompleteCatalog = structuredClone(catalog);
for (const p of incompleteCatalog.platforms) {
 if (p.unitType === 'server') p.power = {...p.power, basis:'gpu-only',unitKw:null,gpuWatts:['hgx-b200','mi325x'].includes(p.id)?1000:1400};
 if (p.id === 'mi455x') p.power = {...p.power,basis:'unknown',unitKw:null,gpuWatts:null};
}
const run = changes=>evaluate({...defaults,...changes},incompleteCatalog);
test('table platforms round to servers and racks without invented blocks or power',()=>{
 const r=run({}); assert.equal(r.matches.length,2);assert.equal(r.incomplete.length,2);
 const server=r.incomplete.find(x=>x.platform.id==='hgx-b200');
 assert.equal(server.units,250);assert.equal(server.provisionedGpus,2000);assert.equal(server.racks,null);assert.equal(server.facilityMw,null);
 const rack=r.matches.find(x=>x.platform.id==='gb200-nvl72');assert.equal(rack.units,28);assert.equal(rack.provisionedGpus,2016);assert.equal(rack.racks,28);
 assert.equal(run({gpuCount:9,gpuModel:'hgx-b200'}).incomplete[0].provisionedGpus,16);
});
test('workload qualification includes HPC and leaves Digital Twin unmatched',()=>{
 assert.deepEqual(run({vendor:'Any',workload:'hpc'}).incomplete.map(x=>x.platform.id),['mi325x','mi355x']);
 const r=run({vendor:'Any',workload:'digitalTwin'});assert.equal(r.matches.length,0);assert.ok(r.storage.vendors.includes('VAST'));
 assert.equal(run({workload:'mixed'}).incomplete.length,2);
});
test('network requirements are retained; unknown Helios network requires review',()=>{
 const r=run({speedGbps:800,protocol:'InfiniBand'});assert.deepEqual(r.matches.map(x=>x.platform.id),['gb300-nvl72']);
 assert.equal(run({vendor:'AMD',gpuModel:'mi355x',speedGbps:800,protocol:'RoCE'}).incomplete.length,1);
 const helios=run({vendor:'AMD',gpuModel:'mi455x',speedGbps:800}).incomplete[0];assert.equal(helios.networks.length,0);assert.ok(helios.reviews.some(x=>x.includes('cannot yet be verified')));
});
test('roadmap never acquires sizing and respects workload scope',()=>{
 const r=run({vendor:'AMD',gpuModel:'mi500x'});assert.equal(r.matches.length,0);assert.equal(r.pending.length,1);assert.equal(r.pending[0].units,undefined);
 assert.equal(run({vendor:'AMD',gpuModel:'mi500x',workload:'hpc'}).pending.length,0);
});
test('cooling excludes liquid racks from air-only facilities',()=>{
 assert.deepEqual(run({cooling:'air'}).incomplete.map(x=>x.platform.id),['hgx-b200','hgx-b300']);
 assert.equal(run({cooling:'liquid'}).matches.length,2);
});
test('OEM power and height drive packing, overhead and strict limits',()=>{
 const input={gpuModel:'hgx-b200',unitKw:10,serverU:8,rackKw:40};
 const r=run(input).matches[0];assert.equal(r.racks,63);assert.equal(r.computeMw,2.5);assert.ok(Math.abs(r.facilityMw-3.45)<1e-9);
 assert.equal(run({...input,maxMw:r.facilityMw}).matches.length,1);
 assert.equal(run({...input,maxMw:r.facilityMw-0.001}).matches.length,0);
 assert.equal(run({...input,maxRacks:62}).matches.length,0);
 assert.equal(run({...input,rackKw:9}).matches.length,0);
 assert.equal(run({...input,serverU:41}).matches.length,0);
 assert.equal(run({gpuModel:'gb200-nvl72',maxRacks:27}).matches.length,0);
});
test('unknown facility values remain null even with limits',()=>{
 const r=run({maxMw:1,maxRacks:1}).incomplete.find(x=>x.platform.id==='hgx-b200');assert.equal(r.facilityMw,null);assert.equal(r.racks,null);assert.ok(r.reviews.length);
});
test('invalid fields and wrong-vendor platforms are rejected at the owning step',()=>{
 for(const gpuCount of ['',0,-1,1.5,Infinity,NaN,'abc']) assert.ok(run({gpuCount}).errors.length);
 for(const maxMw of [0,-1,Infinity,' ']) assert.ok(run({maxMw}).errors.length);
 assert.ok(run({maxRacks:1.5}).errors.length);assert.ok(run({gpuModel:'mi355x'}).errors.length);
 assert.ok(run({unitKw:10}).errors.length);assert.ok(run({speedGbps:100}).errors.length);
 assert.equal(validateStep({...defaults,gpuCount:0},0).length,0);assert.ok(validateStep({...defaults,gpuCount:0},1).length);
});

test('rack reference ratings drive facility estimates and budget boundaries',()=>{
 for(const [gpuModel,kw] of [['gb200-nvl72',120],['gb300-nvl72',142]]) {
  const input={gpuModel,gpuCount:72,cooling:'liquid'};
  const r=run(input).matches[0];assert.equal(r.unitKw,kw);assert.equal(r.powerBasis,'rack-reference');assert.equal(r.gpuOnlyMw,null);
  assert.ok(Math.abs(r.facilityMw-kw/1000*1.15*1.2)<1e-12);
  assert.equal(run({...input,maxMw:r.facilityMw,rackKw:kw}).matches.length,1);
  assert.equal(run({...input,maxMw:r.facilityMw-0.0001}).matches.length,0);
  assert.equal(run({...input,rackKw:kw-1}).matches.length,0);
  const override=run({...input,unitKw:100}).matches[0];assert.equal(override.unitKw,100);assert.equal(override.powerBasis,'oem-input');
 }
});
test('GPU-only ratings are never used as full-server power',()=>{
 for(const [gpuModel,vendor,watts] of [['hgx-b200','NVIDIA',1000],['hgx-b300','NVIDIA',1400],['mi325x','AMD',1000],['mi355x','AMD',1400]]) {
  const r=run({gpuModel,vendor,gpuCount:9}).incomplete[0];assert.equal(r.gpuOnlyMw,16*watts/1000000);assert.equal(r.unitKw,null);assert.equal(r.facilityMw,null);assert.equal(r.powerBasis,'unknown');
 }
 const unknown=run({vendor:'AMD',gpuModel:'mi455x'}).incomplete[0];assert.equal(unknown.unitKw,null);assert.equal(unknown.gpuOnlyMw,null);
});

test('final configurations enforce power budgets and expose headroom',()=>{
 const r=run({maxMw:5});
 assert.deepEqual(r.matches.map(x=>x.platform.id),['gb200-nvl72']);
 assert.equal(r.incomplete.length,2);
 assert.ok(r.rejected.some(x=>x.platform.id==='gb300-nvl72' && x.powerStatus==='over-budget'));
 const match=r.matches[0];assert.ok(Math.abs(match.facilityMw-4.6368)<1e-10);assert.ok(Math.abs(match.powerHeadroomMw-0.3632)<1e-10);assert.equal(match.rackPeakKw,120);assert.equal(match.powerStatus,'within-budget');
 assert.equal(run({maxMw:1}).matches.length,0);
 assert.ok(run({}).matches.every(x=>x.powerStatus==='budget-not-provided'));
});
test('providing OEM specifications moves a platform into or out of final configurations',()=>{
 const input={gpuModel:'hgx-b200',maxMw:4,maxRacks:70};
 assert.equal(run(input).incomplete.length,1);
 assert.equal(run({...input,unitKw:10}).incomplete.length,1);
 const complete=run({...input,unitKw:10,serverU:8,rackKw:40});assert.equal(complete.matches.length,1);assert.equal(complete.incomplete.length,0);assert.equal(complete.matches[0].rackPeakKw,40);
 assert.equal(run({...input,unitKw:15,serverU:8,rackKw:60}).matches.length,0);
 const saved=JSON.parse(JSON.stringify(complete));assert.equal(saved.matches[0].powerStatus,'within-budget');assert.ok(saved.matches[0].powerHeadroomMw>0);
});


test('refreshed workbook server and rack ratings drive default sizing',()=>{
 const r=evaluate({...defaults,vendor:'Any'});
 assert.equal(r.matches.length,7);assert.equal(r.incomplete.length,0);assert.equal(r.pending.length,1);
 for(const [id,kw,basis] of [['hgx-b200',8,'server-reference'],['hgx-b300',11.2,'server-reference'],['mi325x',8,'server-reference'],['mi355x',11.2,'server-reference'],['gb200-nvl72',120,'rack-reference'],['gb300-nvl72',142,'rack-reference'],['mi455x',120,'rack-reference']]) {
  const p=r.matches.find(x=>x.platform.id===id);assert.equal(p.unitKw,kw);assert.equal(p.powerBasis,basis);assert.ok(Math.abs(p.facilityMw-p.units*kw/1000*1.15*1.2)<1e-10);
 }
 assert.equal(catalog.platforms.find(p=>p.id==='mi500x').power.unitKw,142);
 assert.equal(r.pending[0].units,undefined);
});
test('refreshed server ratings filter budgets and retain OEM overrides',()=>{
 const r=evaluate({...defaults,maxMw:3});assert.deepEqual(r.matches.map(x=>x.platform.id),['hgx-b200']);assert.equal(r.incomplete.length,0);assert.ok(Math.abs(r.matches[0].facilityMw-2.76)<1e-10);
 const override=evaluate({...defaults,gpuModel:'hgx-b200',unitKw:10,maxMw:3});assert.equal(override.matches.length,0);assert.equal(override.rejected[0].powerBasis,'oem-input');
 const packed=evaluate({...defaults,gpuModel:'hgx-b200',serverU:8,rackKw:32,maxRacks:63});assert.equal(packed.matches[0].racks,63);assert.equal(packed.matches[0].rackPeakKw,32);
});

test('power calculations reject overflow and underflow instead of exporting invalid matches',()=>{
 for(const unitKw of [1e308, Number.MIN_VALUE]) {
  const result=evaluate({...defaults,gpuModel:'hgx-b200',unitKw});
  assert.equal(result.errors.length,0, 'the input itself is finite and positive');
  assert.equal(result.matches.length,0);
  assert.equal(result.rejected.length,1);
  assert.match(result.rejected[0].reasons[0],/supported numeric range/);
  const exported=JSON.parse(JSON.stringify(result));
  assert.equal(exported.matches.length,0);
  assert.equal(exported.rejected[0].facilityMw,undefined);
 }
});
