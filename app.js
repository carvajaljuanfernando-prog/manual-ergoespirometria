/* =====================================================================
   MANUAL INTERACTIVO DE ERGOESPIROMETRÍA — v2.0
   Toda la lógica interactiva en un único archivo.
===================================================================== */

/* --------- 0. TEMA CLARO / OSCURO --------- */
(function initTheme() {
  const saved = localStorage.getItem('cpet-theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeButton(saved);
  document.getElementById('themeToggle').addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('cpet-theme', next);
    updateThemeButton(next);
    // Regenerar SVG del V-slope para que respete los colores del tema
    if (window._vslope) window._vslope.render();
    // Regenerar mini-gráficas del panel 9
    if (window._wasserman) window._wasserman.render();
    // Regenerar Atlas
    if (window._atlas) window._atlas.render();
  });
  function updateThemeButton(theme) {
    const icon = document.getElementById('themeIcon');
    const label = document.getElementById('themeLabel');
    if (theme === 'dark') { icon.textContent = '☀️'; label.textContent = 'CLARO'; }
    else { icon.textContent = '🌙'; label.textContent = 'OSCURO'; }
  }
})();

/* --------- 1. TOC ACTIVO POR SCROLL --------- */
(function initTOC() {
  const sections = document.querySelectorAll('main section');
  const tocLinks = document.querySelectorAll('.toc a');
  window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(sec => {
      const top = sec.offsetTop - 100;
      if (window.scrollY >= top) current = sec.id;
    });
    tocLinks.forEach(a => {
      a.classList.toggle('active', a.getAttribute('href') === '#' + current);
    });
  });
})();

/* --------- 2. CALCULADORA DE PENDIENTE DE RAMPA --------- */
(function initRampCalc() {
  const el = {
    sex: document.getElementById('rampSex'),
    age: document.getElementById('rampAge'),
    height: document.getElementById('rampHeight'),
    weight: document.getElementById('rampWeight'),
    fitness: document.getElementById('rampFitness'),
    value: document.getElementById('rampValue'),
    desc: document.getElementById('rampDesc'),
    vo2: document.getElementById('rampVO2')
  };
  function compute() {
    const sex = el.sex.value;
    const age = parseFloat(el.age.value) || 50;
    const height = parseFloat(el.height.value) || 170;
    const weight = parseFloat(el.weight.value) || 70;
    const fitness = el.fitness.value;
    // V̇O₂max predicho (Wasserman/Hansen simplificado)
    let vo2max;
    if (sex === 'M') {
      vo2max = ((height - age) * 20 + weight * 6) - 100;
    } else {
      vo2max = ((height - age) * 14 + weight * 9) - 100;
    }
    vo2max = Math.max(vo2max, 500);
    // Factor por estado funcional
    const factor = { sedentary: 0.60, moderate: 0.75, fit: 1.00, limited: 0.40 }[fitness];
    const vo2adjusted = vo2max * factor;
    // Estimar carga máxima en W (ACSM: 1W ≈ 10.3 mL/min V̇O₂ en cicloergómetro)
    const wattsMax = Math.max((vo2adjusted - 200) / 10.3, 30);
    // Rampa para 10 min: wattsMax / 10
    let ramp = wattsMax / 10;
    ramp = Math.round(ramp / 5) * 5;
    if (ramp < 5) ramp = 5;
    if (ramp > 30) ramp = 30;
    el.value.textContent = ramp;
    el.vo2.textContent = Math.round(vo2adjusted);
    const descs = {
      sedentary: 'Rampa lenta para sedentario o cardiópata leve. Adecuada para identificar AT precoz.',
      moderate: 'Rampa estándar para adulto con capacidad moderada. Duración objetivo: 10 min.',
      fit: 'Rampa rápida para adulto activo. Vigila que la duración no exceda 12 min.',
      limited: 'Rampa muy baja para paciente limitado. Considera protocolo escalonado si esta no permite 6 min de esfuerzo.'
    };
    el.desc.textContent = descs[fitness];
  }
  [el.sex, el.age, el.height, el.weight, el.fitness].forEach(x =>
    x.addEventListener('input', compute)
  );
  compute();
})();

/* --------- 2b. CALCULADORA DE RIESGO EN HAP (ESC/ERS 2022) --------- */
(function initPHRisk() {
  const vo2El = document.getElementById('phVO2');
  const vo2pctEl = document.getElementById('phVO2pct');
  const slopeEl = document.getElementById('phSlope');
  const levelEl = document.getElementById('phRiskLevel');
  const descEl = document.getElementById('phRiskDesc');
  const outputEl = document.getElementById('phRiskOutput');
  if (!vo2El) return;

  function compute() {
    const vo2 = parseFloat(vo2El.value) || 0;
    const vo2pct = parseFloat(vo2pctEl.value) || 0;
    const slope = parseFloat(slopeEl.value) || 0;

    // Criterios ESC/ERS 2022 (variables CPET dentro del panel de riesgo)
    // Bajo: V̇O₂ > 15 mL/kg/min (o >65% pred) Y slope < 36
    // Intermedio-bajo: V̇O₂ 11-15 O slope 36-44
    // Intermedio-alto: V̇O₂ 7-11 O slope 45-54
    // Alto: V̇O₂ < 7 O slope >= 55
    let riskLevel, riskLabel, riskColor, riskDesc;

    // Determinar peor de los dos parámetros
    let vo2Risk;
    if (vo2 > 15 || vo2pct > 65) vo2Risk = 1;
    else if (vo2 >= 11) vo2Risk = 2;
    else if (vo2 >= 7) vo2Risk = 3;
    else vo2Risk = 4;

    let slopeRisk;
    if (slope < 36) slopeRisk = 1;
    else if (slope < 45) slopeRisk = 2;
    else if (slope < 55) slopeRisk = 3;
    else slopeRisk = 4;

    riskLevel = Math.max(vo2Risk, slopeRisk);

    if (riskLevel === 1) {
      riskLabel = 'BAJO';
      riskColor = 'var(--success)';
      riskDesc = 'Perfil funcional favorable. V̇O₂ pico &gt;15 mL/kg/min y V̇E/V̇CO₂ slope &lt;36 apoyan estrato de riesgo bajo. La estratificación completa integra NYHA, 6MWD, BNP, PAD, IC y SvO₂.';
    } else if (riskLevel === 2) {
      riskLabel = 'INT. BAJO';
      riskColor = 'var(--warning)';
      riskDesc = 'Estrato intermedio-bajo por variables CPET. Reevaluación funcional a 3-6 meses tras optimización terapéutica. Considerar escalada de tratamiento si otras variables lo apoyan.';
    } else if (riskLevel === 3) {
      riskLabel = 'INT. ALTO';
      riskColor = 'var(--warning)';
      riskDesc = 'Estrato intermedio-alto. Terapia triple (endotelin + inhibidor PDE5 + prostanoide) recomendable si no está ya en curso. Reevaluación en 3 meses.';
    } else {
      riskLabel = 'ALTO';
      riskColor = 'var(--danger)';
      riskDesc = 'Perfil de alto riesgo funcional. V̇O₂ pico &lt;7 mL/kg/min o V̇E/V̇CO₂ slope ≥55. Considerar prostanoides parenterales (epoprostenol, treprostinil SC) y valoración para trasplante pulmonar.';
    }

    levelEl.innerHTML = riskLabel;
    levelEl.style.color = riskColor;
    descEl.innerHTML = riskDesc;
    outputEl.style.borderLeftColor = riskColor;
  }

  [vo2El, vo2pctEl, slopeEl].forEach(x => x.addEventListener('input', compute));
  compute();
})();

