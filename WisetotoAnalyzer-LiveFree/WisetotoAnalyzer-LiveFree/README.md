# Wisetoto Analyzer — Live Free Edition

## 무료 실시간 공급원
### 1. sportsapi
- 20개 스포츠
- football / baseball / basketball / volleyball 포함
- 현재 데이터와 fixtures, lineups, statistics, H2H 제공
- 무료: 1,000 requests/day, 10 requests/min
- API key 필요
- Free 플랜에는 WebSocket이 없으므로 이 앱은 사용자가 `데이터 수집` 버튼을 누를 때 REST 요청을 보냅니다.

### 2. Open-Meteo
- 날씨/강수/기온/풍속/풍향
- API key 불필요
- 무료 공개 API

### 3. API-Football (선택)
- 축구 상세 보강용
- Free 100 requests/day
- lineups, injuries, statistics, odds 등의 endpoint를 제공
- API key 필요

## 배당
무료 공급원에서 모든 종목/리그의 신뢰도 높은 실시간 배당을 동시에 보장하기 어렵습니다.
따라서 현재 코드는 배당을 허위로 생성하지 않고, `ODDS_API_URL` 또는 `WISE_TOTO_DATA_API_URL` 같은 허용된 공급원을 연결하도록 설계했습니다.

## 실행
npm install
npm run dev

## Vercel
GitHub에 업로드 → Vercel Import → Environment Variables:
SPORTSAPI_KEY=...
API_FOOTBALL_KEY=... (선택)
ODDS_API_URL=... (선택)
WISE_TOTO_DATA_API_URL=... (선택)

## 데이터 수집 방식
사용자가 `데이터 수집`을 누르면 서버가 sportsapi REST endpoint를 호출합니다.
5분 자동 수집은 사용하지 않습니다.
