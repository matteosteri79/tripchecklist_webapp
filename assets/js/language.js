// ---------- Language Manager ----------

let currentLanguage = "it"
let translations = {}

const LANGUAGE_STORAGE_KEY = "sportChecklistLanguage"

const SUPPORTED_LANGUAGES = {
    SYSTEM: "system",
    ITALIAN: "it",
    ENGLISH: "en",
    FRENCH: "fr",
    SPANISH: "es",
    GERMAN: "de"
}


// ---------- Caricamento lingua ----------

export async function initLanguage(){
    const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY)
    if(savedLanguage){
        currentLanguage = savedLanguage
    }
    else {
        currentLanguage = SUPPORTED_LANGUAGES.SYSTEM
    }
    await loadTranslations()
    applyTranslations()
}


// ---------- Imposta lingua ----------

export function setLanguage(language){
    localStorage.setItem(
        LANGUAGE_STORAGE_KEY,
        language
    )
    window.location.reload()
}


// ---------- Lingua effettiva ----------

export function getEffectiveLanguage(){
    if(currentLanguage === SUPPORTED_LANGUAGES.SYSTEM){
        const browserLanguage =
            navigator.language
                ?.substring(0,2)
                .toLowerCase()
        if(
            Object.values(SUPPORTED_LANGUAGES)
                .includes(browserLanguage)
        ){
            return browserLanguage
        }

        return "it"
    }

    return currentLanguage
}


// ---------- Carica file traduzione ----------

async function loadTranslations(){
    const language = getEffectiveLanguage()
    try {
        const response = await fetch(
            `assets/data/languages/${language}.json`
        )
        translations = await response.json()
    }
    catch(error){
        console.error(
            "Errore caricamento lingua:",
            error
        )
        translations = {}
    }
}


// ---------- Recupera stringa ----------

export function t(key){
    return key
            .split(".")
            .reduce(
                (obj,part)=>obj?.[part],
                translations
            )
        ?? key
}


// ---------- Stato lingua ----------

export function getLanguage(){
    return currentLanguage
}
export function getEffectiveLanguageCode(){
    return getEffectiveLanguage()
}

// ---------- Aggiorna elementi HTML ----------

export function applyTranslations(){
    document
        .querySelectorAll("[data-i18n]")
        .forEach(element => {

            const key = element.dataset.i18n
            const text = t(key)

            if(text){
                element.textContent = text
            }
        })
}

export {
    SUPPORTED_LANGUAGES
}