/* --------- 3. PANEL 9 WASSERMAN INTERACTIVO --------- */
(function initWasserman() {
  // Definición de los 9 paneles: título, eje X, eje Y, generador de curva por patrón
  const PANELS = [
    { n: 1, title: 'V̇E vs. tiempo', xlab: 't', ylab: 'V̇E' },
    { n: 2, title: 'FC · V̇O₂/FC vs. WR', xlab: 'WR', ylab: 'FC · O₂-pulse' },
    { n: 3, title: 'V̇O₂ · V̇CO₂ vs. WR', xlab: 'WR', ylab: 'V̇O₂' },
    { n: 4, title: 'V̇E vs. V̇CO₂', xlab: 'V̇CO₂', ylab: 'V̇E' },
    { n: 5, title: 'FC vs. V̇O₂', xlab: 'V̇O₂', ylab: 'FC' },
    { n: 6, title: 'V̇CO₂ vs. V̇O₂ (V-slope)', xlab: 'V̇O₂', ylab: 'V̇CO₂' },
    { n: 7, title: 'Vt vs. V̇E', xlab: 'V̇E', ylab: 'Vt' },
    { n: 8, title: 'V̇E/V̇O₂ · V̇E/V̇CO₂', xlab: 't', ylab: 'V̇E/gas' },
    { n: 9, title: 'PETO₂ · PETCO₂ vs. t', xlab: 't', ylab: 'PET' }
  ];

  // Patrones y sus modificadores (0 = normal, 1 = patológico)
  const PATTERNS = {
    normal: { label: 'Normal', slopeMod: 1.0, o2pulseMod: 1.0, veCo2Mod: 25, petCo2Mod: 40, satMod: 0.98 },
    deconditioning: { label: 'Desacondicionamiento', slopeMod: 0.6, o2pulseMod: 0.7, veCo2Mod: 26, petCo2Mod: 39, satMod: 0.98 },
    hf: { label: 'IC con FEr', slopeMod: 0.5, o2pulseMod: 0.5, veCo2Mod: 42, petCo2Mod: 34, satMod: 0.97, o2pulsePlateau: true, oscillation: true },
    ph: { label: 'HAP grupo 1', slopeMod: 0.55, o2pulseMod: 0.65, veCo2Mod: 48, petCo2Mod: 28, satMod: 0.90, dropSat: true, o2pulsePlateau: true },
    cteph: { label: 'HP tromboembólica (CTEPH)', slopeMod: 0.5, o2pulseMod: 0.6, veCo2Mod: 55, petCo2Mod: 26, satMod: 0.85, dropSat: true, o2pulsePlateau: true },
    exph: { label: 'HP del ejercicio', slopeMod: 0.75, o2pulseMod: 0.85, veCo2Mod: 34, petCo2Mod: 34, satMod: 0.96 },
    copd: { label: 'EPOC', slopeMod: 0.65, o2pulseMod: 0.75, veCo2Mod: 32, petCo2Mod: 42, satMod: 0.92, veLimit: true, dropSat: 0.5 },
    ild: { label: 'EPID', slopeMod: 0.65, o2pulseMod: 0.75, veCo2Mod: 40, petCo2Mod: 34, satMod: 0.85, rapidShallow: true, dropSat: true }
  };

  // Descripciones clínicas por panel y patrón
  const DETAILS = {
    normal: {
      1: 'V̇E asciende de forma progresiva y suave, con incremento acelerado tras el RCP por hiperventilación compensatoria.',
      2: 'FC asciende linealmente. El pulso de O₂ sube de forma progresiva con tendencia a meseta cerca del máximo.',
      3: 'V̇O₂ y V̇CO₂ suben paralelas y linealmente durante casi todo el ejercicio. V̇CO₂ acelera tras el AT.',
      4: 'Relación lineal. La pendiente V̇E/V̇CO₂ es < 30 en el sujeto sano.',
      5: 'FC crece linealmente con V̇O₂. Su pendiente refleja la eficiencia cardiovascular.',
      6: 'Fase isocápnica (pendiente ≈ 1) hasta el AT; luego pendiente > 1. El punto de inflexión = AT.',
      7: 'Vt sube hasta ~50-60% de la CV, luego se estabiliza. FR aumenta después.',
      8: 'V̇E/V̇O₂ desciende hasta el AT y luego sube. V̇E/V̇CO₂ desciende hasta el RCP y luego sube.',
      9: 'PETCO₂ sube desde ~36 hasta ~42-44 en el AT, estable hasta RCP. PETO₂ bifásico inverso.'
    },
    deconditioning: {
      1: 'V̇E máxima menor que en sano por V̇O₂max reducido, pero morfología normal.',
      2: 'FC pico normal. Pulso de O₂ ABSOLUTO bajo pero con MORFOLOGÍA ASCENDENTE normal — clave diagnóstica.',
      3: 'V̇O₂max y AT bajos por baja capacidad muscular. ΔV̇O₂/ΔWR conservado.',
      4: 'V̇E/V̇CO₂ slope NORMAL (< 30). Descarta HP oculta y IC significativa.',
      5: 'La pendiente FC/V̇O₂ suele estar aumentada (más FC por cada litro de O₂ — desentrenado).',
      6: 'AT bajo pero identificable. Pendientes normales.',
      7: 'Patrón ventilatorio normal.',
      8: 'Equivalentes ventilatorios normales.',
      9: 'PETCO₂ con evolución normal. SpO₂ estable.'
    },
    hf: {
      1: 'V̇E baja al pico. Puede aparecer OSCILACIÓN VENTILATORIA (ondas periódicas) — marcador pronóstico adverso.',
      2: 'Pulso de O₂ con MESETA PRECOZ o caída — el volumen sistólico no puede seguir aumentando.',
      3: 'ΔV̇O₂/ΔWR reducido (< 8). Cinética del V̇O₂ enlentecida.',
      4: 'V̇E/V̇CO₂ slope ELEVADO (≥ 36 en Clase Arena II) — mejor predictor pronóstico que el V̇O₂max.',
      5: 'FC/V̇O₂ desviada. Reserva cronotrópica puede estar reducida por β-bloqueo.',
      6: 'AT bajo, a veces no identificable por baja tolerancia.',
      7: 'Patrón puede ser rápido-superficial secundario a congestión.',
      8: 'V̇E/V̇O₂ y V̇E/V̇CO₂ elevados de forma sostenida — ineficiencia ventilatoria.',
      9: 'PETCO₂ basal bajo por hiperventilación crónica.'
    },
    ph: {
      1: 'V̇E máxima reducida. Hiperventilación desproporcionada desde el inicio.',
      2: 'Pulso de O₂ bajo con MESETA PRECOZ por fallo del VD.',
      3: 'ΔV̇O₂/ΔWR MUY REDUCIDO (< 8). Cinética alterada.',
      4: 'V̇E/V̇CO₂ slope MUY ALTO (frecuentemente > 40-50) — el mejor marcador no invasivo de HAP oculta.',
      5: 'Baja capacidad de aumentar FC con la carga (ineficacia CV).',
      6: 'AT precoz. Pendientes elevadas.',
      7: 'Patrón rápido-superficial frecuente.',
      8: 'V̇E/V̇CO₂ muy elevado por espacio muerto aumentado.',
      9: 'PETCO₂ BASAL BAJO (<33) que NO sube con el ejercicio — hallazgo característico de HAP.'
    },
    cteph: {
      1: 'V̇E máxima muy reducida. Marcada hiperventilación basal por espacio muerto extremo.',
      2: 'Pulso de O₂ bajo con MESETA MUY PRECOZ. VS del VD severamente limitado por la carga fija.',
      3: 'ΔV̇O₂/ΔWR muy reducido. Cinética recuperación extremadamente prolongada.',
      4: 'V̇E/V̇CO₂ slope EXTREMADAMENTE ELEVADO (frecuentemente > 50), reflejando espacio muerto por zonas ventiladas no perfundidas (áreas embolizadas crónicamente).',
      5: 'Curva desviada abruptamente. Reserva CV agotada precozmente.',
      6: 'AT muy precoz o no identificable por corta tolerancia al ejercicio.',
      7: 'Patrón rápido-superficial marcado.',
      8: 'Equivalentes ventilatorios elevados desde el inicio (no solo tras el AT) — refleja el espacio muerto FIJO, no metabólico.',
      9: 'PETCO₂ basal muy bajo (< 28 mmHg). SpO₂ suele caer. DIFERENCIA clave con HAP grupo 1: la ineficiencia es más marcada y de inicio precoz.'
    },
    exph: {
      1: 'V̇E moderadamente reducida. Puede aparecer ligera hiperventilación tardía.',
      2: 'Pulso de O₂ ABSOLUTO normal o levemente reducido. Puede insinuarse meseta al pico del ejercicio.',
      3: 'V̇O₂ pico levemente reducido (70-85% del predicho) sin causa clara.',
      4: 'V̇E/V̇CO₂ slope en RANGO LÍMITE (30-38). Ni claramente normal ni claramente HP franca — sospecha de patología vascular pulmonar precoz.',
      5: 'Relación FC/V̇O₂ conservada.',
      6: 'AT identificable pero levemente adelantado.',
      7: 'Patrón ventilatorio normal.',
      8: 'V̇E/V̇CO₂ elevado sutilmente. V̇E/V̇O₂ normal.',
      9: 'PETCO₂ que no ASCIENDE adecuadamente durante el ejercicio submáximo (respuesta plana). Requiere cateterismo con ejercicio para confirmar HP del esfuerzo (PAPm/GC > 3 mmHg/L/min).'
    },
    copd: {
      1: 'V̇E toca el techo de la MVV (limitación mecánica). Reserva ventilatoria ≤ 15%.',
      2: 'Pulso de O₂ variable. Puede ser normal si no hay compromiso CV.',
      3: 'V̇O₂max bajo por interrupción precoz. Ejercicio corto.',
      4: 'V̇E/V̇CO₂ variable. Puede estar elevado por espacio muerto o normal si hay hipoventilación.',
      5: 'Detención antes de alcanzar FC máxima predicha.',
      6: 'AT puede ser difícil de identificar por corta duración del esfuerzo.',
      7: 'ATRAPAMIENTO DINÁMICO: caída de la capacidad inspiratoria durante el ejercicio. Vt limitado.',
      8: 'Equivalentes variables según componente enfisematoso o bronquítico.',
      9: 'PETCO₂ basal ALTO (retención). SpO₂ puede caer al final.'
    },
    ild: {
      1: 'V̇E máxima puede ser normal, pero conseguida a expensas de FR muy alta.',
      2: 'Pulso de O₂ suele ser bajo por baja C(a-v)O₂ (desaturación limita transporte).',
      3: 'V̇O₂max bajo. Cinética alterada.',
      4: 'V̇E/V̇CO₂ slope ELEVADO por aumento del espacio muerto.',
      5: 'FC alta a bajo V̇O₂ — compensación cronotrópica.',
      6: 'AT precoz.',
      7: 'PATRÓN RÁPIDO-SUPERFICIAL desde el inicio: FR muy alta (> 50 rpm), Vt limitado.',
      8: 'Equivalentes ventilatorios elevados.',
      9: 'PETCO₂ bajo por hiperventilación. DESATURACIÓN típica con esfuerzo (SpO₂ cae ≥ 4%).'
    }
  };

  let currentPattern = 'normal';
  let selectedPanel = null;

  function css(varname) {
    return getComputedStyle(document.documentElement).getPropertyValue(varname).trim();
  }

  // Generador de curvas simplificadas por panel/patrón
  function generateCurve(panelN, pattern) {
    const p = PATTERNS[pattern];
    const points = [];
    const N = 40;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      let x, y;
      switch (panelN) {
        case 1: // VE vs t
          x = t;
          y = p.veLimit && t > 0.7 ? 0.72 : (Math.pow(t, 1.6) * (0.8 + p.slopeMod * 0.2));
          break;
        case 2: // FC + O2/FC vs WR (dibujamos O2-pulse)
          x = t;
          if (p.o2pulsePlateau && t > 0.6) {
            y = 0.6 * p.o2pulseMod;
          } else {
            y = Math.pow(t, 0.7) * p.o2pulseMod * 0.85;
          }
          break;
        case 3: // VO2 vs WR
          x = t;
          y = t * p.slopeMod;
          break;
        case 4: // VE vs VCO2
          x = t;
          y = t * (p.veCo2Mod / 30);
          break;
        case 5: // FC vs VO2
          x = t;
          y = t * (1.0 / p.slopeMod) * 0.9;
          if (y > 1) y = 1;
          break;
        case 6: // V-slope
          x = t;
          if (t < 0.5) y = t * 0.95;
          else y = 0.475 + (t - 0.5) * 1.8;
          if (y > 1) y = 1;
          break;
        case 7: // Vt vs VE
          x = t;
          if (p.rapidShallow) {
            y = 0.4 * (1 - Math.exp(-t * 3));
          } else {
            y = t < 0.5 ? t * 1.6 : 0.8;
          }
          break;
        case 8: // Ventilatory equivalents
          x = t;
          if (t < 0.4) y = 0.6 - t * 0.3;
          else y = 0.5 + (t - 0.4) * (p.veCo2Mod / 60);
          if (y > 1) y = 1;
          break;
        case 9: // PETCO2 vs t
          x = t;
          const petBase = (p.petCo2Mod - 25) / 25;
          if (t < 0.5) y = petBase + t * 0.15;
          else y = petBase + 0.075 - (t - 0.5) * 0.15;
          if (p.dropSat === true && t > 0.6) y -= (t - 0.6) * 0.3;
          break;
      }
      points.push([x, y]);
    }
    // Oscilación ventilatoria en IC (panel 1)
    if (panelN === 1 && p.oscillation) {
      for (let i = 0; i < points.length; i++) {
        const wave = Math.sin(points[i][0] * Math.PI * 6) * 0.08;
        points[i][1] += wave;
      }
    }
    return points;
  }

  function renderMiniPanel(panelN, pattern) {
    const points = generateCurve(panelN, pattern);
    const W = 100, H = 70;
    const padX = 8, padY = 6;
    const path = points.map(([x, y], i) => {
      const px = padX + x * (W - 2 * padX);
      const py = H - padY - Math.max(0, Math.min(1, y)) * (H - 2 * padY);
      return (i === 0 ? 'M' : 'L') + px.toFixed(1) + ',' + py.toFixed(1);
    }).join(' ');

    // Reference (normal) curve para comparar
    let refPath = '';
    if (pattern !== 'normal') {
      const refPts = generateCurve(panelN, 'normal');
      refPath = refPts.map(([x, y], i) => {
        const px = padX + x * (W - 2 * padX);
        const py = H - padY - Math.max(0, Math.min(1, y)) * (H - 2 * padY);
        return (i === 0 ? 'M' : 'L') + px.toFixed(1) + ',' + py.toFixed(1);
      }).join(' ');
    }

    const strokeColor = pattern === 'normal' ? css('--navy') : css('--amber-3');
    const refColor = css('--text-3');

    return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
      <line x1="${padX}" y1="${H - padY}" x2="${W - padX}" y2="${H - padY}" stroke="${css('--border')}" stroke-width="0.6"/>
      <line x1="${padX}" y1="${padY}" x2="${padX}" y2="${H - padY}" stroke="${css('--border')}" stroke-width="0.6"/>
      ${refPath ? `<path d="${refPath}" fill="none" stroke="${refColor}" stroke-width="1" stroke-dasharray="2,2" opacity="0.5"/>` : ''}
      <path d="${path}" fill="none" stroke="${strokeColor}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  }

  function renderGrid() {
    const grid = document.getElementById('panelGrid');
    grid.innerHTML = PANELS.map(p => `
      <div class="wasserman-panel${selectedPanel === p.n ? ' selected' : ''}" data-panel="${p.n}">
        <div class="p-label">P${p.n}</div>
        <div class="p-title">${p.title}</div>
        ${renderMiniPanel(p.n, currentPattern)}
      </div>
    `).join('');
    grid.querySelectorAll('.wasserman-panel').forEach(el => {
      el.addEventListener('click', () => {
        selectedPanel = parseInt(el.getAttribute('data-panel'));
        renderGrid();
        renderDetail();
      });
    });
  }

  function renderDetail() {
    const el = document.getElementById('panelDetail');
    if (selectedPanel === null) {
      el.innerHTML = `<div class="panel-detail-title">Método sistemático</div>
        <div class="panel-detail-body">Empieza por P3 y P6 (metabolismo, esfuerzo). Luego P2 y P5 (cardiovascular). Después P4 y P8 (eficiencia ventilatoria). Cierra con P7 y P9 (patrón ventilatorio e intercambio). <strong>Selecciona un patrón arriba y toca cada panel para ver la firma característica.</strong></div>`;
      return;
    }
    const panel = PANELS.find(p => p.n === selectedPanel);
    const patternLabel = PATTERNS[currentPattern].label;
    const detail = DETAILS[currentPattern][selectedPanel];
    el.innerHTML = `<div class="panel-detail-title">P${selectedPanel} · ${panel.title} — ${patternLabel}</div>
      <div class="panel-detail-body">${detail}</div>`;
  }

  document.getElementById('patternSelector').addEventListener('click', e => {
    if (e.target.tagName !== 'BUTTON') return;
    document.querySelectorAll('#patternSelector button').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    currentPattern = e.target.getAttribute('data-pattern');
    renderGrid();
    renderDetail();
  });

  window._wasserman = { render: () => { renderGrid(); renderDetail(); } };
  renderGrid();
  renderDetail();
})();

/* --------- 4. SIMULADOR V-SLOPE --------- */
(function initVslope() {
  const svg = document.getElementById('vslopeSvg');
  const feedback = document.getElementById('vslopeFeedback');
  const W = 500, H = 340;
  const padL = 55, padR = 20, padT = 20, padB = 50;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  let atX = 0.55 + (Math.random() - 0.5) * 0.15; // AT position between 0.4 and 0.7
  let points = [];
  let userGuess = null;
  let showAnswer = false;

  function css(varname) {
    return getComputedStyle(document.documentElement).getPropertyValue(varname).trim();
  }

  function generatePoints() {
    points = [];
    const N = 45;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      // V̇O₂ eje X, V̇CO₂ eje Y
      const vo2 = t;
      let vco2;
      if (t < atX) {
        vco2 = t * 0.92 + 0.05; // Slope ~0.92 antes del AT
      } else {
        vco2 = atX * 0.92 + 0.05 + (t - atX) * 1.55; // Slope ~1.55 después
      }
      // Añadir ruido
      vco2 += (Math.random() - 0.5) * 0.025;
      points.push([vo2, vco2]);
    }
  }

  function toSvgX(x) { return padL + x * plotW; }
  function toSvgY(y) { return padT + (1 - Math.min(1, y)) * plotH; }
  function fromSvgX(px) { return (px - padL) / plotW; }

  function render() {
    let html = '';
    // Fondo
    html += `<rect x="${padL}" y="${padT}" width="${plotW}" height="${plotH}" fill="${css('--paper')}" stroke="${css('--border')}"/>`;
    // Rejilla
    for (let i = 1; i < 5; i++) {
      const y = padT + (i / 5) * plotH;
      html += `<line x1="${padL}" y1="${y}" x2="${padL + plotW}" y2="${y}" stroke="${css('--border')}" stroke-width="0.5" stroke-dasharray="2,2"/>`;
      const x = padL + (i / 5) * plotW;
      html += `<line x1="${x}" y1="${padT}" x2="${x}" y2="${padT + plotH}" stroke="${css('--border')}" stroke-width="0.5" stroke-dasharray="2,2"/>`;
    }
    // Ejes
    html += `<line x1="${padL}" y1="${padT + plotH}" x2="${padL + plotW}" y2="${padT + plotH}" stroke="${css('--navy')}" stroke-width="1.5"/>`;
    html += `<line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + plotH}" stroke="${css('--navy')}" stroke-width="1.5"/>`;
    // Etiquetas
    html += `<text x="${padL + plotW / 2}" y="${H - 10}" text-anchor="middle" fill="${css('--text')}" font-family="Space Grotesk" font-size="14" font-weight="600">V̇O₂ (L/min)</text>`;
    html += `<text x="15" y="${padT + plotH / 2}" text-anchor="middle" fill="${css('--text')}" font-family="Space Grotesk" font-size="14" font-weight="600" transform="rotate(-90 15 ${padT + plotH / 2})">V̇CO₂ (L/min)</text>`;
    // Ticks
    for (let i = 0; i <= 5; i++) {
      const val = (i * 0.6).toFixed(1);
      const x = padL + (i / 5) * plotW;
      html += `<text x="${x}" y="${padT + plotH + 18}" text-anchor="middle" fill="${css('--text-2')}" font-family="IBM Plex Mono" font-size="10">${val}</text>`;
      const y = padT + plotH - (i / 5) * plotH;
      html += `<text x="${padL - 8}" y="${y + 3}" text-anchor="end" fill="${css('--text-2')}" font-family="IBM Plex Mono" font-size="10">${val}</text>`;
    }
    // Puntos
    points.forEach(([x, y]) => {
      html += `<circle cx="${toSvgX(x)}" cy="${toSvgY(y)}" r="2.5" fill="${css('--amber-3')}" opacity="0.75"/>`;
    });
    // Guess del usuario
    if (userGuess !== null) {
      const gx = toSvgX(userGuess);
      const idx = Math.round(userGuess * (points.length - 1));
      const gy = toSvgY(points[Math.min(idx, points.length - 1)][1]);
      html += `<line x1="${gx}" y1="${padT}" x2="${gx}" y2="${padT + plotH}" stroke="${css('--warning')}" stroke-width="1.5" stroke-dasharray="4,3"/>`;
      html += `<circle cx="${gx}" cy="${gy}" r="7" fill="${css('--warning')}" opacity="0.35"/>`;
      html += `<circle cx="${gx}" cy="${gy}" r="4" fill="${css('--warning')}"/>`;
      html += `<text x="${gx + 8}" y="${padT + 15}" fill="${css('--warning')}" font-family="IBM Plex Mono" font-size="11" font-weight="600">Tu elección</text>`;
    }
    // Respuesta correcta
    if (showAnswer) {
      const ax = toSvgX(atX);
      const idx = Math.round(atX * (points.length - 1));
      const ay = toSvgY(points[Math.min(idx, points.length - 1)][1]);
      html += `<line x1="${ax}" y1="${padT}" x2="${ax}" y2="${padT + plotH}" stroke="${css('--success')}" stroke-width="1.5"/>`;
      html += `<circle cx="${ax}" cy="${ay}" r="8" fill="${css('--success')}" opacity="0.35"/>`;
      html += `<circle cx="${ax}" cy="${ay}" r="5" fill="${css('--success')}"/>`;
      html += `<text x="${ax + 8}" y="${padT + 35}" fill="${css('--success')}" font-family="IBM Plex Mono" font-size="11" font-weight="600">AT real</text>`;
      // Líneas de tendencia antes y después
      const preX1 = toSvgX(0);
      const preY1 = toSvgY(0.05);
      const preX2 = toSvgX(atX);
      const preY2 = toSvgY(atX * 0.92 + 0.05);
      html += `<line x1="${preX1}" y1="${preY1}" x2="${preX2}" y2="${preY2}" stroke="${css('--navy')}" stroke-width="2" opacity="0.7"/>`;
      const postX1 = toSvgX(atX);
      const postY1 = toSvgY(atX * 0.92 + 0.05);
      const postX2 = toSvgX(1);
      const postY2 = toSvgY(Math.min(1, atX * 0.92 + 0.05 + (1 - atX) * 1.55));
      html += `<line x1="${postX1}" y1="${postY1}" x2="${postX2}" y2="${postY2}" stroke="${css('--danger')}" stroke-width="2" opacity="0.7"/>`;
    }
    svg.innerHTML = html;
  }

  svg.addEventListener('click', e => {
    if (showAnswer) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = W / rect.width;
    const px = (e.clientX - rect.left) * scaleX;
    let x = fromSvgX(px);
    if (x < 0.05 || x > 0.95) return;
    userGuess = x;
    // Evaluar
    const diff = Math.abs(userGuess - atX);
    let cls, msg;
    if (diff < 0.05) {
      cls = 'success';
      msg = `¡Excelente! Tu identificación está a ${Math.round(diff * 100)}% del AT real. El punto de inflexión donde V̇CO₂ empieza a subir más rápido que V̇O₂ marca el inicio del tamponamiento del lactato.`;
    } else if (diff < 0.12) {
      cls = 'success';
      msg = `Buen tiro. Tu elección está a ${Math.round(diff * 100)}% del AT real. Pulsa "Mostrar respuesta" para ver el punto exacto y las pendientes pre-AT (≈1) y post-AT (>1).`;
    } else {
      cls = 'wrong';
      msg = `Estás lejos del AT real (${Math.round(diff * 100)}% de error). Recuerda: el AT es el punto donde la pendiente cambia de ≈1 (fase isocápnica) a claramente >1 (fase de tamponamiento). Pulsa "Mostrar respuesta".`;
    }
    feedback.className = 'vslope-feedback ' + cls;
    feedback.textContent = msg;
    render();
  });

  document.getElementById('vslopeReset').addEventListener('click', () => {
    userGuess = null;
    showAnswer = false;
    feedback.className = 'vslope-feedback';
    feedback.textContent = 'Haz clic sobre la curva para señalar el punto de inflexión.';
    render();
  });

  document.getElementById('vslopeShow').addEventListener('click', () => {
    showAnswer = true;
    if (userGuess === null) {
      feedback.className = 'vslope-feedback';
      feedback.textContent = 'El AT real está señalado en verde. Las dos rectas muestran las pendientes pre-AT y post-AT.';
    }
    render();
  });

  document.getElementById('vslopeNew').addEventListener('click', () => {
    atX = 0.55 + (Math.random() - 0.5) * 0.15;
    generatePoints();
    userGuess = null;
    showAnswer = false;
    feedback.className = 'vslope-feedback';
    feedback.textContent = 'Nuevo trazado generado. Haz clic sobre la curva para señalar el punto de inflexión.';
    render();
  });

  window._vslope = { render };
  generatePoints();
  render();
})();

