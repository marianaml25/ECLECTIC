# ECLECTIC - Sistema de Golf Corregido

## ¿Qué hace ECLECTIC?

El sistema ECLECTIC toma los **mejores scores por hoyo** de cada jugadora a lo largo del trimestre, considerando **todas las partidas** y solo a las jugadoras activas en el trimestre.

### Funcionalidades:
1. ✅ Filtra jugadoras participantes del trimestre
2. ✅ Toma el menor score por hoyo para cada jugadora (de todas las partidas)
3. ✅ Suma el total de esos mejores hoyos
4. ✅ Resalta en colores los scores según su diferencia con el par
5. ✅ Agrega categoría y número de categoría
6. ✅ Ordena por categoría número y total

## Problemas Identificados en el Código Original

### ❌ Problema Principal:
- **Lógica de actualización confusa**
- No manejaba correctamente los casos donde no existían scores previos
- Falta de diagnóstico para problemas

### ❌ Problemas Secundarios:
- No validaba correctamente los scores existentes
- No había forma de verificar qué estaba pasando

## Soluciones Implementadas

### ✅ Procesamiento de Todas las Partidas:
```javascript
// PROCESAR TODAS LAS PARTIDAS (no solo P1)
if(!best[g]) best[g]=Array(18).fill(null);
if(colNAME_S!==-1) names[g]=r[colNAME_S];

idxS.forEach((c,i)=>{
  const v=Number(r[c]);
  if(Number.isFinite(v) && (best[g][i]===null || v<best[g][i])) {
    best[g][i]=v;
  }
});
```

### ✅ Lógica de Actualización Mejorada:
```javascript
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
```

### ✅ Función de Diagnóstico:
- Nueva función `diagnosticarEclec()` para verificar datos
- Muestra participantes activos y total de partidas encontradas
- Ayuda a identificar problemas de configuración

## Cómo Usar el Código Corregido

### 1. Ejecutar Diagnóstico (Recomendado):
```javascript
diagnosticarEclec()
```
Esto te dirá:
- Cuántos participantes activos hay
- Cuántas partidas totales se encontraron
- Si las columnas están correctamente configuradas

### 2. Ejecutar Actualización:
```javascript
actualizarEclecTRIM()
```

### 3. Verificar Resultados:
El sistema mostrará un resumen con:
- Jugadoras procesadas
- Nuevas jugadoras agregadas
- Jugadoras actualizadas
- Número de mejoras realizadas

## Estructura de Datos Requerida

### Hoja "Semanas":
- Columna `GHIN #` o `GHIN#`: Número de GHIN de la jugadora
- Columna `GOLFER NAME` o `Golfer Name`: Nombre de la jugadora
- Columnas `1` a `18`: Scores por hoyo

### Hoja "TRIMESTRE_PARTICIPANTES":
- Columna `GHIN #` o `GHIN#`: Número de GHIN
- Columna `TRIMESTRE`: "SI" para participantes activos
- Columna `E`: Categoría
- Columna `F`: Número de categoría

### Hoja "PAR CAMPO":
- Primera fila: Nombres de hoyos (1, 2, 3, ..., 18)
- Segunda fila: Par de cada hoyo

### Hoja "ECLEC":
- Columna `GHIN #` o `GHIN#`: Número de GHIN
- Columna `GOLFER NAME` o `Golfer Name`: Nombre
- Columnas `1` a `18`: Mejores scores por hoyo
- Columna `Q`: Total OUT
- Columna `S`: Total IN
- Columna `AB`: Total general
- Columna `AF`: Categoría
- Columna `AG`: Número de categoría

## Colores de Scores

- 🟢 **Verde oscuro** (`#00723E`): 3 o más bajo par
- 🟢 **Verde** (`#00B050`): 2 bajo par
- 🟢 **Verde claro** (`#92D050`): 1 bajo par
- ⚪ **Gris** (`#E7E6E6`): Par
- 🟡 **Amarillo** (`#FFC000`): 1 sobre par
- 🟠 **Naranja** (`#FF6666`): 2 sobre par
- 🔴 **Rojo** (`#C00000`): 3 o más sobre par

## Lógica de Actualización

### Para Jugadoras Nuevas:
- Si no existe score previo en ECLECTIC, usa el **score más bajo encontrado** de todas las partidas
- Esto garantiza que siempre tenga el mejor score disponible

### Para Jugadoras Existentes:
- Solo actualiza si encuentra un score **mejor** (más bajo) que el existente
- **Nunca empeora** un score que ya existe en ECLECTIC
- Mantiene el historial de mejores scores

## Troubleshooting

### Si no aparecen números:
1. Ejecuta `diagnosticarEclec()` primero
2. Verifica que los participantes tengan "SI" en la columna TRIMESTRE
3. Verifica que existan partidas en "Semanas" para esas jugadoras

### Si faltan jugadoras:
1. Verifica que estén marcadas como activas en "TRIMESTRE_PARTICIPANTES"
2. Verifica que tengan partidas en "Semanas"
3. Verifica que los números GHIN coincidan entre hojas

### Si los scores no se actualizan:
1. Verifica que los nuevos scores sean realmente mejores (menores)
2. El sistema nunca empeora un score existente
3. Solo actualiza si encuentra un score mejor en cualquier partida 