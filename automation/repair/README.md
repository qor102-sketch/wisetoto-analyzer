# Wisetoto V13.12.33 — 무료 안전형 종료 검증 및 수동 수정 지원

기존 10분 간격 Betman 전 종목 PRE 분석 및 경기 종료 검증은 그대로 유지합니다.

## 무료로 자동 처리하는 기능

1. GitHub Actions의 main 자동 PRE·사후검증이 성공하면 무료 OOS 점검 워크플로가 실행됩니다.
2. 원본 frozen PRE와 새로 종료 검증된 경기 결과를 대조합니다.
3. 핸디 H ±n, 명시적 U/O 라인의 정산 불일치·시각 무결성·최근 Form 부족·EV 등급 검토 신호를 분리합니다.
4. 미적중 자체는 오류로 간주하지 않고, 모델 가중치/λ/Poisson/TOP1을 결과에 맞춰 변경하지 않습니다.
5. 확인이 필요한 건이 생긴 경우만 별도 GitHub Actions Artifacts에 **wisetoto-manual-fix-kit** ZIP을 만듭니다.
6. 해당 ZIP에는 다음 파일이 있습니다.
   - README_KO.md: 한국어 수정 방법과 수정 전 반드시 확인할 원본 데이터
   - CASES.json: 단계·실제 스코어·픽/마켓·검증 증거·점검할 코드 파일
   - VERIFY_EVIDENCE.mjs: 확정 경기 스코어/원본 핸디 또는 U/O를 독립 재검증
   - COPY_TO_CHATGPT.md: 이 ZIP을 대화에 첨부하고 연결된 GitHub로 최소 수정 PR을 요청할 때의 텍스트
7. GitHub Issue에 해당 Actions 실행 ZIP 다운로드 주소가 자동 남습니다.
8. 이 워크플로에서는 AI API를 호출하거나 자동 코드 변경·PR 생성·main 병합을 하지 않습니다.

## ZIP 확인하기

- 자동 검토: https://github.com/qor102-sketch/wisetoto-analyzer/actions/workflows/wisetoto-safe-auto-repair.yml
- 관련 실행 선택 → 하단 Artifacts → wisetoto-manual-fix-kit ZIP
- ZIP이 없다면 이번 실행에서는 검토할 오류 신호가 없거나 아티팩트를 생성하지 않은 것입니다.
- GitHub Issues: https://github.com/qor102-sketch/wisetoto-analyzer/issues
- ZIP 보존 기간: 90일. 필요하다면 로컬로 백업하세요.

## 무료 수동 수정 방법

1. ZIP 파일 전체를 현재 ChatGPT 대화에 첨부하고 COPY_TO_CHATGPT.md 내용을 보내세요.
2. 연결된 GitHub 저장소의 실제 코드 및 최신 Production을 확인해 증거를 독립 검증합니다.
3. 확실한 오류일 때만 새 브랜치와 수정 PR을 만들고 단위·빌드·Chromium·Vercel Preview 결과를 확인합니다.
4. 사용자가 승인해야 main 병합/Production 반영합니다.
5. 추가 유료 OpenAI API 구독/키는 사용하지 않습니다. 단 ChatGPT 이용량, GitHub Actions, Vercel 무료 요금제별 사용량 제한은 적용될 수 있습니다.

## 운영상 제한

- 별도 유료 AI 엔드포인트가 없으므로 **무인 생성형 AI 코드 수정**은 하지 않습니다. 대신 무료 규칙 검증과 완성된 수동 수정 패키지를 제공합니다.
- CASES.json은 후보/검증 자료이며 소스 버그의 원인이 확정됐다는 증거가 아닙니다.
- 공식 소스의 리그·경기일·홈/원정·점수를 독립 확인하기 전에는 데이터 수집 코드를 고치지 않습니다.
- ZIP은 수정된 소스 코드나 작동을 보장한 .patch 파일이 아닙니다. 확인되지 않은 변경을 자동 생성하지 않기 때문입니다.
- PR 자체가 유료 API를 호출하지 않으며 승인 없는 main 병합 기능은 없습니다.