/* --------- 5. COMPARADOR DINÁMICO DE PATRONES --------- */
(function initPatternCmp() {
  const selector = document.getElementById('cmpSelector');
  const table = document.getElementById('cmpTable');

  selector.addEventListener('click', e => {
    if (e.target.tagName !== 'BUTTON') return;
    document.querySelectorAll('#cmpSelector button').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    const key = e.target.getAttribute('data-cmp');
    // Limpiar highlights
    table.querySelectorAll('td').forEach(td => td.classList.remove('highlight'));
    if (key !== 'none') {
      table.querySelectorAll(`td[data-c="${key}"]`).forEach(td => td.classList.add('highlight'));
    }
  });
})();

/* --------- 6. SIMULADOR DE CASOS CLÍNICOS PROGRESIVOS --------- */
const CASES = [
  {
    title: 'Caso 1 · Disnea de esfuerzo post-COVID',
    steps: [
      {
        title: 'Presentación clínica',
        body: '<strong>Mujer de 52 años</strong>, profesora, sedentaria post-pandemia. Sin antecedentes cardiovasculares. Espirometría, ECG y ecocardiograma <strong>normales</strong>. Aumento de 5 kg en el último año. Refiere disnea al subir escaleras.',
        question: '¿Cuál es tu hipótesis diagnóstica inicial más probable?',
        choices: [
          { text: 'Insuficiencia cardíaca con fracción de eyección preservada', correct: false, why: 'Es posible en obesidad, pero con eco normal y sin comorbilidades cardiovasculares es menos probable como primer sospecha.' },
          { text: 'Desacondicionamiento físico', correct: true, why: 'Contexto post-pandemia, sedentarismo, ganancia de peso, pruebas basales normales — el escenario clásico. La CPET confirmará el patrón.' },
          { text: 'Hipertensión pulmonar oculta', correct: false, why: 'Posible pero menos probable como sospecha inicial. Requeriría alteraciones sutiles en el eco (PSAP, VD) o antecedentes específicos.' }
        ]
      },
      {
        title: 'Bloque cardiovascular de la CPET',
        body: '<ul><li>V̇O₂ pico: 23.8 mL/kg/min (88% predicho)</li><li>FC pico: 165 lpm (96% predicho)</li><li>Pulso O₂ pico: 11.0 mL/lat (92% predicho)</li><li>Morfología del pulso O₂: <strong>ascenso progresivo, sin meseta ni caída</strong></li><li>ΔV̇O₂/ΔWR: 9.8 mL/min/W</li><li>ECG: sin cambios isquémicos</li></ul>',
        question: '¿Qué te dice el bloque cardiovascular?',
        choices: [
          { text: 'Hay limitación cardiovascular por meseta del pulso de O₂', correct: false, why: 'Cuidado: el pulso de O₂ tiene morfología ASCENDENTE normal. No hay meseta.' },
          { text: 'El corazón NO es el sistema limitante', correct: true, why: 'Morfología normal del pulso de O₂ (aunque el AT esté bajo), ΔV̇O₂/ΔWR conservado, FC pico normal, ECG limpio. El corazón responde bien al esfuerzo.' },
          { text: 'Insuficiente para concluir, faltan datos ventilatorios', correct: false, why: 'Aunque siempre hay que integrar todo, con estos datos ya se puede DESCARTAR limitación cardiovascular estructural.' }
        ]
      },
      {
        title: 'Bloque ventilatorio y de intercambio',
        body: '<ul><li>V̇E/V̇CO₂ slope: <strong>26</strong> (normal)</li><li>Reserva ventilatoria: 36% (conservada)</li><li>Patrón ventilatorio: Vt sube progresivamente, FR pico 36 rpm</li><li>PETCO₂: bifásico normal (35 → 41 → 35 mmHg)</li><li>SpO₂: estable en 98%</li><li>AT: 45% del V̇O₂max predicho (bajo)</li><li>Detención: <strong>fatiga muscular generalizada</strong>, disnea 9/10 Borg</li></ul>',
        question: '¿Cuál es tu diagnóstico final?',
        choices: [
          { text: 'EPID inicial', correct: false, why: 'No hay patrón rápido-superficial, no hay desaturación, DLCO era normal. No cuadra.' },
          { text: 'Desacondicionamiento físico', correct: true, why: 'Patrón puro: V̇O₂ y AT bajos, pulso O₂ con morfología normal, V̇E/V̇CO₂ slope normal, sin desaturación, detención por fatiga muscular. El único diagnóstico coherente con la totalidad de los hallazgos.' },
          { text: 'Miopatía metabólica', correct: false, why: 'Rara. El patrón podría ser similar pero se plantea solo si el paciente no responde al ejercicio supervisado.' }
        ]
      }
    ],
    final: {
      dx: 'Desacondicionamiento físico',
      recommendation: 'Programa de rehabilitación cardiovascular supervisada, intensidad inicial al 60-70% de la FC alcanzada. Reevaluación clínica a 3-6 meses. El diagnóstico se sostiene por exclusión razonada + patrón puro coherente.'
    }
  },
  {
    title: 'Caso 2 · Insuficiencia cardíaca con FEr avanzada',
    steps: [
      {
        title: 'Presentación clínica',
        body: '<strong>Varón de 68 años</strong>. Miocardiopatía dilatada, FEVI 30%. Tratamiento óptimo con IECA, β-bloqueante, ARM y ARNI. NYHA III persistente. Solicitud: <strong>estratificación pronóstica y valoración de trasplante</strong>.',
        question: 'Antes de mirar los datos: ¿cuál es la variable más importante para la decisión de trasplante?',
        choices: [
          { text: 'FEVI ecocardiográfica', correct: false, why: 'La FEVI ya está deprimida pero no es la variable pivotal. La decisión funcional se sostiene sobre la capacidad al esfuerzo.' },
          { text: 'V̇O₂ pico + V̇E/V̇CO₂ slope', correct: true, why: 'Ambas variables juntas soportan la decisión pronóstica. V̇O₂ pico <14 mL/kg/min (o <12 con β-bloqueo) es el umbral clásico. V̇E/V̇CO₂ slope ≥36 identifica alto riesgo independientemente.' },
          { text: 'BNP y creatinina', correct: false, why: 'Son parte del perfil pero no son las variables funcionales pivotales para trasplante.' }
        ]
      },
      {
        title: 'Datos del bloque cardiovascular',
        body: '<ul><li>V̇O₂ pico: <strong>11.2 mL/kg/min</strong> (Weber C)</li><li>AT al 28% del V̇O₂max predicho (muy bajo)</li><li>Pulso O₂ pico: 8.5 mL/lat con <strong>meseta precoz al 55% del esfuerzo</strong></li><li>ΔV̇O₂/ΔWR: 6 mL/min/W (reducido)</li><li>Reserva cronotrópica: 78% predicha (β-bloqueo)</li><li>HRR1: <strong>8 lpm</strong> (recuperación activa)</li></ul>',
        question: '¿Qué añaden estos datos al perfil pronóstico?',
        choices: [
          { text: 'Perfil de bajo riesgo por reserva cronotrópica atenuada por β-bloqueo', correct: false, why: 'El β-bloqueo explica parte de la reserva cronotrópica, pero la HRR1 baja, la meseta precoz del pulso O₂ y el ΔV̇O₂/ΔWR reducido apuntan a alto riesgo.' },
          { text: 'Alto riesgo: fallo del volumen sistólico + disautonomía', correct: true, why: 'Meseta precoz del pulso O₂ = incapacidad de aumentar VS. HRR1 <12 lpm = disautonomía (Cole NEJM 1999). Ambos son marcadores pronósticos adversos independientes del V̇O₂.' },
          { text: 'Perfil compatible con IC estable no candidato a trasplante', correct: false, why: 'Los datos apuntan justamente lo contrario.' }
        ]
      },
      {
        title: 'Datos ventilatorios',
        body: '<ul><li>V̇E/V̇CO₂ slope: <strong>42</strong> (Clase Arena II)</li><li>Reserva ventilatoria: 45% (conservada)</li><li>SpO₂ estable en 96%</li><li>Detección de <strong>oscilación ventilatoria periódica</strong> durante el ejercicio submáximo</li><li>PETCO₂ basal bajo (33 mmHg)</li></ul>',
        question: '¿Cuál es la conclusión y recomendación?',
        choices: [
          { text: 'Perfil de alto riesgo — indicar valoración formal de trasplante', correct: true, why: 'V̇O₂ pico <14, V̇E/V̇CO₂ slope >36, HRR1 baja, oscilación ventilatoria — todos son marcadores de alto riesgo. La combinación identifica un fenotipo de mortalidad elevada. Indicación de derivación a comité de trasplante cardíaco.' },
          { text: 'Optimizar tratamiento y repetir CPET en 6 meses', correct: false, why: 'El paciente ya está en tratamiento óptimo. Retrasar puede ser inseguro.' },
          { text: 'CDI en prevención primaria', correct: false, why: 'Probablemente ya está indicado por FEVI 30%, pero no es la respuesta a la CPET actual.' }
        ]
      }
    ],
    final: {
      dx: 'IC-FEr avanzada, perfil pronóstico de alto riesgo',
      recommendation: 'Derivación a comité de trasplante cardíaco. La combinación de V̇O₂ pico <14 mL/kg/min, V̇E/V̇CO₂ slope >36, HRR1 baja y oscilación ventilatoria configura un fenotipo de mortalidad elevada.'
    }
  },
  {
    title: 'Caso 3 · Disnea inexplicada — HP oculta',
    steps: [
      {
        title: 'Presentación clínica',
        body: '<strong>Mujer de 45 años</strong>. Sin factores de riesgo CV. ECG normal, ecocardiograma normal (PSAP estimada 30 mmHg), espirometría normal, DLCO 82%. Rx tórax normal. Refiere <strong>disnea progresiva de 6 meses</strong> que impide subir escaleras.',
        question: '¿Con qué pregunta específica pedirías la CPET?',
        choices: [
          { text: '¿Hay limitación funcional? Sí/no', correct: false, why: 'Pregunta demasiado inespecífica. Cualquier CPET responderá que la hay, sin caracterizarla.' },
          { text: '¿Cuál es el sistema limitante en esta disnea inexplicada, con especial atención a HP oculta?', correct: true, why: 'Pregunta clínica específica que orienta al laboratorio a mirar los marcadores no invasivos de HP (V̇E/V̇CO₂ slope, PETCO₂ basal, ΔV̇O₂/ΔWR, SpO₂). La CPET es la mejor prueba para HP oculta con eco normal.' },
          { text: '¿Es candidata a trasplante cardíaco?', correct: false, why: 'No procede: no tiene IC establecida.' }
        ]
      },
      {
        title: 'Resultados principales',
        body: '<ul><li>V̇O₂ pico: 18 mL/kg/min (76% predicho, leve-moderado bajo)</li><li>AT: 35% del V̇O₂max predicho (bajo)</li><li>Pulso O₂: 7.5 mL/lat (78% predicho), <strong>morfología con meseta precoz</strong></li><li>V̇E/V̇CO₂ slope: <strong>48</strong></li><li>PETCO₂ basal: <strong>28 mmHg</strong>, no asciende con el ejercicio</li><li>ΔV̇O₂/ΔWR: 7 mL/min/W</li><li>SpO₂: cae de 97% a <strong>89%</strong> al pico</li><li>Reserva ventilatoria: 40% (conservada)</li></ul>',
        question: '¿Qué patrón identificas?',
        choices: [
          { text: 'Desacondicionamiento severo', correct: false, why: 'El pulso O₂ NO tiene morfología normal (tiene meseta), el V̇E/V̇CO₂ slope está muy elevado, hay desaturación, PETCO₂ basal bajo. No es desacondicionamiento.' },
          { text: 'EPID', correct: false, why: 'Posible por desaturación y slope elevado, pero DLCO era normal y no hay patrón rápido-superficial descrito. Más importante: el PETCO₂ basal bajo y la meseta del pulso O₂ orientan más a compromiso vascular pulmonar.' },
          { text: 'Hipertensión pulmonar', correct: true, why: 'Firma clásica: V̇E/V̇CO₂ slope muy alto (aumento del espacio muerto), PETCO₂ basal bajo que no sube, ΔV̇O₂/ΔWR reducido por fallo del VD, desaturación (posible shunt derecha-izquierda por FOP). Ecocardiograma "normal" no la descarta.' }
        ]
      },
      {
        title: 'Siguiente paso',
        body: 'La CPET orienta con alta probabilidad a HP, pero el diagnóstico definitivo y la clasificación requieren <strong>hemodinamia invasiva</strong>.',
        question: '¿Cuál es la siguiente exploración?',
        choices: [
          { text: 'Cateterismo cardíaco derecho', correct: true, why: 'El estándar de oro para confirmar HP, medir presiones (PAPm, PAWP, GTP, RVP) y clasificar el grupo. Además, guía el tratamiento específico.' },
          { text: 'Repetir CPET en 3 meses', correct: false, why: 'No procede: los hallazgos son suficientemente sugestivos para justificar exploración invasiva ya.' },
          { text: 'TC de tórax con contraste solo', correct: false, why: 'Útil como complemento (descarta HP tromboembólica crónica, EPID sutil), pero no reemplaza el cateterismo para confirmar HP.' }
        ]
      }
    ],
    final: {
      dx: 'Sospecha alta de hipertensión pulmonar (posible HAP idiopática)',
      recommendation: 'Cateterismo cardíaco derecho para confirmar diagnóstico, clasificar y guiar tratamiento. TC con contraste (angioTC) para descartar HP tromboembólica crónica. Derivación al programa de HP (grupo multidisciplinar).'
    }
  },
  {
    title: 'Caso 4 · Diferenciar EPOC de EPID',
    steps: [
      {
        title: 'Presentación clínica',
        body: '<strong>Varón de 62 años</strong>, ex-fumador 40 paquetes-año. Espirometría con patrón obstructivo <strong>moderado</strong> (FEV₁ 55% predicho, FEV₁/FVC 0.63). DLCO reducida (55%). TC de tórax con enfisema centrolobulillar y áreas de <strong>vidrio esmerilado en bases</strong>. Disnea NYHA III progresiva.',
        question: 'La imagen combina hallazgos de enfisema y de posible componente intersticial (CPFE — <em>Combined Pulmonary Fibrosis and Emphysema</em>). ¿Qué esperas ver en la CPET?',
        choices: [
          { text: 'Patrón obstructivo puro con reserva ventilatoria muy baja', correct: false, why: 'Podría cumplirse si dominara el componente EPOC, pero la CPFE tiene una firma mixta.' },
          { text: 'Patrón mixto: reserva ventilatoria variable + desaturación + V̇E/V̇CO₂ elevado', correct: true, why: 'La combinación enfisema + fibrosis produce un patrón mixto: reserva ventilatoria puede estar preservada (por hiperinsuflación con FEV₁ relativamente conservado), pero hay desaturación (intercambio) y V̇E/V̇CO₂ elevado (espacio muerto por HP secundaria).' },
          { text: 'Patrón normal — enfisema no significativo', correct: false, why: 'El FEV₁ 55% y DLCO 55% ya indican compromiso funcional significativo.' }
        ]
      },
      {
        title: 'Resultados de la CPET',
        body: '<ul><li>V̇O₂ pico: 15 mL/kg/min (64% predicho)</li><li>Reserva ventilatoria: 22% (limítrofe)</li><li>Capacidad inspiratoria seriada: cae de 2.3 L a 1.6 L (<strong>atrapamiento dinámico marcado</strong>)</li><li>Patrón ventilatorio: FR pico 42 rpm, Vt limitado a 60% de la CV</li><li>V̇E/V̇CO₂ slope: <strong>38</strong> (Clase II)</li><li>SpO₂: cae de 94% a <strong>85%</strong> al pico</li><li>PETCO₂ basal: 42 mmHg (algo alto, tendencia retenedora)</li></ul>',
        question: '¿Qué dominancia tiene el cuadro en la CPET?',
        choices: [
          { text: 'Dominancia EPOC pura: atrapamiento + limitación mecánica', correct: false, why: 'El atrapamiento es marcado (EPOC), pero la desaturación al 85% y el slope de 38 apuntan a un componente vascular/intercambio significativo.' },
          { text: 'Dominancia intersticial pura', correct: false, why: 'El atrapamiento dinámico y la retención de CO₂ basal indican componente obstructivo activo.' },
          { text: 'Patrón mixto con componentes obstructivo (atrapamiento), del intercambio (desaturación) y vascular (V̇E/V̇CO₂ 38)', correct: true, why: 'La CPET revela la naturaleza mixta de la CPFE. Cada eje refleja un componente: atrapamiento = enfisema; desaturación = intercambio (fibrosis + enfisema); slope = espacio muerto + posible HP secundaria.' }
        ]
      },
      {
        title: 'Recomendación clínica',
        body: 'La CPFE tiene peor pronóstico que EPOC o EPID aisladas, y con frecuencia se asocia a HP secundaria.',
        question: '¿Qué recomendaciones se derivan?',
        choices: [
          { text: 'Prescripción de rehabilitación pulmonar + evaluación de HP + oxigenoterapia en ejercicio', correct: true, why: 'La rehabilitación mejora síntomas independientemente del subtipo. La desaturación al 85% justifica evaluar oxigenoterapia con esfuerzo. El slope de 38 sugiere evaluar HP formalmente (eco dirigido + eventualmente cateterismo).' },
          { text: 'Solo aumentar broncodilatador de larga acción', correct: false, why: 'Insuficiente. El cuadro es multicomponente y requiere abordaje multimodal.' },
          { text: 'Trasplante pulmonar inmediato', correct: false, why: 'Prematuro. Se debe optimizar tratamiento, rehabilitación, oxigenoterapia y solo considerar trasplante si progresa a estadios finales.' }
        ]
      }
    ],
    final: {
      dx: 'Enfermedad pulmonar mixta (CPFE) con posible HP secundaria',
      recommendation: 'Rehabilitación pulmonar supervisada. Titulación de oxigenoterapia con esfuerzo. Ecocardiograma dirigido a HP y cateterismo derecho si sugiere PAPm elevada. Reevaluación funcional con CPET a los 6-12 meses.'
    }
  },
  {
    title: 'Caso 5 · HAP idiopática — seguimiento a 6 meses',
    steps: [
      {
        title: 'Situación basal',
        body: '<strong>Mujer de 38 años</strong> con HAP idiopática confirmada por cateterismo (PAPm 42 mmHg, PAWP 9, RVP 9 UW). NYHA III al diagnóstico. Se inicia terapia doble oral inicial (macitentan 10 mg + tadalafilo 40 mg). CPET basal: V̇O₂ pico <strong>10.5 mL/kg/min</strong> (46% predicho), V̇E/V̇CO₂ slope <strong>52</strong>, PETCO₂ basal 25 mmHg, desaturación al 88%.',
        question: 'Según los datos de CPET basales, ¿en qué estrato de riesgo la clasificarías?',
        choices: [
          { text: 'Bajo riesgo', correct: false, why: 'V̇O₂ pico 10.5 mL/kg/min y slope 52 no son parámetros de bajo riesgo.' },
          { text: 'Intermedio-alto riesgo', correct: false, why: 'Los valores están en el rango de intermedio-alto para slope pero de alto riesgo para V̇O₂ pico. Se toma la peor variable.' },
          { text: 'Alto riesgo', correct: true, why: 'V̇O₂ pico 10.5 mL/kg/min está en rango de intermedio-alto pero el slope 52 apunta a intermedio-alto/alto. En caso de disociación entre variables, se toma la peor. Además la desaturación al 88% y la NYHA III refuerzan el perfil de alto riesgo. Podría considerarse añadir prostanoide desde el inicio.' }
        ]
      },
      {
        title: 'CPET de seguimiento a los 6 meses',
        body: 'La paciente refiere mejoría subjetiva de la disnea (ahora NYHA II). Se repite CPET con la misma metodología: <ul><li>V̇O₂ pico: <strong>13.8 mL/kg/min</strong> (61% predicho) — mejora +3.3 mL/kg/min (+31%)</li><li>V̇E/V̇CO₂ slope: <strong>40</strong> — mejora −12 puntos</li><li>PETCO₂ basal: 30 mmHg (mejor, pero aún bajo)</li><li>SpO₂ nadir: 92% (mejora +4%)</li><li>Ecocardiograma: PAPm estimada 32 mmHg (previa 42)</li></ul>',
        question: '¿Cómo interpretas la respuesta al tratamiento?',
        choices: [
          { text: 'Respuesta subóptima, considerar cambiar toda la terapia', correct: false, why: 'Al contrario: los cambios son de magnitud clínicamente muy significativa. No hay razón para cambiar la terapia que está funcionando.' },
          { text: 'Respuesta clínicamente significativa que apoya continuar con el tratamiento actual', correct: true, why: 'Cambios >10% en V̇O₂ pico y >5 puntos en slope se consideran clínicamente significativos. La mejoría concordante en clínica, CPET y hemodinamia ecocardiográfica indica respuesta positiva a la terapia doble.' },
          { text: 'Los cambios son solo variabilidad técnica, no hay respuesta real', correct: false, why: 'La magnitud de los cambios supera claramente el rango de variabilidad técnica (que es del orden de 5-8% para V̇O₂ pico y 2-3 puntos para slope).' }
        ]
      },
      {
        title: 'Decisión terapéutica',
        body: 'La paciente ha pasado de alto riesgo a estrato intermedio-bajo/bajo. Aún no cumple criterios de bajo riesgo estricto (slope 40 vs. objetivo &lt;36, V̇O₂ pico 61% vs. objetivo &gt;65%).',
        question: '¿Cuál es la conducta más apropiada?',
        choices: [
          { text: 'Suspender uno de los dos fármacos ya que ha respondido', correct: false, why: 'No se retiran fármacos vasodilatadores en HAP salvo efectos adversos graves. La respuesta positiva depende de la terapia actual.' },
          { text: 'Continuar terapia dual, reevaluación integral a los 6-12 meses; escalar a triple si no alcanza bajo riesgo', correct: true, why: 'La paciente responde bien a terapia dual. Se continúa, se reevalúa integralmente a 6-12 meses y se escala a triple (añadir prostanoide) si no alcanza estrato de bajo riesgo. Esta estrategia "treat-to-target" está avalada por guías ESC/ERS 2022.' },
          { text: 'Añadir diurético para mejorar más rápido', correct: false, why: 'No corresponde. Los diuréticos solo se añaden si hay signos de fallo derecho con retención hídrica.' }
        ]
      }
    ],
    final: {
      dx: 'HAP grupo 1 idiopática con respuesta clínicamente significativa a terapia dual oral',
      recommendation: 'Continuar terapia doble (macitentan + tadalafilo). Reevaluación integral (clínica + eco + BNP + 6MWD + CPET) a los 6-12 meses. Escalar a terapia triple con prostanoide si no alcanza estrato de bajo riesgo. La CPET seriada es fundamental para objetivar la trayectoria funcional del paciente.'
    }
  },
  {
    title: 'Caso 6 · CTEPH diferenciada de HAP idiopática',
    steps: [
      {
        title: 'Presentación clínica',
        body: '<strong>Varón de 55 años</strong>. Antecedente de TEP hace 3 años, tratado con anticoagulación oral 12 meses y suspendido posteriormente. Consulta por disnea progresiva de 8 meses. Eco muestra <strong>PAPm estimada 55 mmHg, VD dilatado</strong>. En CPET: V̇O₂ pico 12 mL/kg/min, V̇E/V̇CO₂ slope <strong>62</strong>, PETCO₂ basal <strong>22 mmHg</strong>, desaturación al 83%. Cinética de recuperación de V̇O₂ muy prolongada.',
        question: '¿Qué te sugiere el V̇E/V̇CO₂ slope de 62 y PETCO₂ de 22?',
        choices: [
          { text: 'HAP idiopática típica', correct: false, why: 'La HAP idiopática cursa con slope habitualmente 40-50 y PETCO₂ basal 25-30. Un slope de 62 con PETCO₂ de 22 es un extremo poco típico de HAP grupo 1.' },
          { text: 'HP con espacio muerto muy aumentado — pensar en CTEPH', correct: true, why: 'Un slope tan alto (>50) con PETCO₂ tan bajo apunta a espacio muerto extremo, característico de zonas ventiladas no perfundidas por obstrucción vascular. El antecedente de TEP refuerza la sospecha. Debe realizarse gammagrafía V/Q y/o angioTC pulmonar para confirmar CTEPH.' },
          { text: 'Disnea psicógena con hiperventilación', correct: false, why: 'Los hallazgos hemodinámicos ecocardiográficos, la desaturación al 83% y el V̇O₂ pico reducido descartan disnea psicógena.' }
        ]
      },
      {
        title: 'Confirmación diagnóstica',
        body: 'Se realiza gammagrafía V/Q que muestra <strong>múltiples defectos de perfusión segmentarios y subsegmentarios con ventilación normal</strong> — patrón mismatch clásico de CTEPH. AngioTC confirma bandas fibrosas en arterias segmentarias.',
        question: '¿Cuál es la conducta específica ante CTEPH que la diferencia de HAP grupo 1?',
        choices: [
          { text: 'Iguales terapias vasodilatadoras que HAP idiopática', correct: false, why: 'CTEPH tiene su propio algoritmo terapéutico, distinto de HAP grupo 1.' },
          { text: 'Evaluación por equipo experto en CTEPH para: endarterectomía pulmonar, angioplastia con balón (BPA), o riociguat si no operable', correct: true, why: 'La endarterectomía pulmonar (PEA) es el tratamiento de elección en CTEPH con enfermedad accesible quirúrgicamente. Si no operable, la angioplastia con balón (BPA) y riociguat son alternativas. Un centro con equipo multidisciplinar experto es imprescindible.' },
          { text: 'Solo anticoagulación indefinida', correct: false, why: 'La anticoagulación es necesaria pero no suficiente. Se requiere abordaje específico de la CTEPH (cirugía, BPA, riociguat).' }
        ]
      },
      {
        title: 'Rol de la CPET en el seguimiento de CTEPH',
        body: 'Tras endarterectomía pulmonar exitosa, se repite CPET a los 6 meses: V̇O₂ pico ha subido a 20 mL/kg/min, slope ha bajado a 34, PETCO₂ basal a 34 mmHg. SpO₂ estable en 96%.',
        question: '¿Qué te dice la CPET post-quirúrgica?',
        choices: [
          { text: 'Mejoría dramática — el paciente es prácticamente "curado" desde el punto de vista funcional', correct: true, why: 'Los cambios son de magnitud extraordinaria: V̇O₂ pico +67%, slope -28 puntos, PETCO₂ +12 mmHg. La endarterectomía exitosa puede efectivamente "curar" la CTEPH en pacientes bien seleccionados, con normalización funcional. La CPET es el mejor documento objetivo de la respuesta.' },
          { text: 'Aún hay HP residual significativa', correct: false, why: 'Aunque el slope de 34 no está totalmente normalizado, en conjunto los datos indican mejoría funcional prácticamente completa.' },
          { text: 'La cirugía no fue efectiva', correct: false, why: 'Los cambios en CPET son claramente compatibles con éxito quirúrgico.' }
        ]
      }
    ],
    final: {
      dx: 'Hipertensión pulmonar tromboembólica crónica (CTEPH — grupo 4), operada con éxito',
      recommendation: 'Anticoagulación indefinida (rivaroxaban o AVK). Seguimiento por unidad de HP con CPET seriada anual + eco. La CPET es especialmente sensible para detectar HP residual o recurrencia post-endarterectomía. Vacunación antiinfluenza y antineumocócica.'
    }
  }
];

