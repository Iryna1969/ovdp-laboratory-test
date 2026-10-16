// Adapter for the NBU Depository REST API (Instr_API_depo_securities.pdf).
// All dates normalized to YYYY-MM-DD; amounts refer to ONE security.
export function dateISO(value) {
  if (value == null) return '';
  const s = String(value).trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) { m = /^(\d{2})\.(\d{2})\.(\d{4})/.exec(s); if (m) return `${m[3]}-${m[2]}-${m[1]}`; }
  if (!m) { m = /^(\d{4})(\d{2})(\d{2})$/.exec(s); }
  return m ? `${m[1]}-${m[2]}-${m[3]}` : '';
}
const number = v => v === null || v === undefined || v === '' ? null : Number(String(v).replace(',','.'));
const validDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T12:00:00Z`));
export function normalizeNbu(data) {
  if (!Array.isArray(data) || !data.length) throw Error('НБУ: порожній або некоректний список');
  const result = [];
  for (const x of data) {
    if (x.cptype !== 'DCP') continue; // Internal government bonds, not local/external securities.
    const id = String(x.cpcode || '').trim();
    const maturity = dateISO(x.pgs_date);
    const nominal = number(x.nominal);
    if (!/^UA\d{10}$/.test(id) || !validDate(maturity) || !(nominal > 0)) throw Error(`НБУ: неповний паспорт ${id || 'без ISIN'}`);
    if (!Array.isArray(x.payments)) throw Error(`НБУ: відсутній графік виплат ${id}`);
    const payments = x.payments.map(p => {
      const date = dateISO(p.pay_date);
      const type = String(p.pay_type);
      const amount = number(p.pay_val);
      if (!validDate(date) || !['1','2','3'].includes(type) || amount === null || !Number.isFinite(amount) || amount < 0)
        throw Error(`НБУ: некоректна виплата ${id}`);
      return {date, type: type === '1' ? 'Купон' : 'Погашення', amount: type === '2' ? nominal : amount, sourceType:type};
    });
    // Some feeds may omit redemption from payments. Use the known nominal only in that case.
    if (!payments.some(p=>p.type==='Погашення')) payments.push({date:maturity,type:'Погашення',amount:nominal,sourceType:'derived'});
    const rate = number(x.auk_proc);
    result.push({id, issuer:x.emit_name||'', currency:x.val_code||'', nominal,
      rate:Number.isFinite(rate)?rate:null, maturity, issueDate:dateISO(x.razm_date),
      payPeriod:number(x.pay_period), type:x.cptype, description:x.cpdescr||'',
      payments:payments.sort((a,b)=>a.date.localeCompare(b.date)), raw:x});
  }
  if (!result.length) throw Error('НБУ: жодної державної ОВДП (DCP)');
  if (new Set(result.map(x=>x.id)).size !== result.length) throw Error('НБУ: повторні ISIN');
  return result;
}
