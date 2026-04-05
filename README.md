# MemoryLab

리콜 + 플래시카드 통합 암기 앱. 단어 리스트를 1초씩 flash로 보여주고, 직접 써서 기억을 확인하는 리콜 방식과 플래시카드를 결합했습니다. 세트 저장 시 AI가 청킹 / 두문자어 / 스토리 암기법을 자동 생성해줍니다.

## 시작하기

```bash
npm install
```

`.env.example`을 복사해서 `.env.local`을 만들고 API 키를 입력하세요:

```bash
cp .env.example .env.local
# .env.local에 VITE_ANTHROPIC_API_KEY 입력
```

```bash
npm run dev
```

## Vercel 배포

1. GitHub에 push
2. Vercel에서 import
3. **Environment Variables**에 `VITE_ANTHROPIC_API_KEY` 추가
4. Build command 오류 시 Settings → Build Command를 아래로 변경:
   ```
   node node_modules/vite/bin/vite.js build
   ```

## 기능

- **리콜 모드**: 단어를 1초씩 flash → 전체 작성 → 틀린 것만 다시 flash → 반복
- **플래시카드 모드**: 3D 카드 뒤집기, 알아요 / 모르겠어 마킹
- **입력 방법**: 직접 입력 / 쉼표·줄바꿈 붙여넣기 / OCR(준비 중)
- **AI 암기법**: 저장 시 청킹, 두문자어, 스토리 자동 생성
- 세트는 localStorage에 저장 (브라우저 유지)
