# Instrucciones detalladas para publicar en GitHub Pages

Tiempo estimado: **10-15 minutos**.

## Requisitos previos

- Cuenta en [github.com](https://github.com).
- Git instalado en tu ordenador:
  - **macOS**: viene preinstalado, o `brew install git`.
  - **Linux**: `sudo apt install git`.
  - **Windows**: descarga desde [git-scm.com](https://git-scm.com).
- El ZIP `manual-ergoespirometria.zip` descomprimido en una carpeta.

Si prefieres no usar la línea de comandos, en la sección final está la opción con **GitHub Desktop** (interfaz gráfica).

---

## Paso 1 · Crear el repositorio vacío en GitHub

1. En [github.com](https://github.com) pulsa el botón **+** (arriba a la derecha) → **New repository**.
2. Rellena:
   - **Repository name**: `manual-ergoespirometria`
   - **Description** (opcional): *Manual interactivo sobre interpretación de ergoespirometría (CPET).*
   - **Privacy**: recomendado **Public** (necesario para GitHub Pages gratuito).
   - **NO marques** nada en "Initialize this repository with".
3. Pulsa **Create repository**.
4. GitHub te mostrará una URL del tipo:
   `https://github.com/TU_USUARIO/manual-ergoespirometria.git`

---

## Paso 2 · Descomprimir el ZIP

Descomprime `manual-ergoespirometria.zip` en una carpeta cualquiera. Deberías tener:

```
manual-ergoespirometria/
├── index.html
├── app.js
├── README.md
├── LICENSE
├── INSTRUCCIONES.md
├── .gitignore
└── .github/workflows/deploy.yml
```

---

## Paso 3 · Probar el manual localmente antes de subir

**Opción rápida**: doble clic en `index.html`.

**Opción recomendada** (servidor local):

```bash
cd manual-ergoespirometria
python3 -m http.server 8000
# Luego abre http://localhost:8000 en tu navegador
```

Comprueba:
- El toggle de tema oscuro/claro (arriba a la derecha).
- La calculadora de rampa (Sección 3).
- El panel de 9 de Wasserman con curvas por patrón (Sección 5).
- El simulador V-slope permite hacer clic (Sección 5).
- La calculadora de riesgo en HP (Sección 6b).
- Los casos clínicos progresivos (Sección 8).
- El checklist del informe se marca (Sección 9).
- El cuestionario guarda tu progreso.

---

## Paso 4 · Subir a GitHub por línea de comandos

Abre una terminal, navega a la carpeta del manual:

```bash
cd /ruta/a/manual-ergoespirometria
```

Ejecuta los siguientes comandos uno a uno:

```bash
# 1. Inicializar Git
git init

# 2. Configurar tu identidad (si no está globalmente)
git config user.name "Juan Fernando Carvajal"
git config user.email "carvajaljuanfernando@gmail.com"

# 3. Añadir todos los archivos
git add .

# 4. Primer commit
git commit -m "Manual v3.0 · publicación inicial con enfoque en hipertensión pulmonar"

# 5. Renombrar la rama principal a 'main'
git branch -M main

# 6. Conectar con GitHub
# ⚠️ Sustituye TU_USUARIO por tu nombre de usuario real
git remote add origin https://github.com/TU_USUARIO/manual-ergoespirometria.git

# 7. Subir todo
git push -u origin main
```

Si te pide credenciales:
- **Usuario**: tu nombre de usuario de GitHub.
- **Contraseña**: NO uses tu contraseña normal, usa un **Personal Access Token**:
  - GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → **Generate new token (classic)**.
  - Marca el scope `repo`.
  - Copia el token y úsalo como contraseña.

Deberías ver algo como:
```
Enumerating objects: 8, done.
...
To https://github.com/TU_USUARIO/manual-ergoespirometria.git
 * [new branch]      main -> main
```

---

## Paso 5 · Activar GitHub Pages

1. En la página de tu repositorio en GitHub, pulsa **Settings** (arriba).
2. En la barra lateral izquierda, pulsa **Pages**.
3. En **Source**, selecciona **Deploy from a branch**.
4. En **Branch**, selecciona:
   - Rama: **main**
   - Carpeta: **/ (root)**
5. Pulsa **Save**.
6. En la parte superior aparecerá: *"Your GitHub Pages site is currently being built..."*
7. **Espera 1-2 minutos**.
8. Refresca la página. Verás:
   *"Your site is live at https://TU_USUARIO.github.io/manual-ergoespirometria/"*

Esa es la URL definitiva. Puedes compartirla con quien quieras.

---

## Paso 6 · Verificar que funciona

Abre `https://TU_USUARIO.github.io/manual-ergoespirometria/`. Deberías ver el manual funcionando exactamente igual que en local.

---

## Cómo actualizar el manual después de subirlo

```bash
# 1. Edita index.html o app.js
# 2. Sube los cambios
git add .
git commit -m "Descripción breve del cambio"
git push
```

GitHub Pages regenera automáticamente en 1-2 minutos. Refresca el navegador con `Ctrl+F5` (o `Cmd+Shift+R` en Mac) para saltarte la caché.

---

## Cómo compartir el link con la Dra. Cano y colegas

Simplemente comparte la URL: `https://TU_USUARIO.github.io/manual-ergoespirometria/`

No necesitan cuenta ni login. Funciona en cualquier navegador moderno, incluidos móviles. El progreso del cuestionario se guarda **individualmente por navegador** de cada usuario (no compartido).

---

## Alternativa · Usar GitHub Desktop (interfaz gráfica)

Si prefieres no usar la terminal:

1. Descarga GitHub Desktop desde [desktop.github.com](https://desktop.github.com).
2. Inicia sesión.
3. **File → Add local repository** → selecciona la carpeta descomprimida.
4. Verás los archivos listados. En "Summary" escribe: *Publicación inicial*.
5. **Commit to main**.
6. **Publish repository**. Selecciona nombre `manual-ergoespirometria`, descripción, y **desmarca "Keep this code private"** si quieres GitHub Pages gratuito.
7. **Publish repository**.

Luego continúa desde el Paso 5.

---

## Resolución de problemas frecuentes

### "Permission denied (publickey)"
Estás usando SSH pero configuraste HTTPS:
```bash
git remote set-url origin https://github.com/TU_USUARIO/manual-ergoespirometria.git
```

### "Authentication failed"
Necesitas un Personal Access Token (ver Paso 4).

### GitHub Pages muestra 404
- Verifica que activaste Pages con rama `main` y carpeta `/ (root)`.
- Verifica que hay un `index.html` en la raíz.
- Espera 5 minutos y vuelve a intentar.

### El JavaScript no funciona en local
- Con `file://` algunos navegadores bloquean `localStorage`. Usa un servidor local.
- En GitHub Pages funciona sin problema.

### Las fuentes de Google no cargan
- Verifica conexión a Internet (las fuentes vienen de `fonts.googleapis.com`).
- Si tu institución bloquea Google, descarga las fuentes localmente.

---

## Próximos pasos sugeridos

1. **Comparte el link con la Dra. Cano** para revisión conjunta.
2. **Edita el README** para añadir tu URL de GitHub Pages.
3. **Registra el software en la DNDA** si aplica (añadir a tu lista de repositorios pendientes).
4. **Integra con el curso modular de CPET**: enlaza este manual como material de consulta rápida.
5. **Dominio propio (opcional)**: si tienes uno, configúralo en Settings → Pages → Custom domain.

---

¿Necesitas ayuda? Pregúntale a Claude con la captura de pantalla del error específico.
