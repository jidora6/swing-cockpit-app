// PWA 설치 조건(서비스워커 등록)만 충족하고, 캐싱은 하지 않는다.
// 예전 버전은 fetch 응답을 캐시에 저장했는데, 그게 card.js/card.css 등 자주 바뀌는
// 파일까지 오래 붙잡고 있어서 배포해도 화면에 반영 안 되는 문제가 있었다 (2026-09-22).
// 신호/가격 데이터가 항상 최신이어야 하는 앱이라 오프라인 캐싱의 이득보다 손해가 컸다.
const OLD_CACHES = ["swing-cockpit-v1"];

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => OLD_CACHES.includes(k)).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  e.respondWith(fetch(e.request));
});
