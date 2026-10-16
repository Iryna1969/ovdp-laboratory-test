// Effective annualized yield to maturity (XIRR-style, ACT/365), one buy and dated cash flows.
// Broker price is FULL dirty price per security; accrued interest is already included.
const validDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s+'T12:00:00Z'));
const days = (a,b) => (Date.parse(b+'T12:00:00Z')-Date.parse(a+'T12:00:00Z'))/86400000;
export function calculateYield({bond,price,quantity=1,commission=0,buyDate}) {
  if(!bond || !validDate(buyDate) || !validDate(bond.maturity))throw Error('Перевір дату купівлі та паспорт ISIN');
  price=Number(price);quantity=Number(quantity);commission=Number(commission);
  if(!(price>0)||!Number.isInteger(quantity)||quantity<1||!Number.isFinite(commission)||commission<0)throw Error('Некоректна ціна, кількість або комісія');
  if(buyDate>=bond.maturity)throw Error('Дата купівлі має передувати погашенню');
  const flows=(bond.payments||[]).filter(p=>p.date>buyDate&&['Купон','Погашення'].includes(p.type)).map(p=>({date:p.date,type:p.type,perBond:Number(p.amount),total:Number(p.amount)*quantity})).sort((a,b)=>a.date.localeCompare(b.date));
  if(!flows.length||flows.some(p=>!validDate(p.date)||!Number.isFinite(p.total)||p.total<0))throw Error('Немає коректного графіка майбутніх виплат');
  const cost=price*quantity+commission;const inflows=flows.reduce((s,f)=>s+f.total,0);const profit=inflows-cost;
  const npv=r=>-cost+flows.reduce((s,f)=>s+f.total/Math.pow(1+r,days(buyDate,f.date)/365),0);
  let lo=-0.999999999,hi=1;
  while(npv(hi)>0&&hi<1e10)hi=hi*2+1;
  if(npv(hi)>0)throw Error('Дохідність поза діапазоном обчислення');
  for(let i=0;i<180;i++){const mid=(lo+hi)/2;if(npv(mid)>0)lo=mid;else hi=mid}
  return {cost,inflows,profit,ytm:(lo+hi)/2,flows,quantity,price,commission,buyDate};
}
