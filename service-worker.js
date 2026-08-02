const CACHE_NAME="1.7.0"

const urlsToCache=[

    "./",
    "./index.html",
    "./manifest.json",
    "./assets/css/style.css",
    "./assets/js/app.js",
    "./assets/js/modal.js",
    "./assets/js/utils.js",
    "./assets/data/it.json",
    "./assets/images/icon-192.png",
    "./assets/images/icon-512.png",
    "./assets/images/header.png",
    "./assets/images/logo.png"

]

self.addEventListener("install",event=>{

    event.waitUntil(

        caches.open(CACHE_NAME)
            .then(cache=>cache.addAll(urlsToCache))

    )

})

self.addEventListener("activate",event=>{

    event.waitUntil(

        caches.keys()
            .then(keys=>Promise.all(
                keys
                    .filter(key=>key !== CACHE_NAME)
                    .map(key=>caches.delete(key))
            ))

    )

})

self.addEventListener("fetch",event=>{

    event.respondWith(

        caches.match(event.request)
            .then(response=>{

                return response || fetch(event.request)

            })

    )

})
