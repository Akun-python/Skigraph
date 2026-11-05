<p align="center"><img src="logo.png" alt="SkillGraph logo" width="360"></p>
<h1 align="center">SkillGraph</h1>
<p align="center"><strong>Orquestación con contratos para Agent Skills, flujos científicos y entregables reproducibles.</strong></p>
<p align="center">Idiomas: <a href="README.md">English</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.zh-TW.md">繁體中文</a> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a> · <a href="README.es.md">Español</a></p>

## Concepto

SkillGraph es una capa de orquestación entre un AI Agent y sus Agent Skills. Convierte tareas complejas en grafos de trabajo verificables, reanudables y observables.

El Agent realiza el razonamiento, las llamadas a herramientas, el código y el trabajo científico. SkillGraph controla las etapas, los contratos de entrada/salida, las ramas, los bucles, los presupuestos, el estado y la validación de artefactos.

```text
Prompt del usuario → etapa Agent → SKILL.md → contrato de artefactos → siguiente etapa / bucle de calidad
```

## Cómo funciona el mecanismo

SkillGraph convierte una tarea compleja en transiciones de estado explícitas. El nodo YAML define la etapa y sus contratos; el motor resuelve los inputs y artifacts; el Agent carga uno o varios `SKILL.md` y escribe archivos; después `node_result.json` se valida y se selecciona la siguiente arista o el siguiente bucle.

```text
Nodo YAML → resolver inputs y Skills → cargar SKILL.md → Agent escribe artefactos
→ node_result.json → validar artifact/path/schema/hash → siguiente etapa o bucle
```

El principio central es: **el Agent genera el contenido; el grafo decide si ese contenido es admisible y qué ocurre después**.

### Estado y trazabilidad

Cada run guarda la versión del workflow, graph hash, todos los skill hashes, inputs, sesión y tiempos. Cada etapa tiene un `visit_id`; cada artifact registra su nodo productor, visit, ruta, tamaño, SHA-256 y momento de validación.

### Etapas con varios Skills

```yaml
- id: methods
  skill: experimental-design
  skills:
    - experimental-design
    - statistical-power
```

El runner carga todos los `SKILL.md` listados para combinar diseño experimental, potencia estadística, redacción científica y visualización.

### Ramas, bucles y feedback de calidad

Los flujos médicos pueden dividirse en cohortes clínicas y meta-análisis; los flujos bioinformáticos pueden dividirse en bulk RNA-seq, single-cell y microbioma. Una revisión fallida devuelve el manuscrito al ciclo de revisión; un release gate fallido devuelve el trabajo al borrador.

## Funciones principales

- Grafos YAML y enrutamiento determinista.
- Etapas con uno o varios Skills.
- Fijación de Skills mediante SHA-256.
- Validación de artefactos, JSON Schema, rutas y tamaños.
- Escrituras atómicas, bloqueos de archivos, manifests y eventos.
- Pausa, reanudación, reintento y bucles limitados.
- Adaptadores CLI y MCP stdio.
- Flujos para algoritmos, medicina, bioinformática y revisiones bibliográficas.

## Flujos de artículos científicos

| Workflow | Uso |
|---|---|
| `paper` | Investigación empírica general |
| `paper-algo` | Innovación algorítmica y ML |
| `paper-medical` | Investigación clínica y síntesis de evidencia |
| `paper-bioinfo` | Ómicas y bioinformática |
| `paper-survey` | Revisión bibliográfica |

El ciclo completo es: pregunta → literatura → método → experimento → estadística → figuras científicas → manuscrito largo → revisión → bucle de revisión → auditoría de citas → LaTeX → PDF → puerta de calidad.

## Inicio rápido

```bash
npm install
npm run build
node dist/cli.js list
node dist/cli.js run paper-algo '{"prompt":"Investigar un algoritmo de streaming reproducible"}'
```

## LaTeX y PDF

```bash
export PATH="$HOME/.local/bin:$PATH"
npm run compile-paper -- path/to/final_paper.tex
```

## Comprobaciones

```bash
npm run qa
npm run audit
npm run smoke
npm test
```

## Licencia

Copyright 2026 Akun-python. Este proyecto se distribuye bajo la [Licencia Apache 2.0](LICENSE). Los Skills y dependencias de terceros conservan sus respectivas licencias.
