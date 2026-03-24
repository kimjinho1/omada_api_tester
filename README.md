# Omada OpenAPI Tester

TP-Link Omada SDN Controller의 OpenAPI를 웹 브라우저에서 테스트할 수 있는 도구.

## 배포

- **URL**: https://omada-api-tester.vercel.app/

> **주의**: Omada Controller가 로컬 네트워크(192.168.x.x)에 있는 경우, Vercel 배포 버전에서는 접근 불가. 로컬 실행 필요.

## 로컬 실행

```bash
node server.js
# http://localhost:3000
```

## 사용법

1. Controller URL, OmadacId, Client ID/Secret 입력
2. **Access Token** 버튼 클릭 → 자동 인증 (login → code → token)
3. Site ID, AP MAC, WLAN ID 자동 감지 (수동 변경 가능)
4. 탭별 API 실행: Client, Device, Port, Radio, SSID, System, RF Scan, ACL
5. **Run All GET** 버튼으로 전체 조회 API 일괄 실행

## 기술 스택

- Node.js (built-in http/https, 외부 의존성 없음)
- Vanilla HTML/CSS/JS (프레임워크 없음)
- Vercel Serverless Functions (배포용)
