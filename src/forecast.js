// All inputs are manually observed FULL prices. No claim to predict market movements.
export function couponDates(bond, fromDate) {
  return (bond?.payments||[]).filter(p=>p.type==='Купон'&&p.date>=fromDate&&Number(p.amount)>0).sort((a,b)=>a.date.localeCompare(b.date));
}
const dateOnly=s=>String(s||'').slice(0,10);
const deltaDays=(a,b)=>(Date.parse(dateOnly(b)+'T12:00:00Z')-Date.parse(dateOnly(a)+'T12:00:00Z'))/86400000;
export function nearestBeforeAfter(rows, couponDate, broker, maxDays=7) {
  const series=rows.filter(p=>p.broker===broker&&Number.isFinite(Number(p.price))&&Number(p.price)>0);
  const before=series.filter(p=>dateOnly(p.at)<couponDate&&deltaDays(p.at,couponDate)<=maxDays).sort((a,b)=>b.at.localeCompare(a.at))[0];
  const after=series.filter(p=>dateOnly(p.at)>couponDate&&deltaDays(couponDate,p.at)<=maxDays).sort((a,b)=>a.at.localeCompare(b.at))[0];
  return {before,after};
}
export function historicalPairs(bond, rows, broker, beforeDate, maxDays=7){
  return (bond?.payments||[]).filter(p=>p.type==='Купон'&&p.date<beforeDate&&Number(p.amount)>0).map(p=>{
    const {before,after}=nearestBeforeAfter(rows,p.date,broker,maxDays);
    if(!before||!after)return null;
    const expected=Number(before.price)-Number(p.amount);
    return {date:p.date,coupon:Number(p.amount),before,after,expected,residual:Number(after.price)-expected};
  }).filter(Boolean).sort((a,b)=>a.date.localeCompare(b.date));
}
export function scenarios({prePrice,coupon,optimisticAdjustment,baseAdjustment,pessimisticAdjustment}){
  prePrice=Number(prePrice);coupon=Number(coupon);
  if(!Number.isFinite(prePrice)||prePrice<=0||!Number.isFinite(coupon)||coupon<=0)throw Error('Потрібні коректні ціна до купона і сума купона');
  const base=prePrice-coupon;
  const parse=v=>v===''||v==null?null:Number(v);
  const adj=[optimisticAdjustment,baseAdjustment,pessimisticAdjustment].map(parse);
  if(adj.some(x=>x!==null&&!Number.isFinite(x)))throw Error('Некоректні сценарні поправки');
  const vals=adj.map(a=>a===null?null:base+a);
  if(vals.some(v=>v!==null&&v<=0))throw Error('Розрахована ціна має бути більшою за нуль');
  if(vals[0]!=null&&vals[1]!=null&&vals[0]<vals[1]||vals[1]!=null&&vals[2]!=null&&vals[1]<vals[2])throw Error('Оптимістичний сценарій має бути не нижчим за базовий, а песимістичний — не вищим');
  return {mechanical:base,optimistic:vals[0],base:vals[1],pessimistic:vals[2]};
}
