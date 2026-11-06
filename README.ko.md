<p align="center"><img src="logo.png" alt="SkillGraph logo" width="360"></p>
<h1 align="center">SkillGraph</h1>
<p align="center"><strong>Agent Skill, 과학 연구 워크플로, 재현 가능한 산출물을 위한 계약 검증 오케스트레이션 엔진.</strong></p>
<p align="center">언어: <a href="README.md">English</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.zh-TW.md">繁體中文</a> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a> · <a href="README.es.md">Español</a></p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-Apache%202.0-2563eb?style=for-the-badge" alt="Apache 2.0"></a>
  <a href="package.json"><img src="https://img.shields.io/badge/Node.js-22%2B-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js 22+"></a>
  <a href="skills/README.md"><img src="https://img.shields.io/badge/Bundled%20skills-31-0d9488?style=for-the-badge" alt="31 bundled skills"></a>
</p>

<p align="center"><a href="#빠른-시작">🚀 빠른 시작</a> · <a href=".skill-workflows/README.md">📚 워크플로 문서</a> · <a href="skills/README.md">🧩 스킬 모음</a> · <a href="https://github.com/Akun-python/Skigraph/issues">💬 문제 보고</a></p>

> [!IMPORTANT]
> 이 도구는 오케스트레이션 엔진이며 과학 인증 서비스나 OS 샌드박스가 아닙니다. 테스트와 PDF 컴파일 성공은 과학적 타당성이나 투고 준비를 보장하지 않습니다. 모델, 데이터, 전문 도구는 별도 설정이 필요하며 수정본 계승과 실제 엔드투엔드 실행은 추가 검증이 필요합니다.

## ✨ 프로젝트 개념

SkillGraph는 AI Agent와 Agent Skill 사이에서 복잡한 작업을 검증 가능하고, 재개 가능하며, 관찰 가능한 워크플로 그래프로 변환합니다.

Agent는 추론, 도구 호출, 코드 실행과 실제 연구 작업을 담당합니다. SkillGraph는 단계, 입출력 계약, 분기, 루프, 예산, 상태 저장과 산출물 검증을 담당합니다.

```text
사용자 프롬프트 → Agent 단계 → SKILL.md → 산출물 계약 → 다음 단계 / 품질 루프
```

## 작동 원리

SkillGraph는 복잡한 작업을 명시적인 상태 전이로 변환합니다. YAML 노드가 단계와 계약을 정의하고, 엔진이 입력과 artifact를 해결하며, Agent가 하나 이상의 `SKILL.md`를 로드해 파일을 작성합니다. 이후 `node_result.json`을 검증하고 다음 엣지 또는 루프를 선택합니다.

```text
YAML 노드 → 입력 및 Skill 해석 → SKILL.md 로드 → Agent가 산출물 작성
→ node_result.json → artifact/path/schema/hash 검증 → 다음 단계 또는 루프
```

핵심 원칙은 **Agent는 내용을 생성하고, 그래프는 그 내용의 수용 여부와 다음 작업을 결정한다**는 것입니다.

### 상태와 추적성

각 run은 workflow version, graph hash, 모든 skill hash, 입력, session과 시간을 저장합니다. 각 단계에는 고유한 `visit_id`가 있고, artifact에는 생성 노드, visit, 경로, 크기, SHA-256 및 검증 시간이 기록됩니다.

### 여러 Skill을 사용하는 단계

```yaml
- id: methods
  skill: experimental-design
  skills:
    - experimental-design
    - statistical-power
```

runner는 나열된 모든 `SKILL.md`를 로드해 실험 설계, 검정력 분석, 과학적 글쓰기와 그림 작성을 함께 수행할 수 있습니다.

### 분기, 루프와 품질 피드백

의료 워크플로는 임상 코호트와 meta-analysis로 분기할 수 있고, 생정보학 워크플로는 bulk RNA-seq, 단일세포, 마이크로바이옴으로 분기할 수 있습니다. review/revise 경로가 선언되어 있으며 release 품질 게이트는 실패 유형에 따라 figures, citations, format 또는 draft로 돌아갑니다. 수정본이 모든 후속 단계에 계승되는지는 엔드투엔드 검증이 필요합니다.

## 주요 기능

- YAML 워크플로 그래프와 결정적 라우팅
- 단일 또는 다중 Skill 단계
- SHA-256 Skill 고정
- artifact 및 JSON Schema 검증
- 원자적 상태 저장, 파일 잠금, manifest, 이벤트 로그
- 일시정지, 재개, 재시도, 제한된 루프
- CLI 및 MCP stdio adapter
- 알고리즘, 의료, 생정보학, 문헌 리뷰 연구 워크플로

## 과학 논문 워크플로

| Workflow | 용도 |
|---|---|
| `paper` | 일반 실증 연구 |
| `paper-algo` | 알고리즘 및 ML 혁신 |
| `paper-medical` | 임상 연구 및 근거 통합 |
| `paper-bioinfo` | 오믹스 및 생정보학 |
| `paper-survey` | 문헌 리뷰 |

연구 질문 → 문헌 → 방법 → 실험 → 통계 → 과학 그림 → 장문 논문 → 동료 심사 → 수정 루프 → 인용 감사 → LaTeX → PDF → 릴리스 품질 게이트로 연결됩니다.

## 빠른 시작

**Node.js 22+**와 npm이 필요합니다. 등록된 스킬 31개가 포함되어 별도 `.vendor` checkout이 필요하지 않습니다.

```bash
git clone https://github.com/Akun-python/Skigraph.git
cd Skigraph
npm install
npm run build
node dist/cli.js list
node dist/cli.js run paper-algo '{"prompt":"재현 가능한 스트리밍 알고리즘 연구"}'
```

## LaTeX 및 PDF

```bash
export PATH="$HOME/.local/bin:$PATH"
npm run compile-paper -- path/to/final_paper.tex
```

## 품질 검사

```bash
npm run qa
npm run audit
npm run smoke
npm test
```

## 🤝 기여하기

최소 재현 예제가 있는 [Issue](https://github.com/Akun-python/Skigraph/issues)나 범위를 좁힌 PR을 환영합니다. 제출 전 `npm run build && npm run qa`를 실행하고 자격 증명, 무단 데이터, 미발표 원고는 포함하지 마세요.

과학 스킬의 출처와 MIT 라이선스는 [skills/README.md](skills/README.md) 및 [업스트림 라이선스](skills/LICENSE.K-Dense.md)를 참고하세요.

## 📄 라이선스

Copyright 2026 Akun-python. 이 프로젝트는 [Apache License 2.0](LICENSE)을 따릅니다. 타사 Skill과 의존성에는 각각의 라이선스가 적용됩니다.
