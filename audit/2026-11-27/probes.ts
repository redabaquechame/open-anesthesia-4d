// Audit-only adversarial probes. They deliberately expose limitations; they do not certify clinical accuracy.
import { readFileSync, writeFileSync } from 'node:fs';
import { CircuitLungKernel, type MachineAndPatientParams } from '../../src/physics/circuitLungKernel';
import { CLAIMS, statusCounts } from '../../src/standards/claimRegistry';
import { EVIDENCE_REGISTRY } from '../../src/evidence/evidenceRegistry';
import { OFFICIAL_RESOURCES } from '../../src/standards/officialResources';
import { ARREST } from '../../src/modules/m9-crisis/protocols/arrest';
import { MH } from '../../src/modules/m9-crisis/protocols/mh';
import { startRun, doAction, stepRun, buildDebrief } from '../../src/modules/m9-crisis/crisisEngine';
import { SCORES } from '../../src/modules/m10-preop/preopScores';
import { scoreTotal, bandForPicks } from '../../src/modules/m10-preop/preopMath';
import * as D from '../../src/modules/m8-bronchoscopy-dlt/dltModel';
import { computePropofolPk, SYNTHETIC_AVATARS, ThreeCompartmentEngine, synthesizeEegSpectrum } from '../../src/physics/aivocEegKernel';

