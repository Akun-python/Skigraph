<p align="center"><img src="logo.png" alt="SkillGraph logo" width="360"></p>
<h1 align="center">SkillGraph</h1>
<p align="center"><strong>Agent Skill, 과학 연구 워크플로, 재현 가능한 산출물을 위한 계약 검증 오케스트레이션 엔진.</strong></p>
<p align="center">언어: <a href="README.md">English</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.zh-TW.md">繁體中文</a> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a> · <a href="README.es.md">Español</a></p>

## 프로젝트 개념

SkillGraph는 AI Agent와 Agent Skill 사이에서 복잡한 작업을 검증 가능하고, 재개 가능하며, 관찰 가능한 워크플로 그래프로 변환합니다.

Agent는 추론, 도구 호출, 코드 실행과 실제 연구 작업을 담당합니다. SkillGraph는 단계, 입출력 계약, 분기, 루프, 예산, 상태 저장과 산출물 검증을 담당합니다.

```text
사용자 프롬프트 → Agent 단계 → SKILL.md → 산출물 계약 → 다음 단계 / 품질 루프
```

## 로고의 의미

- **Agent**: 추론, 도구, 코드 및 단계 작업을 수행합니다.
- **DAG Orchestration**: YAML 노드와 엣지로 의존성 및 분기를 정의합니다.
- **Checkpoint & Resume**: run, visit, 이벤트와 artifact를 저장하고 재개합니다.
- **Multi-Skill Support**: 한 단계에서 여러 `SKILL.md`를 로드합니다.
- **Observability**: graph hash, skill hash, checksum과 실행 이벤트를 기록합니다.
- **Unified Output Format**: 모든 단계가 동일한 `node_result.json` 계약을 사용합니다.
- **중앙 체크마크**: 필수 산출물이 검증된 뒤에만 다음 단계로 이동합니다.

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

```bash
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

## License

MIT