(function initCases() {
  const container = document.getElementById('caseContainer');
  const selector = document.getElementById('caseSelector');
  let currentCase = 0;
  // Estado por caso: qué pasos están revelados
  const state = CASES.map(() => ({ revealed: 0, answers: [] }));

  function renderCase() {
    const c = CASES[currentCase];
    const s = state[currentCase];
    let html = `<h3 style="margin-top: 0.5rem; color: var(--navy); font-family: 'Space Grotesk', sans-serif; font-size: 1.15rem;">${c.title}</h3>`;
    c.steps.forEach((step, i) => {
      const isRevealed = i <= s.revealed;
      const isAnswered = s.answers[i] !== undefined;
      const answer = s.answers[i];
      html += `<div class="case-step ${isRevealed ? 'revealed' : 'locked'}">
        <div class="case-step-header">Paso ${i + 1} · ${step.title}</div>
        <div class="case-step-body">${step.body}</div>
        <div style="margin: 0.6rem 0 0.4rem; font-weight: 500; font-size: 0.92rem;">${step.question}</div>
        <div class="case-choices">
          ${step.choices.map((ch, j) => {
            let cls = '';
            if (isAnswered) {
              if (j === answer) cls = ch.correct ? 'selected-correct locked' : 'selected-wrong locked';
              else cls = 'locked';
            }
            return `<div class="case-choice ${cls}" data-step="${i}" data-choice="${j}">
              <span style="font-family: 'IBM Plex Mono', monospace; color: var(--amber-3); font-weight: 600;">${String.fromCharCode(65 + j)}</span>
              <span>${ch.text}</span>
            </div>`;
          }).join('')}
        </div>
        ${isAnswered ? `<div class="case-feedback">
          <span style="font-family: 'IBM Plex Mono', monospace; font-size: 0.7rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--navy); font-weight: 600; margin-right: 0.4rem;">Razonamiento</span>
          ${step.choices[answer].why}
        </div>` : ''}
      </div>`;
    });
    // Diagnóstico final si todos los pasos están respondidos
    const allAnswered = s.answers.filter(a => a !== undefined).length === c.steps.length;
    if (allAnswered) {
      html += `<div class="case-final">
        <div class="lbl">Diagnóstico y plan</div>
        <div class="dx">${c.final.dx}</div>
        <div style="font-size: 0.9rem; color: var(--text-2); line-height: 1.5;">${c.final.recommendation}</div>
      </div>`;
    }
    container.innerHTML = html;
    // Bind clicks
    container.querySelectorAll('.case-choice:not(.locked)').forEach(el => {
      el.addEventListener('click', () => {
        const step = parseInt(el.getAttribute('data-step'));
        const choice = parseInt(el.getAttribute('data-choice'));
        s.answers[step] = choice;
        // Avanzar al siguiente paso si esta respuesta era correcta O si el usuario acaba de contestar
        if (step === s.revealed) s.revealed = Math.min(s.revealed + 1, c.steps.length - 1);
        renderCase();
      });
    });
  }

  selector.addEventListener('click', e => {
    if (e.target.tagName !== 'BUTTON') return;
    document.querySelectorAll('#caseSelector button').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    currentCase = parseInt(e.target.getAttribute('data-case'));
    renderCase();
  });

  renderCase();
})();

