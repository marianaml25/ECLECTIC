/**
 * ECLECTIC optimizado con PAR, colores según resultado y default 25 en nuevas jugadoras.
 */
function actualizarEclecTRIM() {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  const shS = ss.getSheetByName('Semanas');
  const shE = ss.getSheetByName('ECLEC');
  const shP = ss.getSheetByName('PAR CAMPO');
  const shT = ss.getSheetByName('TRIMESTRE_PARTICIPANTES');

  if (!shS || !shE || !shP || !shT) {
    SpreadsheetApp.getUi().alert('⚠️ Falta alguna hoja requerida.');
    return;
  }

  const COL_OUT = 16, COL_IN = 26, COL_TOTAL = 27, COL_CAT = 31, COL_CATN = 32;
  const dS = shS.getDataRange().getValues();
  const dE = shE.getDataRange().getValues();
  const dP = shP.getDataRange().getValues();
  const dT = shT.getDataRange().getValues();
  const hS = dS[0], hE = dE[0], hT = dT[0];

  const colGHIN_S  = hS.findIndex(v => v?.toString().toUpperCase().includes('GHIN'));
  const colGHIN_E  = hE.findIndex(v => v?.toString().toUpperCase().includes('GHIN'));
  const colGHIN_T  = hT.findIndex(v => v?.toString().toUpperCase().includes('GHIN'));
  const colTRIM_T  = hT.findIndex(v => v?.toString().toUpperCase().includes('TRIMESTRE'));
  const colNAME_S  = hS.findIndex(v => v?.toString().toUpperCase().includes('GOLFER'));
  const colNAME_E  = hE.findIndex(v => v?.toString().toUpperCase().includes('GOLFER'));
  const colCAT_T   = 4, colCATN_T = 5;

  if ([colGHIN_S, colGHIN_E, colGHIN_T, colTRIM_T].some(c => c === -1)) {
    SpreadsheetApp.getUi().alert('⚠️ Faltan columnas GHIN o TRIMESTRE.');
    return;
  }

  const parRow = dP[1] || [];
  const parIdx = dP[0].reduce((o, v, i) => { o[v] = i; return o; }, {});
  const par = h => Number(parRow[parIdx[h]]);

  const partOK={}, infoCat={};
  dT.slice(1).forEach(r => {
    if ((r[colTRIM_T]||'').toString().trim().toUpperCase()==='SI'){
      const g=r[colGHIN_T];
      partOK[g]=true;
      infoCat[g]={cat:r[colCAT_T], catNum:r[colCATN_T]};
    }
  });

  const idxS=[], idxE=[], hList=[];
  for (let h=1; h<=18; h++) {
    const hStr = String(h);
    const is = hS.findIndex(v => v && v.toString().replace(/\s+/g, '').endsWith(hStr));
    const ie = hE.findIndex(v => v && v.toString().replace(/\s+/g, '').endsWith(hStr));
    if (is !== -1 && ie !== -1) {
      idxS.push(is);
      idxE.push(ie);
      hList.push(h);
    } else {
      SpreadsheetApp.getUi().alert(`⚠️ Hoyo ${h} no encontrado en encabezados de Semanas o ECLEC.\nVerifica que coincidan.`);
      return;
    }
  }

  const best={}, names={};
  dS.slice(1).forEach(r => {
    const g=r[colGHIN_S]; if(!partOK[g]) return;
    if(!best[g]) best[g]=Array(18).fill(null);
    if(colNAME_S!==-1) names[g]=r[colNAME_S];
    idxS.forEach((c,i) => {
      const v = Number(r[c]);
      const hNum = hList[i], p = par(hNum);
      if (Number.isFinite(v) && Number.isFinite(p)) {
        const relV = v-p;
        const prevV=best[g][i], relPrev=Number.isFinite(prevV)?prevV-p:null;
        if (prevV===null || relPrev===null || relV<relPrev) best[g][i]=v;
      }
    });
  });

  const filaE={};
  dE.slice(1).forEach((r,i)=>{ const g=r[colGHIN_E]; if(g) filaE[g]=i+2; });
  const nCols = hE.length;
  let nuevas=0, upds=0, alertas=[];

  Object.keys(best).forEach(g => {
    const scores=best[g]; let fila,row,hoyosVacios=[];
    if(filaE[g]){
      fila=filaE[g]; row=shE.getRange(fila,1,1,nCols).getValues()[0]; upds++;
    } else {
      row=Array(nCols).fill(''); row[colGHIN_E]=g;
      idxE.forEach((c,i)=>{
        if(Number.isFinite(scores[i])) {
          row[c]=scores[i];
        } else {
          row[c]=25; // Valor default en hoyos sin score
          hoyosVacios.push(hList[i]);
        }
      });
      shE.appendRow(row);
      fila=shE.getLastRow();
      nuevas++;
      if(hoyosVacios.length>0)alertas.push(`GHIN ${g} (${names[g]||''}) sin score en hoyos: ${hoyosVacios.join(', ')}`);
    }
    if (colNAME_E!==-1&&names[g]) row[colNAME_E]=names[g];
    idxE.forEach((c,i)=>{const prev=Number(row[c]),newV=scores[i],hNum=hList[i],p=par(hNum);if(Number.isFinite(newV)&&Number.isFinite(p)){const relNew=newV-p,relPrev=Number.isFinite(prev)?prev-p:null;if(!Number.isFinite(prev)||relNew<relPrev)row[c]=newV;}});
    const getNum=v=>Number.isFinite(Number(v))?Number(v):0;
    const out=idxE.slice(0,9).reduce((t,c)=>t+getNum(row[c]),0), inn=idxE.slice(9).reduce((t,c)=>t+getNum(row[c]),0);
    row[COL_OUT]=out; row[COL_IN]=inn; row[COL_TOTAL]=out+inn;
    row[COL_CAT]=infoCat[g]?.cat||''; row[COL_CATN]=infoCat[g]?.catNum||'';
    shE.getRange(fila,1,1,nCols).setValues([row]);
  });

  if(alertas.length>0)SpreadsheetApp.getUi().alert('⚠️ Jugadoras nuevas con hoyos sin score:\n\n'+alertas.join('\n'));

  const lastRow=shE.getLastRow();
  if(lastRow>1){
    const bg=shE.getRange(2,1,lastRow-1,nCols).getBackgrounds();
    for(let r=2;r<=lastRow;r++){
      idxE.forEach((c,i)=>{
        const s=Number(shE.getRange(r,c+1).getValue()), p=par(hList[i]);
        if(!Number.isFinite(s)||!Number.isFinite(p))return;
        const d=s-p;
        bg[r-2][c]=
          d<=-3 ? '#00723E' : // Albatros o mejor
          d===-2 ? '#00B050' : // Águila
          d===-1 ? '#92D050' : // Birdie
          d=== 0 ? '#E7E6E6' : // Par
          d=== 1 ? '#FFC000' : // Bogey
          d=== 2 ? '#FF6666' : // Doble bogey
                   '#C00000';  // Peor que doble bogey
      });
    }
    shE.getRange(2,1,lastRow-1,nCols).setBackgrounds(bg);
    shE.getRange(2,1,lastRow-1,nCols).sort([{column:COL_CATN+1,ascending:true},{column:COL_TOTAL+1,ascending:true}]);
  }

  SpreadsheetApp.getUi().alert(`✅ ECLEC actualizado.\nJugadoras: ${Object.keys(best).length}\nNuevas: ${nuevas}\nActualizadas: ${upds}`);
}
