/**
 * ECLECTIC optimizado y ajustado:
 * • Toma el mejor score de cada hoyo a partir de todas las rondas en "Semanas".
 * • Mantiene el valor mínimo que ya exista en ECLEC (nunca lo empeora).
 * • Añade GHIN nuevas, actualiza OUT/IN/TOTAL y colorea los scores.
 * • Cuando una jugadora es nueva, pone los scores más bajos encontrados en cada hoyo.
 * • Si algún hoyo queda vacío, alerta con el GHIN, nombre y hoyos faltantes.
 */
function actualizarEclecTRIM() {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  const shS = ss.getSheetByName('Semanas');
  const shE = ss.getSheetByName('ECLEC');
  const shP = ss.getSheetByName('PAR CAMPO');
  const shT = ss.getSheetByName('TRIMESTRE_PARTICIPANTES');

  /*─── VALIDAR ───*/
  if (!shS || !shE || !shP || !shT) {
    SpreadsheetApp.getUi().alert('⚠️ Falta alguna hoja requerida.');
    return;
  }

  /*─── CONSTANTES (0-based) ───*/
  const COL_OUT   = 16;   // Q
  const COL_IN    = 26;   // S
  const COL_TOTAL = 27;   // AB
  const COL_CAT   = 31;   // AF
  const COL_CATN  = 32;   // AG

  /*─── CARGA MASIVA ───*/
  const dS = shS.getDataRange().getValues();
  const dE = shE.getDataRange().getValues();
  const dP = shP.getDataRange().getValues();
  const dT = shT.getDataRange().getValues();

  const hS = dS[0], hE = dE[0], hT = dT[0];

  /*─── POSICIONES CLAVE ───*/
  const colGHIN_S  = hS.indexOf('GHIN #')  !== -1 ? hS.indexOf('GHIN #')  : hS.indexOf('GHIN#');
  const colGHIN_E  = hE.indexOf('GHIN #')  !== -1 ? hE.indexOf('GHIN #')  : hE.indexOf('GHIN#');
  const colGHIN_T  = hT.indexOf('GHIN #')  !== -1 ? hT.indexOf('GHIN #')  : hT.indexOf('GHIN#');
  const colTRIM_T  = hT.indexOf('TRIMESTRE');
  const colNAME_S  = hS.indexOf('GOLFER NAME') !== -1 ? hS.indexOf('GOLFER NAME')
                                                      : hS.indexOf('Golfer Name');
  const colNAME_E  = hE.indexOf('GOLFER NAME') !== -1 ? hE.indexOf('GOLFER NAME')
                                                      : hE.indexOf('Golfer Name');
  const colCAT_T   = 4;  // E
  const colCATN_T  = 5;  // F

  if ([colGHIN_S, colGHIN_E, colGHIN_T, colTRIM_T].some(c=>c===-1)) {
    SpreadsheetApp.getUi().alert('⚠️ Faltan columnas GHIN o TRIMESTRE.');
    return;
  }

  /*─── PAR POR HOYO ───*/
  const parRow = dP[1] || [];
  const parIdx = dP[0].reduce((o, v, i) => { o[v] = i; return o; }, {}); // { '1':idx, … }
  const par = h => Number(parRow[parIdx[h]]);

  /*─── PARTICIPANTES TRIM ───*/
  const partOK={}, infoCat={};
  dT.slice(1).forEach(r=>{
    if ((r[colTRIM_T]||'').toString().trim().toUpperCase()==='SI'){
      const g=r[colGHIN_T];
      partOK[g]=true;
      infoCat[g]={cat:r[colCAT_T], catNum:r[colCATN_T]};
    }
  });

  /*─── ÍNDICES HOYOS ───*/
  const idxS=[], idxE=[], hList=[];
  for(let h=1;h<=18;h++){
    const is=hS.indexOf(String(h)), ie=hE.indexOf(String(h));
    if(is!==-1 && ie!==-1){
      idxS.push(is); idxE.push(ie); hList.push(h);
    }
  }

  /*─── MEJOR SCORE EN SEMANAS ───*/
  const best={}, names={};
  dS.slice(1).forEach(r=>{
    const g=r[colGHIN_S]; if(!partOK[g]) return;
    if(!best[g]) best[g]=Array(18).fill(null);
    if(colNAME_S!==-1) names[g]=r[colNAME_S];
    idxS.forEach((c,i)=>{
      const v=Number(r[c]);
      if(Number.isFinite(v) && (best[g][i]===null || v<best[g][i])) best[g][i]=v;
    });
  });

  /*─── MAPA FILA ACTUAL EN ECLEC ───*/
  const filaE={};
  dE.slice(1).forEach((r,i)=>{ const g=r[colGHIN_E]; if(g) filaE[g]=i+2; });

  /*─── ESCRIBIR/ACTUALIZAR ───*/
  const nCols = hE.length;
  let nuevas = 0, upds = 0;
  let alertas = [];

  Object.keys(best).forEach(g => {
    const scores = best[g];
    let fila, row;
    let hoyosVacios = [];

    if (filaE[g]) { // existe -> leer
      fila = filaE[g];
      row = shE.getRange(fila, 1, 1, nCols).getValues()[0];
      upds++;
    } else { // nueva
      row = Array(nCols).fill('');
      row[colGHIN_E] = g;
      // Poner los scores más bajos encontrados en cada hoyo
      idxE.forEach((c, i) => {
        if (Number.isFinite(scores[i])) {
          row[c] = scores[i];
        } else {
          hoyosVacios.push(hList[i]);
        }
      });
      shE.appendRow(row);
      fila = shE.getLastRow();
      nuevas++;
      if (hoyosVacios.length > 0) {
        alertas.push(`GHIN ${g} (${names[g] || ''}) sin score en hoyos: ${hoyosVacios.join(', ')}`);
      }
    }

    /*── NOMBRE ─*/
    if (colNAME_E !== -1 && names[g]) row[colNAME_E] = names[g];

    /*── HOYOS (mantener mínimo) ─*/
    idxE.forEach((c, i) => {
      const prev = Number(row[c]);
      const newV = scores[i];
      if (Number.isFinite(newV) && (!Number.isFinite(prev) || newV < prev)) {
        row[c] = newV;
      }
    });

    /*── OUT / IN / TOTAL ─*/
    const getNum = v => Number.isFinite(Number(v)) ? Number(v) : 0;
    const out = idxE.slice(0, 9).reduce((t, c) => t + getNum(row[c]), 0);
    const inn = idxE.slice(9).reduce((t, c) => t + getNum(row[c]), 0);
    row[COL_OUT] = out;
    row[COL_IN] = inn;
    row[COL_TOTAL] = out + inn;

    /*── CATEGORÍA ─*/
    row[COL_CAT] = infoCat[g]?.cat || '';
    row[COL_CATN] = infoCat[g]?.catNum || '';

    /*── VOLCAR FILA ─*/
    shE.getRange(fila, 1, 1, nCols).setValues([row]);
  });

  /*─── ALERTA DE HOYOS VACÍOS ───*/
  if (alertas.length > 0) {
    SpreadsheetApp.getUi().alert(
      '⚠️ Jugadoras nuevas con hoyos sin score:\n\n' + alertas.join('\n')
    );
  }

  /*─── COLOREO (matriz) ───*/
  const lastRow=shE.getLastRow();
  if(lastRow>1){
    const bg=shE.getRange(2,1,lastRow-1,nCols).getBackgrounds();
    for(let r=2;r<=lastRow;r++){
      idxE.forEach((c,i)=>{
        const s=Number(shE.getRange(r,c+1).getValue());
        const p=par(hList[i]);
        if(!Number.isFinite(s)||!Number.isFinite(p)) return;
        const d=s-p;
        bg[r-2][c]=
          d<=-3 ? '#00723E' :
          d===-2 ? '#00B050' :
          d===-1 ? '#92D050' :
          d=== 0 ? '#E7E6E6' :
          d=== 1 ? '#FFC000' :
          d=== 2 ? '#FF6666' : '#C00000';
      });
    }
    shE.getRange(2,1,lastRow-1,nCols).setBackgrounds(bg);
  }

  /*─── ORDENAR ───*/
  if(lastRow>1){
    shE.getRange(2,1,lastRow-1,nCols)
       .sort([{column:COL_CATN+1,ascending:true},
              {column:COL_TOTAL+1,ascending:true}]);
  }

  /*─── RESUMEN ───*/
  SpreadsheetApp.getUi().alert(
    '✅ ECLEC actualizado.\n' +
    'Jugadoras: ' + Object.keys(best).length +
    '\nNuevas: '   + nuevas +
    '\nActualizadas: ' + upds
  );
} 