/* --------- 6b. ATLAS DE INFORMES MODELO --------- */
const ATLAS = {
  normal: {
    label: 'Normal (referencia)',
    patient: 'Varón sano, 42 años, 75 kg, 175 cm. Deportista recreativo. Sin antecedentes.',
    protocol: 'Cicloergómetro, rampa 20 W/min, duración 10 min 15 s.',
    stop: 'RER 1.18, Borg 19/20, agotamiento voluntario. Sin criterios objetivos de detención.',
    results: [
      ['V̇O₂ pico', '38 mL/kg/min', '110% pred'],
      ['AT', '68% V̇O₂max pred', 'Normal (&gt;40%)'],
      ['Pulso O₂', '18 mL/lat', '105%, ascenso progresivo'],
      ['V̇E/V̇CO₂ slope', '24', 'Normal (&lt;30)'],
      ['Reserva ventilatoria', '48%', 'Conservada'],
      ['ΔV̇O₂/ΔWR', '10.5 mL/min/W', 'Normal'],
      ['HRR1', '28 lpm', 'Normal (&gt;12)'],
      ['SpO₂', '98% → 97%', 'Estable'],
      ['PETCO₂', '36 → 44 mmHg', 'Bifásico normal'],
      ['Patrón Vt/FR', 'Vt 2.8 L, FR pico 38 rpm', 'Normal']
    ],
    wasserman: 'normal',
    interpretation: 'Prueba de esfuerzo cardiopulmonar máxima y de alta calidad técnica. Capacidad aeróbica preservada por encima del predicho. Umbral anaeróbico en rango normal. Pulso de O₂ con morfología y valor adecuados. Eficiencia ventilatoria normal. Sin alteraciones del intercambio gaseoso ni respuesta hemodinámica anómala. Sin cambios electrocardiográficos durante el ejercicio.',
    conclusion: 'Capacidad funcional aeróbica normal-alta para la edad. Sin datos de limitación cardiovascular, ventilatoria ni metabólica.',
    recommendations: 'No se requieren exploraciones adicionales relacionadas con el estudio funcional. Continuar actividad física regular.',
    keyFindings: [
      'V̇O₂ pico &gt;100% del predicho — capacidad aeróbica preservada.',
      'AT &gt;40% del V̇O₂max predicho — reserva submáxima adecuada.',
      'Pulso de O₂ con morfología ascendente normal — función del VI preservada.',
      'V̇E/V̇CO₂ slope &lt;30 — eficiencia ventilatoria normal.',
      'HRR1 &gt;12 lpm — tono vagal preservado.'
    ]
  },
  deconditioning: {
    label: 'Desacondicionamiento físico',
    patient: 'Mujer de 52 años, profesora. Sedentaria post-pandemia. Sin antecedentes CV. Espirometría, ECG, eco: normales.',
    protocol: 'Cicloergómetro, rampa 15 W/min, duración 9 min 20 s.',
    stop: 'RER 1.15, Borg 9/10 por fatiga muscular generalizada. Sin criterios cardiopulmonares de detención.',
    results: [
      ['V̇O₂ pico', '23.8 mL/kg/min', '88% pred'],
      ['AT', '45% V̇O₂max pred', '<span class="danger">Bajo</span>'],
      ['Pulso O₂', '11.0 mL/lat', '92%, <strong>ascenso normal</strong>'],
      ['V̇E/V̇CO₂ slope', '26', 'Normal'],
      ['Reserva ventilatoria', '36%', 'Conservada'],
      ['ΔV̇O₂/ΔWR', '9.8 mL/min/W', 'Normal'],
      ['HRR1', '24 lpm', 'Normal'],
      ['SpO₂', '98% → 98%', 'Estable'],
      ['PETCO₂', '35 → 41 → 35 mmHg', 'Bifásico normal'],
      ['Patrón Vt/FR', 'Vt 2.05 L, FR pico 36 rpm', 'Normal']
    ],
    wasserman: 'deconditioning',
    interpretation: 'Prueba técnicamente válida con esfuerzo máximo voluntario alcanzado. V̇O₂ pico levemente reducido con umbral anaeróbico bajo respecto al predicho — datos que, junto con la detención por fatiga muscular, orientan a limitación submáxima no orgánica. El pulso de O₂, pese a su valor absoluto reducido, mantiene morfología ascendente normal, lo que <strong>descarta limitación cardiovascular estructural</strong>. La eficiencia ventilatoria normal y la ausencia de desaturación descartan compromiso vascular pulmonar o parenquimatoso.',
    conclusion: 'Patrón compatible con desacondicionamiento físico de intensidad leve-moderada. Sin datos de patología cardiopulmonar orgánica.',
    recommendations: 'Programa de ejercicio aeróbico supervisado con intensidad inicial al 60-70% de la FC alcanzada (equivalente al AT). Reevaluación clínica a los 3-6 meses. Si persisten síntomas, considerar reevaluación.',
    keyFindings: [
      'V̇O₂ pico y AT bajos — limitación funcional objetivada.',
      '<strong>Pulso de O₂ absoluto bajo pero con morfología ascendente normal</strong> — clave para descartar cardiopatía.',
      'V̇E/V̇CO₂ slope normal — descarta HP oculta e IC significativa.',
      'Sin desaturación, reserva ventilatoria conservada — descarta patología pulmonar.',
      'Detención por fatiga muscular sin criterios objetivos — típico del desacondicionamiento.'
    ]
  },
  hf: {
    label: 'Insuficiencia cardíaca con FEr',
    patient: 'Varón de 68 años. Miocardiopatía dilatada, FEVI 30%. Tratamiento óptimo (sacubitril/valsartán + β-bloqueante + ARM + iSGLT2). NYHA III.',
    protocol: 'Cicloergómetro, rampa 10 W/min, duración 7 min 40 s.',
    stop: 'Disnea 10/10 Borg y fatiga. RER 1.12.',
    results: [
      ['V̇O₂ pico', '11.2 mL/kg/min', '<span class="danger">42% pred (Weber C)</span>'],
      ['AT', '28% V̇O₂max pred', '<span class="danger">Muy bajo</span>'],
      ['Pulso O₂', '8.5 mL/lat', '<span class="danger">55%, meseta precoz</span>'],
      ['V̇E/V̇CO₂ slope', '42', '<span class="danger">VC II (Arena)</span>'],
      ['Reserva ventilatoria', '45%', 'Conservada'],
      ['ΔV̇O₂/ΔWR', '6 mL/min/W', '<span class="danger">Reducido</span>'],
      ['HRR1', '8 lpm', '<span class="danger">Disautonomía</span>'],
      ['Reserva cronotrópica', '78%', 'Reducida (β-bloqueo)'],
      ['Oscilación ventilatoria', 'Presente', '<span class="danger">Marcador adverso</span>'],
      ['PETCO₂ basal', '32 mmHg', 'Bajo']
    ],
    wasserman: 'hf',
    interpretation: 'Prueba limitada con esfuerzo próximo al máximo. V̇O₂ pico y AT severamente reducidos. Pulso de O₂ con meseta precoz al 55% del esfuerzo, concordante con limitación al aumento del volumen sistólico. ΔV̇O₂/ΔWR reducido refleja fallo del acoplamiento aporte-demanda. V̇E/V̇CO₂ slope de 42 (Clase VC II de Arena) y oscilación ventilatoria periódica configuran un perfil pronóstico adverso. HRR1 baja refleja disautonomía.',
    conclusion: 'Limitación cardiovascular severa con marcadores pronósticos adversos (slope elevado, oscilación ventilatoria, HRR1 baja). Perfil funcional compatible con IC avanzada.',
    recommendations: '<strong>Derivación a comité de trasplante cardíaco</strong>. V̇O₂ pico &lt;14 mL/kg/min cumple criterio funcional clásico. Valorar también soporte circulatorio mecánico si evoluciona desfavorablemente.',
    keyFindings: [
      'V̇O₂ pico &lt;14 mL/kg/min — <strong>umbral clásico para trasplante cardíaco</strong>.',
      'Pulso de O₂ con meseta precoz — limitación al VS por disfunción ventricular.',
      'V̇E/V̇CO₂ slope ≥36 — <strong>mejor predictor pronóstico independiente que el V̇O₂max</strong>.',
      'HRR1 &lt;12 lpm — disautonomía (Cole, NEJM 1999).',
      'Oscilación ventilatoria — marcador pronóstico adicional.'
    ]
  },
  hfpef: {
    label: 'IC con FE preservada',
    patient: 'Mujer de 72 años. HTA, DM2, obesidad grado II. FEVI 62% con disfunción diastólica grado II. NT-proBNP 850 pg/mL.',
    protocol: 'Cicloergómetro, rampa 10 W/min, duración 8 min 10 s.',
    stop: 'Disnea 9/10, RER 1.11.',
    results: [
      ['V̇O₂ pico', '14 mL/kg/min', '62% pred'],
      ['AT', '38% V̇O₂max pred', 'Bajo'],
      ['Pulso O₂', '10.5 mL/lat', '<span class="danger">70%, meseta precoz</span>'],
      ['V̇E/V̇CO₂ slope', '34', '<span class="danger">VC I (Arena)</span>'],
      ['Reserva ventilatoria', '42%', 'Conservada'],
      ['ΔV̇O₂/ΔWR', '8 mL/min/W', 'Levemente reducido'],
      ['HRR1', '10 lpm', '<span class="danger">Bajo</span>'],
      ['PETCO₂ basal', '35 mmHg', 'Normal'],
      ['SpO₂', '96% → 95%', 'Estable'],
      ['Patrón ventilatorio', 'FR pico 32 rpm', 'Normal']
    ],
    wasserman: 'hf',
    interpretation: 'Limitación funcional moderada. Pulso de O₂ con meseta precoz y ΔV̇O₂/ΔWR levemente reducido orientan a limitación cardiovascular, aunque menos marcada que en IC-FEr. V̇E/V̇CO₂ slope en Clase I (leve) y HRR1 reducida completan un perfil compatible con IC con FE preservada en estadio sintomático. Ausencia de desaturación y reserva ventilatoria conservada descartan componente pulmonar.',
    conclusion: 'Perfil funcional compatible con IC-FEp sintomática (NYHA II-III). La CPET apoya el diagnóstico que la clínica, el NT-proBNP elevado y la disfunción diastólica ecocardiográfica sugerían.',
    recommendations: 'Optimizar iSGLT2 (empagliflozina o dapagliflozina). Control estricto de PA, DM y peso. Rehabilitación cardíaca supervisada. Reevaluación a los 6 meses con CPET.',
    keyFindings: [
      'Pulso de O₂ con meseta precoz — limitación cardiovascular, aunque sin FE deprimida.',
      'V̇E/V̇CO₂ slope levemente elevado — inicio de ineficiencia ventilatoria.',
      'HRR1 reducida — disautonomía incipiente.',
      'Patrón ventilatorio y SpO₂ normales — descarta componente pulmonar primario.',
      'La CPET es útil para detectar IC-FEp subclínica cuando el eco en reposo no es concluyente.'
    ]
  },
  ph: {
    label: 'Hipertensión arterial pulmonar (grupo 1)',
    patient: 'Mujer de 38 años. HAP idiopática confirmada por cateterismo (PAPm 45 mmHg, PAWP 8, RVP 10 UW). NYHA III. Terapia dual oral.',
    protocol: 'Cicloergómetro, rampa 10 W/min, duración 8 min.',
    stop: 'Disnea 9/10, mareo leve. RER 1.09.',
    results: [
      ['V̇O₂ pico', '10.5 mL/kg/min', '<span class="danger">46% pred</span>'],
      ['AT', '26% V̇O₂max pred', '<span class="danger">Muy bajo</span>'],
      ['Pulso O₂', '7.0 mL/lat', '<span class="danger">52%, meseta precoz</span>'],
      ['V̇E/V̇CO₂ slope', '52', '<span class="danger">VC III (Arena)</span>'],
      ['Reserva ventilatoria', '38%', 'Conservada'],
      ['ΔV̇O₂/ΔWR', '6 mL/min/W', '<span class="danger">Fallo del VD</span>'],
      ['PETCO₂ basal', '25 mmHg', '<span class="danger">Muy bajo, no asciende</span>'],
      ['SpO₂', '96% → 88%', '<span class="danger">Desaturación</span>'],
      ['TA pico', '140/80', 'Respuesta normal'],
      ['FC pico', '155 lpm (92%)', 'Normal']
    ],
    wasserman: 'ph',
    interpretation: 'Limitación funcional severa. V̇E/V̇CO₂ slope severamente elevado (Clase VC III), PETCO₂ basal muy reducido que no se eleva con el ejercicio, ΔV̇O₂/ΔWR reducido y desaturación con esfuerzo configuran la <strong>firma clásica de la HAP</strong>: espacio muerto marcadamente aumentado por hipoperfusión de territorios ventilados, hiperventilación crónica compensatoria y fallo del VD para incrementar el gasto cardíaco. Pulso de O₂ con meseta precoz consistente con limitación del VS por fallo del VD.',
    conclusion: 'Patrón funcional de HAP de riesgo <strong>intermedio-alto</strong> según criterios CPET ESC/ERS 2022. Perfil poco favorable pese a terapia dual.',
    recommendations: '<strong>Escalada a terapia triple con prostanoide</strong> (treprostinil SC o IV, selexipag oral). Reevaluación clínica + hemodinámica + CPET + eco a los 3 meses. Si no alcanza perfil de bajo riesgo, considerar valoración para trasplante pulmonar.',
    keyFindings: [
      'V̇E/V̇CO₂ slope &gt;45 — espacio muerto muy aumentado.',
      '<strong>PETCO₂ basal &lt;33 mmHg que no asciende</strong> — firma de HP.',
      'ΔV̇O₂/ΔWR reducido — fallo del VD para aumentar el gasto.',
      'Desaturación con esfuerzo — <em>shunt</em> derecha-izquierda por FOP posible.',
      'Pulso de O₂ con meseta precoz — VS del VD limitado.'
    ]
  },
  cteph: {
    label: 'HP tromboembólica crónica',
    patient: 'Varón de 55 años. Antecedente de TEP hace 3 años. Disnea progresiva. Eco: PAPm 55 mmHg, VD dilatado. Gammagrafía V/Q: múltiples defectos de perfusión segmentarios (mismatch).',
    protocol: 'Cicloergómetro, rampa 10 W/min, duración 7 min.',
    stop: 'Disnea 9/10 + mareo. RER 1.08.',
    results: [
      ['V̇O₂ pico', '12 mL/kg/min', '<span class="danger">48% pred</span>'],
      ['AT', '24% V̇O₂max pred', '<span class="danger">Muy bajo</span>'],
      ['Pulso O₂', '7.5 mL/lat', '<span class="danger">56%, meseta muy precoz</span>'],
      ['V̇E/V̇CO₂ slope', '<strong>62</strong>', '<span class="danger">VC IV (extremo)</span>'],
      ['PETCO₂ basal', '22 mmHg', '<span class="danger">Extremadamente bajo</span>'],
      ['V̇E/V̇CO₂ basal (reposo)', '48', '<span class="danger">Ya elevado en reposo</span>'],
      ['ΔV̇O₂/ΔWR', '5.5 mL/min/W', '<span class="danger">Severamente reducido</span>'],
      ['SpO₂', '94% → 83%', '<span class="danger">Desaturación marcada</span>'],
      ['Cinética recup. V̇O₂', 'τ &gt; 90 s', '<span class="danger">Muy prolongada</span>'],
      ['Reserva ventilatoria', '35%', 'Conservada']
    ],
    wasserman: 'cteph',
    interpretation: 'Prueba interrumpida precozmente. Perfil funcional severo con marcada ineficiencia ventilatoria <strong>desde el inicio del ejercicio</strong> (slope basal ya elevado, PETCO₂ extremadamente bajo en reposo) — hallazgo diferencial frente a la HAP idiopática. El espacio muerto fisiológico elevado refleja zonas pulmonares ventiladas pero <strong>no perfundidas</strong> por organización fibrosa de émbolos crónicos. Cinética de recuperación de V̇O₂ muy prolongada característica del fallo del VD.',
    conclusion: 'Firma funcional de CTEPH severa. La magnitud del slope y de la hiperventilación basal diferencia este cuadro de HAP idiopática y refuerza el diagnóstico que la gammagrafía V/Q confirmó.',
    recommendations: '<strong>Derivación urgente a centro experto en CTEPH</strong> para evaluación de endarterectomía pulmonar (PEA) — procedimiento potencialmente curativo. Si no operable: angioplastia pulmonar con balón (BPA) y/o riociguat. Anticoagulación indefinida.',
    keyFindings: [
      'V̇E/V̇CO₂ slope <strong>&gt;50</strong> — más elevado que en HAP idiopática.',
      'Ineficiencia ventilatoria <strong>basal</strong>, no solo tras el AT.',
      'PETCO₂ extremadamente bajo (&lt;28 mmHg) y sin ascenso.',
      'Desaturación marcada con esfuerzo.',
      'La CPET es sensible para detectar HP residual post-endarterectomía.'
    ]
  },
  exph: {
    label: 'HP del ejercicio',
    patient: 'Mujer de 48 años con esclerosis sistémica limitada. Disnea de esfuerzo progresiva. Eco en reposo: PAPm estimada 25 mmHg (límite normal), VD de tamaño normal.',
    protocol: 'Cicloergómetro, rampa 15 W/min, duración 9 min.',
    stop: 'Disnea 8/10. RER 1.14.',
    results: [
      ['V̇O₂ pico', '18 mL/kg/min', '76% pred (levemente bajo)'],
      ['AT', '38% V̇O₂max pred', 'Levemente bajo'],
      ['Pulso O₂', '11 mL/lat', '82%, meseta tardía'],
      ['V̇E/V̇CO₂ slope', '<strong>36</strong>', '<span class="highlight">VC II (límite moderado)</span>'],
      ['PETCO₂ basal', '34 mmHg', 'Normal-bajo'],
      ['Comportamiento PETCO₂', 'No asciende con ejercicio', '<span class="highlight">Respuesta plana</span>'],
      ['ΔV̇O₂/ΔWR', '8.5 mL/min/W', 'Levemente reducido'],
      ['SpO₂', '97% → 94%', 'Caída leve'],
      ['Reserva ventilatoria', '38%', 'Conservada'],
      ['Patrón Vt/FR', 'FR pico 40 rpm', 'Levemente rápido']
    ],
    wasserman: 'exph',
    interpretation: 'Prueba técnicamente adecuada. Hallazgos sutiles pero convergentes hacia compromiso vascular pulmonar incipiente: V̇E/V̇CO₂ slope en rango límite, PETCO₂ con respuesta plana durante el ejercicio (en el sujeto normal debería ascender hasta ~44 en el AT), caída leve de SpO₂ y ΔV̇O₂/ΔWR levemente reducido. En contexto de esclerosis sistémica (grupo de riesgo), estos hallazgos obligan a descartar <strong>HP del ejercicio</strong>.',
    conclusion: 'Hallazgos CPET sugestivos de HP del ejercicio en paciente con esclerosis sistémica. Requiere confirmación hemodinámica.',
    recommendations: '<strong>Cateterismo cardíaco derecho con ejercicio</strong> para confirmar HP del ejercicio (PAPm/GC &gt;3 mmHg/L/min, criterio ESC/ERS 2022). Seguimiento semestral en consulta especializada en HP. Considerar cribado seriado con CPET en esclerosis sistémica.',
    keyFindings: [
      'V̇E/V̇CO₂ slope en rango límite 30-38 — ni claramente normal ni HP franca.',
      '<strong>PETCO₂ con respuesta plana</strong> al ejercicio — ineficiencia ventilatoria incipiente.',
      'Caída leve de SpO₂ con esfuerzo — compromiso vascular pulmonar incipiente.',
      'Diagnóstico definitivo requiere cateterismo con ejercicio.',
      'La CPET es sensible para HP preclínica en poblaciones de riesgo (esclerodermia, familiares de HAP, VIH, portadores de BMPR2).'
    ]
  },
  copd: {
    label: 'EPOC severo',
    patient: 'Varón de 65 años, ex-fumador 50 paquetes-año. FEV₁ 42% predicho, FEV₁/FVC 0.52 (GOLD III). mMRC 3. Terapia triple inhalada.',
    protocol: 'Cicloergómetro, rampa 10 W/min, duración 6 min.',
    stop: 'Disnea incapacitante 10/10, no criterios de detención cardiológicos. RER 1.05.',
    results: [
      ['V̇O₂ pico', '14 mL/kg/min', '55% pred'],
      ['AT', 'No identificable', '-'],
      ['Pulso O₂', '10 mL/lat', '75%, ascenso lento'],
      ['V̇E/V̇CO₂ slope', '34', 'Levemente elevado'],
      ['V̇E pico', '45 L/min', '<span class="danger">98% MVV (sin reserva)</span>'],
      ['Reserva ventilatoria', '<strong>&lt;5%</strong>', '<span class="danger">Ausente — limitación mecánica</span>'],
      ['Capacidad inspiratoria', '2.5 → 1.6 L', '<span class="danger">Atrapamiento dinámico</span>'],
      ['Patrón Vt/FR', 'Vt 1.2 L, FR 36 rpm', 'Vt limitado'],
      ['SpO₂', '92% → 86%', '<span class="danger">Desaturación</span>'],
      ['PETCO₂ basal', '44 mmHg', 'Levemente alto (retenedor)']
    ],
    wasserman: 'copd',
    interpretation: 'Prueba de corta duración limitada por disnea. Reserva ventilatoria agotada con V̇E pico próxima al MVV teórico. Caída marcada de la capacidad inspiratoria durante el ejercicio indica <strong>atrapamiento aéreo dinámico</strong>. Patrón ventilatorio con Vt limitado y FR alta. Desaturación significativa con esfuerzo. V̇E/V̇CO₂ slope levemente elevado por aumento del espacio muerto. Sin datos de limitación cardiovascular primaria.',
    conclusion: 'Patrón mixto: limitación ventilatoria mecánica (dominante) con componente de hipoxemia de esfuerzo. Perfil típico del EPOC severo con atrapamiento dinámico.',
    recommendations: '<strong>Rehabilitación pulmonar supervisada</strong> (indicación de alta prioridad). Titulación de oxigenoterapia con esfuerzo. Optimizar farmacología inhalada. Vacunaciones. Si FEV₁ &lt;30% y/o DLCO &lt;30%, considerar evaluación para trasplante pulmonar.',
    keyFindings: [
      '<strong>Reserva ventilatoria &lt;15%</strong> o nula — limitación mecánica dominante.',
      '<strong>Atrapamiento dinámico</strong> por caída de la capacidad inspiratoria durante el ejercicio.',
      'Vt limitado y FR alta — patrón ventilatorio con restricción funcional.',
      'Desaturación con esfuerzo — compromiso del intercambio gaseoso.',
      'La CPET en EPOC guía la prescripción de rehabilitación y la decisión de oxigenoterapia.'
    ]
  },
  ild: {
    label: 'Enfermedad pulmonar intersticial',
    patient: 'Varón de 60 años. Fibrosis pulmonar idiopática. FVC 65% predicho, DLCO 45%. Tratamiento antifibrótico (nintedanib).',
    protocol: 'Cicloergómetro, rampa 10 W/min, duración 7 min 30 s.',
    stop: 'Disnea 9/10, desaturación significativa. RER 1.08.',
    results: [
      ['V̇O₂ pico', '13 mL/kg/min', '52% pred'],
      ['AT', '28% V̇O₂max pred', 'Bajo'],
      ['Pulso O₂', '9 mL/lat', '70%, ascenso lento'],
      ['V̇E/V̇CO₂ slope', '42', '<span class="danger">VC II (Arena)</span>'],
      ['PETCO₂ basal', '30 mmHg', 'Bajo'],
      ['Reserva ventilatoria', '22%', 'Reducida'],
      ['Patrón Vt/FR', '<strong>Vt 0.9 L, FR 48 rpm</strong>', '<span class="danger">Rápido y superficial</span>'],
      ['SpO₂', '94% → 82%', '<span class="danger">Desaturación profunda</span>'],
      ['ΔV̇O₂/ΔWR', '7 mL/min/W', 'Reducido'],
      ['Vt / CV', '35%', '<span class="danger">Muy limitado</span>']
    ],
    wasserman: 'ild',
    interpretation: 'Perfil funcional severo con limitación integrada. <strong>Patrón ventilatorio restrictivo clásico</strong> (rápido y superficial) desde el inicio del ejercicio, con Vt severamente limitado. V̇E/V̇CO₂ slope elevado por aumento del espacio muerto (zonas ventiladas con V/Q alto). Desaturación profunda con esfuerzo refleja compromiso del intercambio alveolo-capilar por fibrosis. Reserva ventilatoria reducida sin agotarse (lo que diferencia de EPOC: aquí la limitación es por volumen, no por techo de V̇E).',
    conclusion: 'Patrón restrictivo con compromiso del intercambio gaseoso. Firma clásica de EPID avanzada con componente vascular pulmonar.',
    recommendations: '<strong>Prescribir oxigenoterapia con esfuerzo</strong> (SpO₂ nadir &lt;88% con desaturación &gt;10%). Rehabilitación pulmonar. Ecocardiograma dirigido a HP secundaria (grupo 3). Evaluación para trasplante pulmonar si progresión. Mantener antifibrótico.',
    keyFindings: [
      '<strong>Patrón rápido-superficial</strong> (Vt limitado, FR alta) desde el inicio.',
      'V̇E/V̇CO₂ slope elevado — espacio muerto por mismatch V/Q.',
      '<strong>Desaturación profunda con esfuerzo</strong> — compromiso del intercambio.',
      'PETCO₂ basal bajo — hiperventilación compensatoria.',
      'La CPET es la mejor prueba para titular oxígeno al esfuerzo en EPID.'
    ]
  },
  cpfe: {
    label: 'CPFE (enfisema + fibrosis)',
    patient: 'Varón de 68 años, ex-fumador 60 paquetes-año. TC: enfisema centrolobulillar + fibrosis basal. FEV₁ 55%, FVC 70%, DLCO 38%. mMRC 3.',
    protocol: 'Cicloergómetro, rampa 10 W/min, duración 6 min 30 s.',
    stop: 'Disnea 10/10, desaturación. RER 1.06.',
    results: [
      ['V̇O₂ pico', '12 mL/kg/min', '48% pred'],
      ['AT', 'No identificable', '-'],
      ['Pulso O₂', '8.5 mL/lat', '65%, meseta precoz'],
      ['V̇E/V̇CO₂ slope', '38', '<span class="danger">VC II</span>'],
      ['Reserva ventilatoria', '20%', 'Reducida'],
      ['Capacidad inspiratoria', '2.1 → 1.5 L', '<span class="danger">Atrapamiento</span>'],
      ['Patrón Vt/FR', 'Vt 1.0 L, FR 42 rpm', 'Mixto'],
      ['SpO₂', '93% → 82%', '<span class="danger">Desaturación profunda</span>'],
      ['PETCO₂ basal', '38 mmHg', 'Normal-alto'],
      ['PSAP eco', '48 mmHg', '<span class="danger">HP secundaria</span>']
    ],
    wasserman: 'ild',
    interpretation: 'Patrón funcional mixto característico de CPFE. Coexisten elementos de los dos componentes de la enfermedad: atrapamiento dinámico (del enfisema) con desaturación profunda y slope elevado (de la fibrosis + HP secundaria). La reserva ventilatoria es menor de lo esperable para el FEV₁ aislado, por la coexistencia de la restricción. Pulso de O₂ con meseta precoz y PSAP elevada en eco indican HP secundaria asociada.',
    conclusion: 'Enfermedad pulmonar mixta (CPFE) con HP secundaria (grupo 3). Pronóstico peor que cualquier componente aislado.',
    recommendations: 'Oxigenoterapia con esfuerzo. Rehabilitación pulmonar. Cateterismo cardíaco derecho para confirmar HP y clasificar. Si HP precapilar significativa, discutir riociguat (contraindicado en HP del grupo 3 según guías actuales, individualizar). Valoración para trasplante pulmonar.',
    keyFindings: [
      'Patrón mixto: atrapamiento + desaturación + slope elevado.',
      'Pulso de O₂ con meseta precoz + PSAP elevada = HP secundaria asociada.',
      'La CPET es irremplazable para separar los componentes de una enfermedad pulmonar compleja.',
      'Mayor compromiso funcional que el esperado por cada componente aislado.',
      'Perfil que justifica evaluación urgente para trasplante.'
    ]
  },
  obesity: {
    label: 'Obesidad sin cardiopatía',
    patient: 'Mujer de 50 años, IMC 36 kg/m². Sin antecedentes CV ni respiratorios. Disnea de esfuerzo moderada. Eco y espirometría normales.',
    protocol: 'Cicloergómetro, rampa 15 W/min, duración 8 min 30 s.',
    stop: 'Fatiga de piernas 9/10, Borg disnea 7/10. RER 1.17.',
    results: [
      ['V̇O₂ pico (absoluto)', '2.1 L/min', 'Normal para la carga'],
      ['V̇O₂ pico (indexado)', '20 mL/kg/min', '68% pred por kg total'],
      ['V̇O₂ pico (masa magra)', '28 mL/kg/min', 'Normal cuando se corrige por masa magra'],
      ['AT', '48% V̇O₂max pred', 'Normal'],
      ['Pulso O₂', '14 mL/lat', '95%, ascenso normal'],
      ['V̇E/V̇CO₂ slope', '28', 'Normal'],
      ['Reserva ventilatoria', '32%', 'Conservada'],
      ['SpO₂', '97% → 96%', 'Estable'],
      ['Trabajo mecánico extra', 'Alto', 'Coste O₂ aumentado del movimiento'],
      ['V̇O₂ basal', '4.5 mL/kg/min', 'Elevado (vs. 3.5 normal)']
    ],
    wasserman: 'deconditioning',
    interpretation: 'Prueba de alta calidad técnica. V̇O₂ pico indexado por kg de peso total aparenta reducción, pero al corregir por masa magra (o expresar en términos absolutos para la carga desarrollada) resulta en rango normal. AT y pulso de O₂ con morfología y valor normales. V̇E/V̇CO₂ slope normal. El coste metabólico elevado del trabajo mecánico extra que implica mover la masa corporal explica la disnea subjetiva sin que exista limitación orgánica.',
    conclusion: 'Capacidad funcional preservada tras ajuste por masa magra. La disnea de esfuerzo tiene origen primariamente biomecánico (sobrecarga mecánica por obesidad), sin datos de patología cardiopulmonar.',
    recommendations: 'Programa estructurado de pérdida de peso + ejercicio aeróbico supervisado. Reevaluación funcional tras pérdida significativa de peso. Considerar cribado de IC-FEp y de síndrome de apnea obstructiva del sueño, altamente prevalentes en este perfil.',
    keyFindings: [
      '<strong>Indexar V̇O₂ por peso total subestima la capacidad real</strong> en obesidad.',
      'Patrón CPET normal cuando se corrige adecuadamente por masa magra.',
      'La obesidad por sí sola produce disnea sin patología orgánica subyacente.',
      'La CPET descarta IC-FEp subclínica, HP y limitación pulmonar que suelen asociarse.',
      'En obesidad grado III (IMC ≥40), considerar también cinta rodante dificultosa; cicloergómetro es preferible.'
    ]
  }
};

