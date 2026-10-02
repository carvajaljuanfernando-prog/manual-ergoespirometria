# Cómo leer un informe de ergoespirometría

> Manual interactivo para médicos especialistas sobre la interpretación de la prueba de esfuerzo cardiopulmonar (CPET), con énfasis en hipertensión pulmonar.

**Autores:**
- **Dr. Juan Fernando Carvajal Estupiñán** — Cardiólogo internista. Instituto del Corazón de Bucaramanga. Coordinador del Programa de Hipertensión Pulmonar del Instituto Neumológico del Oriente (INO). Docente universitario (UDES, UNAB).
- **Dra. Diana Jimena Cano Rosales** — Neumóloga.

---

## Qué es este manual

Un manual web interactivo autocontenido siguiendo el modelo de "Cómo leer un informe de ecocardiograma" y "Cómo leer un informe de marcapasos". Estructura:

- **12 capítulos** de contenido clínico (fisiología, técnica, variables, panel de Wasserman, patrones, HP dedicada, indicaciones, casos, informe, errores frecuentes, cuestionario, bibliografía).
- **8 componentes interactivos**: calculadora de rampa, estratificación CPET del riesgo en HAP, panel de 9 de Wasserman con curvas por 8 patrones, simulador V-slope, comparador dinámico de patrones, 6 casos clínicos progresivos (3 dedicados a HP), checklist interactivo del informe, cuestionario con persistencia.
- **35 preguntas** de cuestionario en 3 niveles de complejidad.
- **Modo oscuro/claro** y guardado del progreso en `localStorage`.

## Cómo probarlo localmente

Solo necesitas un navegador moderno.

### Opción rápida
Doble clic en `index.html`.

### Opción recomendada (servidor local)
```bash
python3 -m http.server 8000
# Luego abre http://localhost:8000 en tu navegador
```

## Cómo desplegarlo en GitHub Pages

Ver `INSTRUCCIONES.md` para la guía paso a paso completa. Resumen rápido:

1. Crea un repositorio en GitHub llamado `manual-ergoespirometria` (público).
2. Sube estos archivos con git.
3. En Settings → Pages, activa "Deploy from a branch" → main → root.
4. Espera 1-2 min. El manual estará disponible en `https://TU_USUARIO.github.io/manual-ergoespirometria/`.

## Estructura del proyecto

```
manual-ergoespirometria/
├── index.html                     Página principal (HTML + CSS)
├── app.js                         Lógica interactiva completa
├── README.md                      Este archivo
├── INSTRUCCIONES.md               Guía detallada de despliegue
├── LICENSE                        Derechos reservados (uso académico)
├── .gitignore                     Ignorar archivos temporales
└── .github/workflows/deploy.yml   GitHub Action (opcional)
```

Solo **2 archivos son la aplicación** (`index.html` + `app.js`). Sin dependencias externas más allá de las fuentes de Google.

## Cómo iterar el contenido

- **Añadir preguntas al cuestionario**: en `app.js`, localiza el array `QUESTIONS` y añade objetos `{ level, stem, options, correct, explanation }`.
- **Añadir un caso clínico interactivo**: en `app.js`, localiza el array `CASES` y añade un objeto con `title`, `steps` y `final`. También añade el botón en `#caseSelector` en `index.html`.
- **Añadir un patrón al panel de 9**: en `app.js`, añade una entrada en `PATTERNS` y otra en `DETAILS`.
- **Cambiar colores institucionales**: en `index.html`, `:root` en el CSS. Los tokens son `--navy` y `--amber`.

## Actualizar el manual publicado

```bash
git add .
git commit -m "Descripción del cambio"
git push
```

GitHub Pages regenera automáticamente el sitio en 1-2 minutos.

## Créditos técnicos

- Diseño visual siguiendo el sistema de identidad de manuales previos (Navy #0D2B45 / Amber Gold #C4923A).
- Sin dependencias JavaScript de terceros; SVG puro y JS vanilla.

## Licencia

Material docente. Uso académico. Todos los derechos reservados por los autores. Ver `LICENSE`.
