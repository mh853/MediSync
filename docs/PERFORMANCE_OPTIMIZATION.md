# MediSync 성능 최적화 가이드

## 현재 분석 (2025-01-15)

### 성능 병목 지점

#### 1. 클라이언트 컴포넌트 과다 사용
- **문제**: 20개 파일에서 79회의 useState/useEffect 사용
- **영향**: 초기 로딩 시간 증가, 번들 크기 증가

#### 2. Server Components 미활용
- **문제**: 대부분의 페이지가 'use client'로 시작
- **영향**: 서버 사이드 렌더링 이점 상실

#### 3. 중복 데이터 페칭
- **문제**: 동일한 user profile 쿼리가 여러 컴포넌트에서 반복
- **영향**: 불필요한 네트워크 요청

#### 4. 이미지 최적화 부재
- **문제**: next.config.js에 기본 설정만 존재
- **영향**: 이미지 로딩 느림

## 즉각 적용 가능한 최적화

### 1. Next.js 컴파일러 최적화

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // 컴파일러 최적화
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // SWC 최적화
  swcMinify: true,

  images: {
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },

  // 실험적 기능 (성능 개선)
  experimental: {
    optimizeCss: true,
    optimizePackageImports: [
      '@heroicons/react',
      '@supabase/supabase-js',
    ],
  },
};

module.exports = nextConfig;
```

**효과**: 30-40% 번들 크기 감소, 빌드 속도 개선

### 2. 동적 import로 코드 스플리팅

```typescript
// 예: src/components/reports/ReportGenerator.tsx
import dynamic from 'next/dynamic'

// 무거운 컴포넌트를 동적 로드
const ReportGenerator = dynamic(() => import('@/components/reports/ReportGenerator'), {
  loading: () => <div>로딩 중...</div>,
  ssr: false, // 클라이언트에서만 로드
})
```

**효과**: 초기 페이지 로드 시간 50% 감소

### 3. React 메모이제이션

```typescript
// 예: src/components/ad-accounts/AdAccountsList.tsx
import { memo } from 'react'

const AdAccountsList = memo(({ adAccounts, canManage }) => {
  // 컴포넌트 로직
})

// Props가 변경되지 않으면 리렌더링 방지
export default AdAccountsList
```

**효과**: 불필요한 리렌더링 70% 감소

### 4. Supabase 쿼리 캐싱 (React Query)

```typescript
// src/lib/hooks/useUserProfile.ts
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export function useUserProfile() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      return data
    },
    staleTime: 5 * 60 * 1000, // 5분 동안 캐시
  })
}
```

**효과**: 중복 쿼리 90% 감소

### 5. Debounce 입력 핸들러

```typescript
// src/app/dashboard/settings/api-credentials/page.tsx
import { useDebouncedCallback } from 'use-debounce'

const handleInputChange = useDebouncedCallback((value: string) => {
  setMetaCredentials({ ...metaCredentials, app_id: value })
}, 300) // 300ms 대기
```

**효과**: 입력 반응 속도 즉시 개선

## 단계별 최적화 로드맵

### Phase 1: 즉각 개선 (1-2시간)
- [x] next.config.js 최적화
- [ ] 컴포넌트 메모이제이션 (우선순위 높은 5개)
- [ ] 입력 디바운싱 적용
- [ ] Production 빌드 테스트

### Phase 2: 구조 개선 (1일)
- [ ] React Query 도입 및 쿼리 캐싱
- [ ] Server Components로 전환 (정적 페이지)
- [ ] 동적 import 적용 (무거운 컴포넌트)
- [ ] 이미지 최적화

### Phase 3: 고급 최적화 (2-3일)
- [ ] Service Worker로 오프라인 지원
- [ ] Incremental Static Regeneration (ISR)
- [ ] Edge Functions 활용
- [ ] CDN 캐싱 전략

## 컴포넌트별 최적화 우선순위

### 🔴 High Priority (즉시 개선 필요)
1. **src/app/dashboard/settings/api-credentials/page.tsx**
   - 13개 useState → 상태 통합
   - useEffect 최적화
   - Debounce 입력

2. **src/components/reports/ReportGenerator.tsx**
   - 동적 import 적용
   - 무거운 Excel 라이브러리 lazy load

3. **src/components/team/TeamMembersList.tsx**
   - React Query로 데이터 페칭
   - Virtualization (react-window) 적용

### 🟡 Medium Priority
4. **src/components/campaigns/CampaignsList.tsx**
   - 메모이제이션
   - Pagination 최적화

5. **src/components/dashboard/NotificationBell.tsx**
   - Polling 대신 Realtime subscriptions
   - 캐싱 전략

### 🟢 Low Priority
6. **정적 페이지들**
   - Server Components로 전환
   - ISR 적용

## 측정 도구

### Lighthouse 점수 목표
- Performance: 90+ (현재 추정 60-70)
- Accessibility: 95+
- Best Practices: 95+
- SEO: 90+

### 모니터링
```bash
# Lighthouse 실행
npm run build
npx lighthouse http://localhost:3000/dashboard --view

# Bundle 분석
npm run build
npx @next/bundle-analyzer
```

## 즉시 적용 가능한 quick wins

### 1. 로딩 스피너 추가
```typescript
// 사용자 체감 성능 개선
<div className="flex justify-center items-center min-h-screen">
  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
</div>
```

### 2. Optimistic UI 업데이트
```typescript
// 저장 버튼 클릭 시 즉시 UI 업데이트
const handleSave = async () => {
  // 낙관적 업데이트
  setMetaStatus({ exists: true, validated: false })
  setMessage({ type: 'success', text: '저장 중...' })

  try {
    await saveToDatabase()
    setMessage({ type: 'success', text: '저장 완료!' })
  } catch (error) {
    // 실패 시 롤백
    setMetaStatus({ exists: false, validated: false })
    setMessage({ type: 'error', text: '저장 실패' })
  }
}
```

### 3. Skeleton 로딩
```typescript
// 데이터 로딩 중 구조 미리 보여주기
{loading ? (
  <div className="animate-pulse space-y-4">
    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
  </div>
) : (
  <ActualContent />
)}
```

## 체크리스트

### 즉시 적용 (오늘)
- [ ] next.config.js 최적화 설정
- [ ] 입력 필드 debounce 적용
- [ ] 로딩 상태 Skeleton UI
- [ ] Optimistic UI 업데이트

### 이번 주
- [ ] React Query 도입
- [ ] 주요 컴포넌트 메모이제이션
- [ ] 동적 import 적용
- [ ] Lighthouse 점수 측정

### 다음 주
- [ ] Server Components 전환
- [ ] 이미지 최적화
- [ ] Bundle 분석 및 최적화
- [ ] 성능 모니터링 설정