(function initAtlas() {
  const selector = document.getElementById('atlasSelector');
  const content = document.getElementById('atlasContent');
  if (!selector || !content) return;

  let currentKey = 'normal';

  // Referencias a estructuras del widget Wasserman existente
  const PANELS_META = [
    { n: 1, title: 'V̇E vs. t' },
    { n: 2, title: 'FC · O₂-pulse' },
    { n: 3, title: 'V̇O₂ vs. WR' },
    { n: 4, title: 'V̇E vs. V̇CO₂' },
    { n: 5, title: 'FC vs. V̇O₂' },
    { n: 6, title: 'V-slope' },
    { n: 7, title: 'Vt vs. V̇E' },
    { n: 8, title: 'Equiv. ventil.' },
    { n: 9, title: 'PETO₂/CO₂' }
  ];

  function css(v) {
    return getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  }

  // Reutilizar la lógica del panel de 9 — PATTERNS y generateCurve ya están definidos
  // dentro del IIFE anterior, así que replicamos la función de generación local
  // (puente para no depender del closure anterior)
  const PATTERNS_ATLAS = {
    normal: { slopeMod: 1.0, o2pulseMod: 1.0, veCo2Mod: 25, petCo2Mod: 40 },
    deconditioning: { slopeMod: 0.6, o2pulseMod: 0.7, veCo2Mod: 26, petCo2Mod: 39 },
    hf: { slopeMod: 0.5, o2pulseMod: 0.5, veCo2Mod: 42, petCo2Mod: 34, o2pulsePlateau: true, oscillation: true },
    ph: { slopeMod: 0.55, o2pulseMod: 0.65, veCo2Mod: 48, petCo2Mod: 28, dropSat: true, o2pulsePlateau: true },
    cteph: { slopeMod: 0.5, o2pulseMod: 0.6, veCo2Mod: 55, petCo2Mod: 26, dropSat: true, o2pulsePlateau: true },
    exph: { slopeMod: 0.75, o2pulseMod: 0.85, veCo2Mod: 34, petCo2Mod: 34 },
    copd: { slopeMod: 0.65, o2pulseMod: 0.75, veCo2Mod: 32, petCo2Mod: 42, veLimit: true },
    ild: { slopeMod: 0.65, o2pulseMod: 0.75, veCo2Mod: 40, petCo2Mod: 34, rapidShallow: true, dropSat: true }
  };

  function generateCurveAtlas(panelN, pattern) {
    const p = PATTERNS_ATLAS[pattern] || PATTERNS_ATLAS.normal;
    const points = [];
    const N = 30;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      let x = t, y;
      switch (panelN) {
        case 1: y = p.veLimit && t > 0.7 ? 0.72 : (Math.pow(t, 1.6) * (0.8 + p.slopeMod * 0.2)); break;
        case 2: y = (p.o2pulsePlateau && t > 0.6) ? 0.6 * p.o2pulseMod : Math.pow(t, 0.7) * p.o2pulseMod * 0.85; break;
        case 3: y = t * p.slopeMod; break;
        case 4: y = t * (p.veCo2Mod / 30); break;
        case 5: y = Math.min(1, t * (1.0 / p.slopeMod) * 0.9); break;
        case 6: y = t < 0.5 ? t * 0.95 : Math.min(1, 0.475 + (t - 0.5) * 1.8); break;
        case 7: y = p.rapidShallow ? 0.4 * (1 - Math.exp(-t * 3)) : (t < 0.5 ? t * 1.6 : 0.8); break;
        case 8: y = t < 0.4 ? 0.6 - t * 0.3 : Math.min(1, 0.5 + (t - 0.4) * (p.veCo2Mod / 60)); break;
        case 9:
          const petBase = (p.petCo2Mod - 25) / 25;
          y = t < 0.5 ? petBase + t * 0.15 : petBase + 0.075 - (t - 0.5) * 0.15;
          if (p.dropSat === true && t > 0.6) y -= (t - 0.6) * 0.3;
          break;
      }
      points.push([x, y]);
    }
    if (panelN === 1 && p.oscillation) {
      for (let i = 0; i < points.length; i++) {
        points[i][1] += Math.sin(points[i][0] * Math.PI * 6) * 0.08;
      }
    }
    return points;
  }

  function renderMiniPanelAtlas(panelN, pattern) {
    const points = generateCurveAtlas(panelN, pattern);
    const W = 100, H = 42, padX = 6, padY = 4;
    const path = points.map(([x, y], i) => {
      const px = padX + x * (W - 2 * padX);
      const py = H - padY - Math.max(0, Math.min(1, y)) * (H - 2 * padY);
      return (i === 0 ? 'M' : 'L') + px.toFixed(1) + ',' + py.toFixed(1);
    }).join(' ');
    const strokeColor = pattern === 'normal' ? css('--navy') : css('--amber-3');
    return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
      <line x1="${padX}" y1="${H - padY}" x2="${W - padX}" y2="${H - padY}" stroke="${css('--border')}" stroke-width="0.5"/>
      <line x1="${padX}" y1="${padY}" x2="${padX}" y2="${H - padY}" stroke="${css('--border')}" stroke-width="0.5"/>
      <path d="${path}" fill="none" stroke="${strokeColor}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  }

  function render() {
    const data = ATLAS[currentKey];
    if (!data) return;

    const resultsHtml = data.results.map(([var_, val, note]) => `
      <tr>
        <td>${var_}</td>
        <td>${val}</td>
        <td style="color: var(--text-3); font-size: 0.78rem;">${note}</td>
      </tr>
    `).join('');

    const panelsHtml = PANELS_META.map(p => `
      <div class="atlas-mini-panel">
        <div class="label">P${p.n}</div>
        <div class="title">${p.title}</div>
        ${renderMiniPanelAtlas(p.n, data.wasserman)}
      </div>
    `).join('');

    content.innerHTML = `
      <div style="margin-bottom: 1rem;">
        <h3 style="margin: 0 0 0.25rem; font-family: 'Space Grotesk', sans-serif; color: var(--navy); font-size: 1.3rem;">${data.label}</h3>
        <p style="font-size: 0.9rem; color: var(--text-2); margin: 0;">${data.patient}</p>
      </div>

      <div class="atlas-report">
        <div class="atlas-section">
          <h4>Datos técnicos</h4>
          <p><strong>Protocolo:</strong> ${data.protocol}</p>
          <p><strong>Motivo de detención:</strong> ${data.stop}</p>
          <h4 style="margin-top: 0.85rem;">Resultados principales</h4>
          <table class="atlas-table">
            <thead><tr><th>Variable</th><th>Valor</th><th>Interpretación</th></tr></thead>
            <tbody>${resultsHtml}</tbody>
          </table>
        </div>

        <div class="atlas-wasserman">
          <h4>Panel de 9 de Wasserman — ${data.label}</h4>
          <div class="atlas-panel-grid">${panelsHtml}</div>
          <p style="font-size: 0.75rem; color: var(--text-3); margin-top: 0.6rem; font-style: italic;">Curvas prototípicas simplificadas. La línea del normal se muestra en azul; las patologías en ámbar. Para interacción detallada, ir a la Sección 5.</p>
        </div>
      </div>

      <div class="atlas-interpretation">
        <h4>Interpretación narrativa</h4>
        <p>${data.interpretation}</p>
      </div>

      <div class="atlas-interpretation" style="border-left-color: var(--success); background: linear-gradient(135deg, rgba(46, 125, 94, 0.08) 0%, rgba(46, 125, 94, 0.02) 100%);">
        <h4 style="color: var(--success);">Conclusión</h4>
        <p><strong>${data.conclusion}</strong></p>
        <p style="margin-top: 0.5rem;"><strong style="color: var(--amber-3);">Recomendaciones:</strong> ${data.recommendations}</p>
      </div>

      <div class="atlas-key-findings">
        <h4>Hallazgos clave a reconocer</h4>
        <ul>
          ${data.keyFindings.map(f => `<li>${f}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  selector.addEventListener('click', e => {
    if (e.target.tagName !== 'BUTTON') return;
    document.querySelectorAll('#atlasSelector button').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    currentKey = e.target.getAttribute('data-atlas');
    render();
  });

  window._atlas = { render };
  render();
})();

/* --------- 7. CHECKLIST DEL INFORME --------- */
(function initChecklist() {
  const items = document.querySelectorAll('#reportChecklist li');
  const fill = document.getElementById('checklistFill');
  const count = document.getElementById('checklistCount');
  const saved = JSON.parse(localStorage.getItem('cpet-checklist') || '[]');

  items.forEach(li => {
    const idx = parseInt(li.getAttribute('data-idx'));
    if (saved.includes(idx)) li.classList.add('checked');
    li.addEventListener('click', () => {
      li.classList.toggle('checked');
      updateProgress();
    });
  });

  function updateProgress() {
    const checked = Array.from(items).filter(li => li.classList.contains('checked'));
    const indexes = checked.map(li => parseInt(li.getAttribute('data-idx')));
    localStorage.setItem('cpet-checklist', JSON.stringify(indexes));
    const pct = (checked.length / items.length) * 100;
    fill.style.width = pct + '%';
    count.textContent = checked.length;
  }
  updateProgress();
})();

/* --------- 8. CUESTIONARIO CON PERSISTENCIA --------- */
const QUESTIONS = [
  { level:"basic", stem:"El acrónimo CPET corresponde a:", options:["Cardiopulmonary Exercise Testing","Cardiac Performance Evaluation Test","Continuous Pulmonary Exertion Test","Coronary Pulse and Ejection Test"], correct:0, explanation:"CPET = Cardiopulmonary Exercise Testing. En castellano se traduce como prueba de esfuerzo cardiopulmonar o ergoespirometría." },
  { level:"basic", stem:"La ecuación de Fick aplicada al ejercicio se puede escribir como:", options:["V̇O₂ = FR × Vt","V̇O₂ = GC × C(a-v̄)O₂","V̇O₂ = FC × TA","V̇O₂ = V̇E × FEO₂"], correct:1, explanation:"V̇O₂ = Gasto cardíaco × Diferencia arteriovenosa de oxígeno. Esta ecuación separa el componente de transporte (GC) del de extracción (Δa-v̄O₂), que es la base conceptual de toda la CPET." },
  { level:"basic", stem:"El ergómetro estándar en CPET clínica es:", options:["Cinta rodante","Cicloergómetro","Remoergómetro","Escalón"], correct:1, explanation:"El cicloergómetro es el estándar clínico por medición directa del trabajo en vatios y mejor calidad de monitorización (paciente sentado, ECG estable, TA fiable)." },
  { level:"basic", stem:"La duración óptima del ejercicio incremental (regla de Buchfuhrer) es:", options:["3-5 minutos","8-12 minutos","15-20 minutos","25-30 minutos"], correct:1, explanation:"Buchfuhrer 1983: 8-12 minutos. Menos subestima el V̇O₂max por cinética incompleta; más produce fatiga periférica prematura." },
  { level:"basic", stem:"El criterio más usado en CPET clínica para esfuerzo máximo es:", options:["FC pico ≥100% predicha","RER pico ≥1.10","V̇E pico ≥100 L/min","Lactato ≥5 mmol/L"], correct:1, explanation:"RER (V̇CO₂/V̇O₂) pico ≥1.10 es el criterio más usado y práctico. Los demás son criterios complementarios." },
  { level:"basic", stem:"¿Cuál es una contraindicación ABSOLUTA para CPET?", options:["Hipertensión arterial no controlada","Infarto agudo de miocardio hace 3 días","Fibrilación auricular controlada","EPOC severo"], correct:1, explanation:"IAM en los últimos 5 días es contraindicación absoluta. La HTA no controlada es relativa; la FA controlada y el EPOC severo son escenarios frecuentes de indicación." },
  { level:"basic", stem:"El V̇O₂max se expresa clínicamente PREFERENTEMENTE como:", options:["mL/min","mL/kg/min y % del predicho","% del VE","mmol/min"], correct:1, explanation:"Se debe reportar en mL/kg/min (permite comparar entre pesos) y como % del predicho (contextualiza por edad, sexo, talla)." },
  { level:"basic", stem:"El pulso de O₂ (V̇O₂/FC) es un subrogado de:", options:["Volumen minuto ventilatorio","Volumen sistólico","Difusión alveolo-capilar","Consumo periférico"], correct:1, explanation:"Reordenando Fick: V̇O₂/FC = VS × C(a-v̄)O₂. Como la C(a-v̄)O₂ aumenta de forma predecible durante el ejercicio, el pulso de O₂ es esencialmente un subrogado no invasivo del volumen sistólico." },
  { level:"basic", stem:"En el panel de Wasserman, ¿qué gráfica se usa para el método V-slope?", options:["V̇E vs. tiempo","V̇CO₂ vs. V̇O₂","FC vs. WR","Vt vs. V̇E"], correct:1, explanation:"El método V-slope de Beaver, Wasserman y Whipp (1986) identifica el AT en el punto de inflexión de la curva V̇CO₂ vs. V̇O₂." },
  { level:"basic", stem:"Un V̇O₂ pico &lt;14 mL/kg/min en IC:", options:["Es normal","Es el umbral clásico para valorar trasplante cardíaco","No tiene valor pronóstico","Indica esfuerzo submáximo"], correct:1, explanation:"El umbral clásico de Mancini (Circulation 1991) fue &lt;14 mL/kg/min como criterio para valorar trasplante (o &lt;12 si tolera β-bloqueantes)." },
  { level:"intermediate", stem:"V̇O₂ pico 70% predicho, pulso O₂ 65% pero con curva ascendente normal, V̇E/V̇CO₂ slope 28, sin desaturación. Interpretación más probable:", options:["IC incipiente","HP oculta","Desacondicionamiento","EPID"], correct:2, explanation:"Patrón clásico de desacondicionamiento: V̇O₂ y pulso O₂ bajos en absoluto PERO con morfología normal (descarta cardiopatía estructural), V̇E/V̇CO₂ slope normal (descarta HP e IC significativa), sin desaturación (descarta enfermedad pulmonar parenquimatosa)." },
  { level:"intermediate", stem:"V̇E/V̇CO₂ slope moderadamente elevado (VC II de Arena):", options:["&lt;30","30-35.9","36-44.9","≥45"], correct:2, explanation:"Clasificación ventilatoria de Arena (Am Heart J 2007): &lt;30 normal, 30-35.9 VC I (leve), 36-44.9 VC II (moderado), 45-54.9 VC III (severo), ≥55 VC IV (extremo). Cada clase estratifica el riesgo pronóstico en IC independientemente del V̇O₂ pico." },
  { level:"intermediate", stem:"El ΔV̇O₂/ΔWR normal es aproximadamente:", options:["3 mL/min/W","10 mL/min/W","30 mL/min/W","60 mL/min/W"], correct:1, explanation:"Aproximadamente 10 mL/min/W. Valores &lt;8 sugieren limitación cardiovascular (isquemia inducible, IC avanzada, HP con fallo del VD)." },
  { level:"intermediate", stem:"HRR1 de 8 lpm con recuperación activa indica:", options:["Recuperación normal","Disautonomía con valor pronóstico independiente adverso","Solo esfuerzo submáximo","Bloqueo β adecuado"], correct:1, explanation:"HRR1 &lt;12 lpm con recuperación activa es marcador de disautonomía y factor pronóstico independiente de mortalidad cardiovascular (Cole, NEJM 1999)." },
  { level:"intermediate", stem:"La MVV se estima habitualmente como:", options:["FEV₁ × 5","FEV₁ × 15","FEV₁ × 35-40","FVC × 100"], correct:2, explanation:"MVV ≈ FEV₁ × 35 a 40. Es la referencia para calcular la reserva ventilatoria: RV(%) = (MVV − V̇E max)/MVV × 100." },
  { level:"intermediate", stem:"Reserva ventilatoria conservada (>30%) en disnea:", options:["Descarta cualquier enfermedad pulmonar","Descarta solo limitación mecánica de la bomba","Es criterio diagnóstico de desacondicionamiento","Indica HP oculta"], correct:1, explanation:"La RV conservada descarta limitación mecánica pero NO enfermedad pulmonar. EPOC moderada, EPID inicial e HP pueden cursar con RV conservada." },
  { level:"intermediate", stem:"Meseta precoz del pulso O₂ (antes del 60% del esfuerzo máximo) sugiere:", options:["Fenómeno normal","Limitación al aumento del volumen sistólico","Esfuerzo submáximo","Efecto β-bloqueante"], correct:1, explanation:"La meseta precoz indica que el volumen sistólico no puede seguir aumentando — hallazgo compatible con isquemia inducible, disfunción ventricular o valvulopatía dinámica." },
  { level:"intermediate", stem:"En IC-FEr, el mejor predictor pronóstico independiente en múltiples cohortes es:", options:["V̇O₂max","V̇E/V̇CO₂ slope","FEVI","BNP"], correct:1, explanation:"El V̇E/V̇CO₂ slope ha demostrado ser superior al V̇O₂max en varias cohortes de IC. Un slope ≥36 identifica alto riesgo independientemente del V̇O₂ pico." },
  { level:"intermediate", stem:"Patrón ventilatorio rápido y superficial (FR alta, Vt limitado) es característico de:", options:["Desacondicionamiento","EPOC leve","EPID","IC leve"], correct:2, explanation:"El patrón restrictivo es característico de EPID, enfermedad neuromuscular y cifoescoliosis avanzada." },
  { level:"intermediate", stem:"Durante la calibración diaria, ¿cuál NO es una calibración obligatoria?", options:["Volumen del neumotacógrafo","Analizadores de O₂ y CO₂","Tiempo de tránsito (gas delay)","Impedancia torácica"], correct:3, explanation:"Las tres calibraciones diarias obligatorias son volumen, gases y tiempo de tránsito. La impedancia torácica no forma parte del CPET convencional." },
  { level:"advanced", stem:"Disnea inexplicada, eco normal, V̇E/V̇CO₂ slope 48, PETCO₂ basal 28 mmHg que no asciende, ΔV̇O₂/ΔWR reducido, desaturación con esfuerzo. Sospecha:", options:["Desacondicionamiento severo","IC con FEc","Hipertensión pulmonar","Miopatía mitocondrial"], correct:2, explanation:"Firma clásica de HP: V̇E/V̇CO₂ slope muy alto (aumento del espacio muerto), PETCO₂ basal bajo que no asciende, ΔV̇O₂/ΔWR reducido por fallo del VD, y desaturación. Indicación de cateterismo cardíaco derecho." },
  { level:"advanced", stem:"Oscilación ventilatoria durante el ejercicio en IC-FEr:", options:["Es artefacto irrelevante","Indica esfuerzo submáximo","Es marcador pronóstico adverso adicional","Indica broncoespasmo"], correct:2, explanation:"La respiración oscilatoria durante el ejercicio (Exercise Oscillatory Ventilation) es un marcador pronóstico adverso independiente en IC, reflejando inestabilidad del control quimiorreceptor." },
  { level:"advanced", stem:"En EPOC severo, ¿qué maniobra durante la CPET detecta atrapamiento dinámico?", options:["Valsalva","Medición seriada de la capacidad inspiratoria (IC)","Müller","Espirometría lenta post-ejercicio"], correct:1, explanation:"La medición seriada de la capacidad inspiratoria detecta el atrapamiento aéreo dinámico (caída de IC = aumento del EELV). Una de las variables más útiles en EPOC." },
  { level:"advanced", stem:"El OUES tiene la ventaja pedagógica de:", options:["Requiere gasometría","Se estabiliza en niveles submáximos, útil cuando no se alcanza esfuerzo máximo","Solo válido en atletas","Sustituye al V̇E/V̇CO₂ slope"], correct:1, explanation:"El OUES (pendiente V̇O₂ vs. log V̇E) se estabiliza en niveles submáximos, por lo que sigue siendo interpretable en pruebas submáximas. Especialmente útil en pediatría y pacientes muy limitados." },
  { level:"advanced", stem:"Candidato a resección pulmonar mayor con V̇O₂ pico 12 mL/kg/min:", options:["Bajo riesgo","Riesgo aumentado de morbimortalidad postoperatoria","Sin información pronóstica","Descarta cirugía absolutamente"], correct:1, explanation:"En cirugía torácica mayor, un V̇O₂ pico &lt;15 mL/kg/min identifica riesgo aumentado; &lt;10 mL/kg/min es muy alto riesgo. Guías ERS/ESTS." },
  { level:"advanced", stem:"Paciente con V̇E/V̇CO₂ slope 33, pulso O₂ con meseta precoz, HRR1 10 lpm, sin antecedentes. ¿Qué exploración es más razonable?", options:["Nueva CPET a las 2 semanas","Ecocardiograma con función diastólica + prueba diastólica de esfuerzo","Repetir espirometría","Observación clínica"], correct:1, explanation:"Este perfil es compatible con IC con FEp subclínica. Un ecocardiograma con evaluación de la función diastólica en reposo y con esfuerzo es el paso lógico." },
  { level:"advanced", stem:"Sobre conversiones de gases en CPET:", options:["V̇O₂ se expresa en BTPS","V̇O₂ se expresa en STPD para comparabilidad","Volúmenes ventilatorios en STPD","Condiciones ATPS son las del informe final"], correct:1, explanation:"Las cantidades de O₂ y CO₂ se expresan en STPD (0 °C, 760 mmHg, seco) para comparación independiente de condiciones ambientales. Los volúmenes ventilatorios en BTPS (37 °C, saturado)." },
  { level:"advanced", stem:"Descenso de TAS >10 mmHg con palidez durante CPET:", options:["Fenómeno vagal benigno","Criterio ABSOLUTO de detención","Sin significado","Efecto β-bloqueante"], correct:1, explanation:"Es criterio absoluto de detención. Refleja fallo del volumen sistólico y es el único parámetro hemodinámico intraprueba que predice mortalidad independiente." },
  { level:"advanced", stem:"En HP precapilar, ¿qué combinación pronóstica desfavorable?", options:["V̇O₂ pico &lt;15 + V̇E/V̇CO₂ slope &gt;45","FC máxima alta","Reserva ventilatoria conservada","V̇O₂ pico &gt;20"], correct:0, explanation:"Guías ESC/ERS integran V̇O₂ pico y V̇E/V̇CO₂ slope entre las variables no invasivas de estratificación de riesgo en HAP. V̇O₂ pico bajo (&lt;11-15 mL/kg/min) y slope &gt;45 son componentes de riesgo intermedio-alto." },
  { level:"advanced", stem:"El RCP (VT2), distinto del AT, se identifica por:", options:["Inflexión V̇CO₂ vs. V̇O₂","Ascenso de V̇E/V̇CO₂ y descenso de PETCO₂","Meseta del V̇O₂","Caída de SpO₂"], correct:1, explanation:"El RCP marca el inicio de la hiperventilación compensatoria por acidosis: V̇E aumenta desproporcionadamente respecto a V̇CO₂, por lo que V̇E/V̇CO₂ sube y PETCO₂ empieza a caer. Habitualmente entre 80-90% del V̇O₂max." },
  // -------- HP (nuevas Q31-Q35) --------
  { level:"basic", stem:"En hipertensión pulmonar, el hallazgo más característico en CPET es:", options:["Reserva ventilatoria muy baja","V̇E/V̇CO₂ slope elevado con PETCO₂ basal bajo que no asciende","Hipoventilación con retención de CO₂","V̇O₂ pico &gt;90% del predicho"], correct:1, explanation:"La firma clásica de HAP es V̇E/V̇CO₂ slope elevado (frecuentemente >40) con PETCO₂ basal bajo (<33 mmHg) que no asciende con el ejercicio. Refleja aumento del espacio muerto y una hiperventilación crónica compensatoria." },
  { level:"basic", stem:"¿Qué grupo de HP corresponde a la enfermedad tromboembólica crónica?", options:["Grupo 1 (HAP)","Grupo 2 (izquierda)","Grupo 3 (pulmonar)","Grupo 4 (CTEPH)"], correct:3, explanation:"La HP tromboembólica crónica (CTEPH) es el grupo 4 según la clasificación de la OMS. Es potencialmente curable con endarterectomía pulmonar en centros expertos, y por eso su identificación temprana es crítica." },
  { level:"intermediate", stem:"Un paciente con eco normal, disnea inexplicada, V̇E/V̇CO₂ slope 48 y PETCO₂ basal 26 mmHg. ¿Cuál es el siguiente paso más apropiado?", options:["Repetir espirometría","Cateterismo cardíaco derecho para evaluar HP","Iniciar diuréticos empíricamente","TAC coronaria"], correct:1, explanation:"El perfil de CPET es altamente sugestivo de HP oculta. El ecocardiograma normal NO la descarta (baja sensibilidad para PSAP en ventanas subóptimas). El cateterismo cardíaco derecho es el gold standard para confirmar HP." },
  { level:"intermediate", stem:"En seguimiento de HAP, ¿qué cambio en la CPET indica respuesta clínicamente significativa al tratamiento?", options:["Cambio de 1-2% en V̇O₂ pico","Cambio &gt;10% en V̇O₂ pico o cambio &gt;5 puntos en V̇E/V̇CO₂ slope","Cambio de 30 lpm en FC pico","Aumento de 15% en la reserva ventilatoria"], correct:1, explanation:"Cambios clínicamente significativos entre CPETs seriadas del mismo paciente: >10% en V̇O₂ pico o >5 puntos en V̇E/V̇CO₂ slope. Cambios menores están dentro del rango de variabilidad técnica." },
  { level:"advanced", stem:"Un paciente con antecedente de TEP hace 2 años presenta V̇E/V̇CO₂ slope 60, PETCO₂ basal 22 mmHg, cinética de recuperación de V̇O₂ muy prolongada y desaturación al 82%. La sospecha más alta es:", options:["HAP idiopática (grupo 1)","CTEPH (grupo 4)","HP izquierda (grupo 2)","Desacondicionamiento severo"], correct:1, explanation:"Slope tan extremadamente elevado (>50) con PETCO₂ tan bajo apunta a espacio muerto MUY marcado, característico de CTEPH (zonas ventiladas no perfundidas por trombos organizados). El antecedente de TEP refuerza la sospecha. Debe realizarse gammagrafía V/Q como test de cribado (mismatch segmentario)." }
];

(function initQuiz() {
  const list = document.getElementById('quiz-list');
  const scoreCorrect = document.getElementById('score-correct');
  const scoreWrong = document.getElementById('score-wrong');
  const scoreRemain = document.getElementById('score-remain');
  const resetBtn = document.getElementById('quizReset');

  const saved = JSON.parse(localStorage.getItem('cpet-quiz') || '{}');
  const state = QUESTIONS.map((_, i) => saved[i] || { answered: false, correct: null, picked: null });

  function save() {
    const dict = {};
    state.forEach((s, i) => { if (s.answered) dict[i] = s; });
    localStorage.setItem('cpet-quiz', JSON.stringify(dict));
  }

  function renderQuiz(filter = 'all') {
    list.innerHTML = '';
    QUESTIONS.forEach((q, i) => {
      if (filter !== 'all' && q.level !== filter) return;
      const s = state[i];
      const q_el = document.createElement('div');
      q_el.className = 'question';
      const level_label = { basic: 'Básico', intermediate: 'Intermedio', advanced: 'Avanzado' }[q.level];
      q_el.innerHTML = `
        <div class="q-head">
          <span class="q-num">Q${String(i + 1).padStart(2, '0')}</span>
          <span class="badge ${q.level}">${level_label}</span>
        </div>
        <div class="q-stem">${q.stem}</div>
        <div class="options">
          ${q.options.map((opt, j) => `
            <div class="option ${s.answered ? 'locked' : ''} ${s.answered && j === q.correct ? 'correct' : ''} ${s.answered && s.picked === j && j !== q.correct ? 'wrong' : ''}" data-opt="${j}">
              <span class="letter">${String.fromCharCode(65 + j)}</span>
              <span class="text">${opt}</span>
            </div>
          `).join('')}
        </div>
        <div class="explanation ${s.answered ? '' : 'hidden'}">
          <span class="lbl">Razonamiento</span>${q.explanation}
        </div>
      `;
      if (!s.answered) {
        q_el.querySelectorAll('.option').forEach(opt_el => {
          opt_el.addEventListener('click', () => {
            const picked = parseInt(opt_el.getAttribute('data-opt'));
            state[i].answered = true;
            state[i].picked = picked;
            state[i].correct = (picked === q.correct);
            save();
            renderQuiz(filter);
            updateScore();
          });
        });
      }
      list.appendChild(q_el);
    });
  }

  function updateScore() {
    const c = state.filter(s => s.correct === true).length;
    const w = state.filter(s => s.correct === false).length;
    const r = state.filter(s => !s.answered).length;
    scoreCorrect.textContent = c;
    scoreWrong.textContent = w;
    scoreRemain.textContent = r;
  }

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderQuiz(btn.getAttribute('data-level'));
    });
  });

  resetBtn.addEventListener('click', () => {
    if (!confirm('¿Reiniciar el progreso del cuestionario? Se perderán todas las respuestas guardadas.')) return;
    localStorage.removeItem('cpet-quiz');
    state.forEach(s => { s.answered = false; s.correct = null; s.picked = null; });
    renderQuiz();
    updateScore();
  });

  renderQuiz();
  updateScore();
})();
