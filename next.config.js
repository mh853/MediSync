/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // 컴파일러 최적화
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // SWC 최적화 (기본값이지만 명시적으로)
  swcMinify: true,

  images: {
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
    // 최신 이미지 포맷 지원
    formats: ['image/avif', 'image/webp'],
  },

  // 실험적 기능으로 성능 개선
  experimental: {
    // optimizeCss는 critters 패키지가 필요하므로 제거
    // optimizeCss: true,
    optimizePackageImports: [
      '@heroicons/react',
      '@supabase/supabase-js',
      'recharts',
    ],
  },
};

module.exports = nextConfig;