const base: MachineAndPatientParams = {
  driveType:'ascending_bellows',ventMode:'VCV',o2Source:'pipeline',fgfO2Lpm:1,fgfAirLpm:1,fgfN2OLpm:0,
  vaporizerDialPct:2,vtMl:480,rrBpm:12,ieExpiratoryPart:2,peepSetCmH2O:5,pcvPinspCmH2O:8,aplCmH2O:10,
  resistanceCmH2OPerLps:5,complianceMlPerCmH2O:60,bronchospasmHeterogeneity:0,metabolicVO2MlMin:250,metabolicVCO2MlMin:200,
  faults:{stuckInspiratoryValve:false,stuckExpiratoryValve:false,exhaustedSodaLime:false,circuitDisconnect:false,bellowsLeak:false,samplingLineLeak:false,curareCleft:false,scavengingObstruction:false,wallO2Failure:false,o2FlushActive:false}
};
function run(p:MachineAndPatientParams, sec=120, dt=0.02) { const k=new CircuitLungKernel(); let s; for(let i=0;i<Math.round(sec/dt);i++) s=k.step(p,dt); return s!; }
const findings: unknown[]=[];
const record=(id:string, observation:unknown)=>findings.push({id,observation});
const pure=run({...base,fgfO2Lpm:6,fgfAirLpm:0,vaporizerDialPct:8},1800);
record('gas-fractions-exceed-100',{o2:pure.circuitFiO2Pct,argon:pure.circuitArgonPct,agent:pure.circuitAgentPct,total:pure.circuitFiO2Pct+pure.circuitArgonPct+pure.circuitAgentPct});
const zero=run({...base,driveType:'piston_fgd',fgfO2Lpm:0,fgfAirLpm:0},1800);
record('zero-fresh-gas-piston-30-min',{deliveredVtMl:zero.deliveredVtMl,fiO2:zero.circuitFiO2Pct,bagFill:zero.bagFillNorm,alarms:zero.alarms});
for(const ventMode of ['VCV','PCV'] as const){
  const p={...base,ventMode}; const a=run(p); const b=run({...p,faults:{...base.faults,bellowsLeak:true}});
  record(`bellows-leak-${ventMode}`,{normalVt:a.deliveredVtMl,leakVt:b.deliveredVtMl,normalPressure:a.pawCmH2O,leakPressure:b.pawCmH2O});
}
const normal=run(base);
for(const key of ['stuckInspiratoryValve','stuckExpiratoryValve','curareCleft'] as const){
  const bad=run({...base,faults:{...base.faults,[key]:true}});
  record(`fault-mechanics-${key}`,{normalVt:normal.deliveredVtMl,faultVt:bad.deliveredVtMl,normalFlow:normal.flowLps,faultFlow:bad.flowLps,normalPaw:normal.pawCmH2O,faultPaw:bad.pawCmH2O});
}
let rapid=startRun(ARREST);
for(const id of ['pads','cpr','shock','shock','shock']) rapid=doAction(ARREST,rapid,id);
rapid=stepRun(ARREST,rapid,0.5,80);
record('rapid-shocks-ROSC',{time:rapid.tSec,rhythm:rapid.vitals.rhythm,log:rapid.log,debrief:buildDebrief(ARREST,rapid)});
let reversed=startRun(ARREST);
for(const a of [...ARREST.actions.filter(a=>a.critical)].reverse()) reversed=doAction(ARREST,reversed,a.id);
record('reverse-order-same-time-score',buildDebrief(ARREST,reversed));
let one=startRun(MH); one=doAction(MH,one,'dantrolene'); for(let i=0;i<360;i++)one=stepRun(MH,one,0.5,70);
record('mh-dantrolene-only',{time:one.tSec,vitals:one.vitals,missed:buildDebrief(MH,one).criticalMissed});
let clean=startRun(ARREST), harmful=startRun(ARREST);
for(const d of ARREST.distractors)harmful=doAction(ARREST,harmful,d.id);
for(let i=0;i<120;i++){clean=stepRun(ARREST,clean,0.5,80);harmful=stepRun(ARREST,harmful,0.5,80);}
record('distractors-no-physiology-effect',{identical:JSON.stringify(clean.vitals)===JSON.stringify(harmful.vitals),clean:clean.vitals,harmful:harmful.vitals});
record('unanswered-risk-scores',SCORES.map(s=>({id:s.id,total:scoreTotal(s,undefined),band:bandForPicks(s,undefined)})));
const map=JSON.parse(readFileSync('public/models/anatomy/airway-map.json','utf8'));
const sum=Object.values(map.lobeHullVolume).reduce((a:number,b:any)=>a+b,0);
const shares=Object.fromEntries(Object.entries(map.lobeHullVolume).map(([k,v])=>[k,(v as number)/sum])) as any;
const inp:D.DltInputs={anatomy:'male',heightCm:170,size:37,depthCm:29,side:'left',lateral:false,migrationMm:6.3,upSide:'right',bronchialCuffMl:1.5,clamp:'none',vtMl:450,rr:12,peep:5,fio2:1,hpv:0.5};
record('dlt-ventilation-gas-decoupling',[{rr:4,vtMl:150},{rr:12,vtMl:450},{rr:30,vtMl:900}].map(p=>{const out=D.evaluateDlt({...inp,...p},map,shares);return {...p,gas:out.gas,delivered:out.mech.deliveredVt};}));
const pk=computePropofolPk('eleveld',SYNTHETIC_AVATARS[0]); const eng=new ThreeCompartmentEngine();let st;for(let i=0;i<3000;i++)st=eng.stepTci(pk,6,0.004);
const eeg=synthesizeEegSpectrum({propofolCe:st!.ce,ce50:pk.ce50,ageYears:35,nmbParalyzedAwakeTrap:false,untreatedPain:false,bis2HzFilterOn:false,timeSec:10});
record('m4-two-different-BIS-models',{ce:st!.ce,pkPredictedBis:st!.predictedBis,eegDisplayedRawBis:eeg.displayedBisLag,suppression:eeg.suppressionRatioPct});
record('registry',{total:CLAIMS.length,statuses:statusCounts(CLAIMS),namedReviewers:CLAIMS.filter(c=>c.reviewedBy).length,evidence:EVIDENCE_REGISTRY.length,resources:OFFICIAL_RESOURCES.length,byModule:Object.fromEntries([...new Set(CLAIMS.map(c=>c.module))].map(m=>[m,statusCounts(CLAIMS.filter(c=>c.module===m))]))});
const out={warning:'Audit probes expose model behavior, not clinical validation.',findings};
writeFileSync('audit/2026-11-27/probe-results.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(out,null,2));
