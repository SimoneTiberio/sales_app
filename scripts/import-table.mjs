import fs from 'node:fs';
const sheets = JSON.parse(fs.readFileSync('source-table.json','utf8').replace(/^\uFEFF/,''));
const keys = { Training:'training', Inference:'inference', 'Fine Tuning':'tuning', HPC:'hpc', 'Digital Twin':'digitalTwin', 'Mixed Workload':'mixed' };
const configs = [
 ['hgx-b200',8,'server',180,400,'oem'],['hgx-b300',8,'server',288,800,'oem'],
 ['gb200-nvl72',72,'rack',186,400,'liquid'],['gb300-nvl72',72,'rack',288,800,'liquid'],
 ['mi325x',8,'server',256,400,'oem'],['mi355x',8,'server',288,800,'oem'],
 ['mi455x',72,'rack',432,null,'liquid'],['mi500x',null,null,null,null,'unknown']
];
const platforms = sheets[0].rows.filter(r=>r.row>=2 && r.row<=9).map(({row,cells:c},i)=>{
 const [id,gpusPerUnit,unitType,memoryGbPerGpu,speed,coolingType]=configs[i];
 const description = c['K'+row];
 if (!description) throw new Error(`Missing power rating at GPU!K${row}`);
 const gpuMatch = description.match(/([\d,]+) W (?:peak board power |board power )?per GPU/);
 const rackMatch = description.match(/(\d+(?:\.\d+)?) kW per (?:NVL72 )?rack/i);
 const serverMatch = description.match(/(\d+(?:\.\d+)?) kW per server/i);
 const power = { description, basis: gpuMatch ? 'gpu-only' : rackMatch ? 'rack-reference' : serverMatch ? 'server-reference' : 'unknown', gpuWatts: gpuMatch ? Number(gpuMatch[1].replaceAll(',','')) : null, unitKw: rackMatch ? Number(rackMatch[1]) : serverMatch ? Number(serverMatch[1]) : null, source: {file:'sales table completed.xlsx',sheet:'GPU',range:`K${row}`} };
 return {id,vendor:c['A'+row].toUpperCase(),name:c['B'+row],memory:c['C'+row],configuration:c['D'+row],cooling:c['E'+row],scalableUnit:c['F'+row],workloads:i===7?['training','inference']:c['G'+row].split(';').map(x=>keys[x.trim()]),storage:c['H'+row],network:c['I'+row],considerations:c['J'+row],power,gpusPerUnit,unitType,memoryGbPerGpu,coolingType,status:i===7?'roadmap':'table-listed',networks:speed?['InfiniBand','RoCE'].map(protocol=>({protocol,speedGbps:speed})):[],source:{file:'sales table completed.xlsx',sheet:'GPU',range:`A${row}:K${row}`}};
});
const storage = Object.fromEntries(sheets[1].rows.filter(r=>r.row>=2 && r.row<=7).map(({row,cells:c})=>[keys[c['A'+row]],{vendors:c['B'+row],reason:c['C'+row],considerations:c['D'+row],source:{file:'sales table completed.xlsx',sheet:'Storage',range:`A${row}:D${row}`}}]));
fs.writeFileSync('catalog.example.json',JSON.stringify({version:'2026-09-27',source:'sales table completed.xlsx',qualification:'Transcribed from the supplied workbook; manufacturer claims have not been independently verified. Network and storage entries are recommendations requiring OEM/workload validation.',assumptions:{usableU:40,pue:1.2,ancillaryFraction:0.15,note:'App planning assumptions, not workbook specifications: 40U usable space, 15% ancillary IT allowance and PUE 1.20. Dedicated network/storage racks are excluded.'},platforms,storage},null,2)+'\n');
