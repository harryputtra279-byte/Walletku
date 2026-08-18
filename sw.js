const CACHE = "dompet-harry-backup-restore-v3";

const FILES = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon.svg",
  "./sw.js"
];

self.addEventListener("install", event => {

  event.waitUntil(

    caches.open(CACHE).then(cache => {

      return cache.addAll(FILES);

    })

  );

  self.skipWaiting();

});


self.addEventListener("activate", event => {

  event.waitUntil(

    caches.keys().then(keys => {

      return Promise.all(

        keys
          .filter(key => key !== CACHE)
          .map(key => caches.delete(key))

      );

    }).then(() => self.clients.claim())

  );

});


self.addEventListener("fetch", event => {

  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(

    fetch(event.request)

      .then(response => {

        if (
          response &&
          response.status === 200 &&
          response.type !== "opaque"
        ) {

          const copy = response.clone();

          caches.open(CACHE).then(cache => {

            cache.put(event.request, copy);

          });

        }

        return response;

      })

      .catch(() => {

        return caches
          .match(event.request)
          .then(cached => {

            return cached ||
              caches.match("./index.html");

          });

      })

  );

});
