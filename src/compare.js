// Comparison uses one security per column and only real manual broker observations.
import {calculateYield} from './yield.js';
export function compareBonds(selected, observations, buyDate) {
 if(!Array.isArray(selected)||selected.length<2||selected.length>3||new Set(selected.map(b=>b.id)).size!==selected.length) throw Error('Обери 2 або 3 різні ISIN');
 if(new Set(selected.map(b=>b.currency)).size!==1)throw Error('Для зіставлення сум обери ОВДП однієї валюти');
 return selected.map(b=>{
  const future=(b.payments||[]).filter(p=>p.date>buyDate&&['Купон','Погашення'].includes(p.type));
  const coupons=future.filter(p=>p.type==='Купон').reduce((s,p)=>s+Number(p.amount),0);
  const redemption=future.filter(p=>p.type==='Погашення').reduce((s,p)=>s+Number(p.amount),0);
  const quote=[...observations].filter(p=>p.isin===b.id&&Number(p.price)>0&&p.at?.slice(0,10)<=buyDate).sort((a,z)=>z.at.localeCompare(a.at))[0]||null;
  let ytm=null, yieldError=null;
  if(quote){try{ytm=calculateYield({bond:b,price:quote.price,buyDate}).ytm}catch(e){yieldError=e.message}}
  return {id:b.id,currency:b.currency,nominal:b.nominal,rate:b.rate,maturity:b.maturity,days:Math.round((Date.parse(b.maturity+'T12:00:00Z')-Date.parse(buyDate+'T12:00:00Z'))/86400000),coupons,redemption,total:coupons+redemption,quote,ytm,yieldError};
 });
}
