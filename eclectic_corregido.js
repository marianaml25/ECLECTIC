/**
 * ECLECTIC CORREGIDO:
 * • Toma el mejor score de cada hoyo a partir de TODAS las rondas en "Semanas"
 * • Mantiene el valor mínimo que ya exista en ECLEC (nunca lo empeora)
 * • Si no existe score previo, usa el mejor encontrado de todas las partidas
 * • Añade GHIN nuevas, actualiza OUT/IN/TOTAL y colorea los scores
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
  
  // Buscar columna de tipo de partida (P1, P2, etc.)
  const colTIPO_S = hS.indexOf('TIPO') !== -1 ? hS.indexOf('TIPO') : 
                   hS.indexOf('PARTIDA') !== -1 ? hS.indexOf('PARTIDA') : -1;

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

  /*─── MEJOR SCORE EN SEMANAS (TODAS LAS PARTIDAS) ───*/
  const best={}, names={};
  dS.slice(1).forEach(r=>{
    const g=r[colGHIN_S]; 
    if(!partOK[g]) return;
    
    // PROCESAR TODAS LAS PARTIDAS (no solo P1)
    if(!best[g]) best[g]=Array(18).fill(null);
    if(colNAME_S!==-1) names[g]=r[colNAME_S];
    
    idxS.forEach((c,i)=>{
      const v=Number(r[c]);
      if(Number.isFinite(v) && (best[g][i]===null || v<best[g][i])) {
        best[g][i]=v;
      }
    });
  });

  /*─── MAPA FILA ACTUAL EN ECLEC ───*/
  const filaE={};
  dE.slice(1).forEach((r,i)=>{ const g=r[colGHIN_E]; if(g) filaE[g]=i+2; });

  /*─── ESCRIBIR/ACTUALIZAR ───*/
  const nCols=hE.length;
  let nuevas=0, upds=0, mejoras=0;

  Object.keys(best).forEach(g=>{
    const scores=best[g];
    let fila, row;

    if(filaE[g]){            // existe -> leer
      fila=filaE[g];
      row=shE.getRange(fila,1,1,nCols).getValues()[0];
      upds++;
    }else{                   // nueva
      row=Array(nCols).fill('');
      row[colGHIN_E]=g;
      shE.appendRow(row);
      fila=shE.getLastRow();
      nuevas++;
    }

    /*── NOMBRE ─*/
    if(colNAME_E!==-1 && names[g]) row[colNAME_E]=names[g];

    /*── HOYOS (LÓGICA MEJORADA) ─*/
    idxE.forEach((c,i)=>{
      const prev=Number(row[c]);
      const newV=scores[i];
      
      // Si no hay valor previo, usar el mejor encontrado (score más bajo)
      if(!Number.isFinite(prev) && Number.isFinite(newV)) {
        row[c]=newV;
        mejoras++;
      }
      // Si hay valor previo, solo actualizar si el nuevo es mejor (más bajo)
      else if(Number.isFinite(prev) && Number.isFinite(newV) && newV<prev) {
        row[c]=newV;
        mejoras++;
      }
      // Si no hay nuevo valor pero hay previo, mantener el previo
      else if(Number.isFinite(prev) && !Number.isFinite(newV)) {
        // Mantener valor existente
      }
    });

    /*── OUT / IN / TOTAL ─*/
    const getNum=v=>Number.isFinite(Number(v)) ? Number(v) : 0;
    const out=idxE.slice(0,9).reduce((t,c)=>t+getNum(row[c]),0);
    const inn=idxE.slice(9  ).reduce((t,c)=>t+getNum(row[c]),0);
    row[COL_OUT  ]=out;
    row[COL_IN   ]=inn;
    row[COL_TOTAL]=out+inn;

    /*── CATEGORÍA ─*/
    row[COL_CAT ]=infoCat[g]?.cat    || '';
    row[COL_CATN]=infoCat[g]?.catNum || '';

    /*── VOLCAR FILA ─*/
    shE.getRange(fila,1,1,nCols).setValues([row]);
  });

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
    '\nActualizadas: ' + upds +
    '\nMejoras: ' + mejoras
  );
}

/**
 * FUNCIÓN DE DIAGNÓSTICO - Para verificar qué está pasando
 */
function diagnosticarEclec() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const shS = ss.getSheetByName('Semanas');
  const shT = ss.getSheetByName('TRIMESTRE_PARTICIPANTES');
  
  if (!shS || !shT) {
    SpreadsheetApp.getUi().alert('⚠️ Falta alguna hoja requerida.');
    return;
  }
  
  const dS = shS.getDataRange().getValues();
  const dT = shT.getDataRange().getValues();
  const hS = dS[0], hT = dT[0];
  
  // Buscar columnas
  const colGHIN_S = hS.indexOf('GHIN #') !== -1 ? hS.indexOf('GHIN #') : hS.indexOf('GHIN#');
  const colGHIN_T = hT.indexOf('GHIN #') !== -1 ? hT.indexOf('GHIN #') : hT.indexOf('GHIN#');
  const colTRIM_T = hT.indexOf('TRIMESTRE');
  const colTIPO_S = hS.indexOf('TIPO') !== -1 ? hS.indexOf('TIPO') : 
                   hS.indexOf('PARTIDA') !== -1 ? hS.indexOf('PARTIDA') : -1;
  
  console.log('Columnas encontradas:');
  console.log('GHIN Semanas:', colGHIN_S);
  console.log('GHIN Trimestre:', colGHIN_T);
  console.log('TRIMESTRE:', colTRIM_T);
  console.log('TIPO:', colTIPO_S);
  
  // Participantes activos
  const partOK = {};
  dT.slice(1).forEach(r => {
    if ((r[colTRIM_T]||'').toString().trim().toUpperCase() === 'SI') {
      partOK[r[colGHIN_T]] = true;
    }
  });
  
  console.log('Participantes activos:', Object.keys(partOK).length);
  
  // Contar todas las partidas
  let totalPartidas = 0;
  dS.slice(1).forEach(r => {
    const g = r[colGHIN_S];
    if (partOK[g]) {
      totalPartidas++;
    }
  });
  
  console.log('Total partidas encontradas:', totalPartidas);
  
  SpreadsheetApp.getUi().alert(
    '🔍 DIAGNÓSTICO:\n' +
    'Participantes activos: ' + Object.keys(partOK).length +
    '\nTotal partidas: ' + totalPartidas +
    '\nRevisa la consola para más detalles.'
  );
} 