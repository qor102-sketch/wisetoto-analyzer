# Wisetoto Analyzer Live Free v2

이번 버전의 핵심:
- 테스트 경기번호(예: 5276)의 홈/원정 팀명을 SportsAPI의 안정적인 team ID로 검색
- 양 팀의 upcoming fixtures에서 상대팀 ID가 일치하는 실제 fixture를 찾음
- upcoming에서 못 찾으면 live scores에서 fallback 검색
- 실제 fixture 상세, lineups, statistics, H2H, 양팀 최근 경기 최대 20개 수집
- 무료 플랜에 맞춰 사용자가 데이터 수집 버튼을 누를 때 REST API 요청
- API 키는 Vercel 서버 환경변수 SPORTSAPI_KEY에만 저장

SportsAPI 공식 문서: https://sportsapi.app/docs
무료 플랜: 1,000 requests/day, 10 req/min, 20 sports, current data. WebSocket은 Pro 이상.

다음 단계:
- Wisetoto 회차/경기 자동 목록 및 실제 경기번호 매칭
- Open-Meteo 경기장 좌표 자동 매핑
- 실제 배당/배당변동 공급원
- 종목별 확률 모델 및 백테스트
- 선발/결장/예상 라인업 보강
