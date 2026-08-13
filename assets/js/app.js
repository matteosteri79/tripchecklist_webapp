
// ---------- Service Worker ----------
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("./service-worker.js");
    });
}

// ---------- Import ----------
import { openModal, closeModal } from "./modal.js"
import { APP_NAME, APP_VERSION, SUPPORT_EMAIL, PLAY_STORE_URL } from "./utils.js"
import {
    initLanguage,
    setLanguage,
    getLanguage,
    getEffectiveLanguage,
    SUPPORTED_LANGUAGES,
    t
} from "./language.js"
import {
    applyTheme,
    getTheme,
    setTheme
} from "./theme.js"

// ---------- Elementi DOM ----------
const sportsList = document.getElementById("sportsList")
const title = document.getElementById("activeChecklistTitle")
const welcome = document.getElementById("welcomeScreen")
const activeChecklist = document.getElementById("activeChecklist")
const backToHome = document.getElementById("backToHomeBtn")
const menuBtn = document.getElementById("menuBtn")
const topMenu = document.getElementById("topMenu")

// ---------- Dati ----------
let Templates = []
async function loadTemplates(){
    const language = getEffectiveLanguage()
    const res = await fetch(
        `assets/data/templates/${language}.json`
    )
    Templates = await res.json()
}
let data = JSON.parse(localStorage.getItem("sportsData")) || []
let activeChecklistIndex = null

// ---------- FAB ----------
const fab = document.getElementById("fab")
const actionMenu = document.getElementById("actionMenu")

document.addEventListener("modalOpened", updateUI)
document.addEventListener("modalClosed", updateUI)

fab.addEventListener("click", () => {
    actionMenu.classList.toggle("hidden")
})

// ---------- Logo ----------
function getLogoImage() {
    return "assets/images/logo.png"
}

// ---------- Creazione checklist ----------
document.getElementById("createChecklistBtn").addEventListener("click", () => {
    closeActionMenu()

    openModal(`
        <h2>${t("modal.createChecklist")}</h2>
        <input id="newChecklistName" placeholder="${t("modal.sportName")}">
        <button id="modalCreateBtn">${t("modal.create")}</button>
    `)

    document.getElementById("modalCreateBtn").addEventListener("click", () => {

        const name = capitalizeFirst(
            document.getElementById("newChecklistName").value.trim()
        )

        if(!name) return

        // 1. CREA CHECKLIST
        const newChecklist = {
            name,
            categories: []
        }

        data.push(newChecklist)
        activeChecklistIndex = data.length - 1

        save()
        render()
        closeModal()

        addCategoryModalAfterCreate(activeChecklistIndex) // 2. APRI SUBITO CREAZIONE CATEGORIA
    })
})

function closeActionMenu(){
    actionMenu.classList.add("hidden")
}

// ---------- Salvataggio ----------
function save(){
    localStorage.setItem("sportsData", JSON.stringify(data))
}

// ---------- Rendering principale ----------
function render(){
    actionMenu.classList.add("hidden")

    if(activeChecklistIndex === null){
        renderHome()
    } else {
        renderChecklist()
    }

    updateUI()
}

// ---------- HOME ----------
function renderHome(){
    sportsList.innerHTML = ""
    const installHint = getInstallHint()

    // HOME senza checklist
    if(data.length === 0){
        activeChecklist.style.display = "none"
        title.style.display = "none"

        welcome.style.display = "block"
        welcome.innerHTML = `
            <img src="${getLogoImage()}" alt="${APP_NAME}">
            <p class="logo-tagline">${t("home.tagline")}</p>
            <p>${t("home.welcome")}</p>
            <p>${t("home.createFirst")}</p>
            ${installHint}
        `
        return
    }

    // HOME con checklist
    welcome.style.display = "none"
    activeChecklist.style.display = "block"
    title.style.display = "block"
    title.textContent = t("home.yourChecklists")
    document.getElementById("checklistProgress").classList.add("hidden")

    const ul = document.createElement("ul")

    data.forEach((checklist,index)=>{
        const li = document.createElement("li") // 🔥 tolto lo spazio

        li.innerHTML = `
        <div class="checklist-row" data-action="openChecklist" data-s="${index}">
            <span class="checklist-name">${checklist.name}</span>

            <div class="checklist-actions">
                <button class="icon-btn" data-action="deleteChecklist" data-s="${index}">
                    <span class="material-icons delete">delete</span>
                </button>
            </div>
        </div>
    `

        ul.appendChild(li)
    })

    sportsList.appendChild(ul)
    welcome.style.display = installHint ? "block" : "none"
    welcome.innerHTML = installHint

    ul.addEventListener("click",(e)=>{

        const actionEl = e.target.closest("[data-action]")
        if(!actionEl) return

        const action = actionEl.dataset.action
        const sIndex = Number(actionEl.dataset.s)

        // evita che il click su delete apra anche la checklist
        if(action === "deleteChecklist"){
            data.splice(sIndex,1)
            save()
            render()
            return
        }

        if(action === "openChecklist"){
            activeChecklistIndex = sIndex
            render()
        }
    })
}

// ---------- CHECKLIST APERTA ----------
function renderChecklist(){
    const checklist = data[activeChecklistIndex]

    welcome.style.display = "none"
    activeChecklist.style.display = "block"
    title.style.display = "block"
    title.textContent = "📋 " + t("checklist.title") + " " + checklist.name
    sportsList.innerHTML = ""
    document.getElementById("checklistProgress").classList.remove("hidden")

    renderCategories(checklist)
    updateChecklistProgress(checklist)
}

// ---------- CATEGORIE ----------
function renderCategories(checklist){
    const fragment = document.createDocumentFragment()

    checklist.categories.forEach((cat,cIndex)=>{
        const done = cat.items.filter(i => i.done).length
        const total = cat.items.length
        const catBlock = document.createElement("li")
        catBlock.className = "category-block"

        if(total > 0 && done === total) {
            catBlock.classList.add("category-complete")
        }
        if(cat.open){
            catBlock.classList.add("open")
        }

        const icon = cat.open ? "keyboard_arrow_up" : "keyboard_arrow_down"

        // crea la categoria
        catBlock.innerHTML = `
<div class="category-header">

    <div class="category-left" data-action="toggleCategory" data-c="${cIndex}">
        <span>${cat.name}</span>
        <span class="category-count">${done}/${total}</span>
        <span class="material-icons arrow" data-action="toggleCategory" data-c="${cIndex}">${icon}</span>
    </div>

    <div class="category-actions">
        <span class="material-icons add" data-action="addItem" data-c="${cIndex}">add</span>
        <span class="material-icons delete" data-action="deleteCategory" data-c="${cIndex}">delete</span>
    </div>

</div>

<ul class="items"></ul>
`
        const itemsContainer = catBlock.querySelector(".items")

        // Popola gli oggetti solo se la categoria è aperta
        if(cat.open && cat.items.length){
            cat.items.forEach((item,iIndex)=>{
                const itemLi = document.createElement("li")
                itemLi.className = "item"
                itemLi.innerHTML = `
<div class="item-content ${item.done ? "done" : ""}">
    <input class="check"
    type="checkbox"
    ${item.done ? "checked":""}
    data-action="toggleItem"
    data-c="${cIndex}"
    data-i="${iIndex}">
    <span class="item-text">${item.name}</span>
</div>

<span class="material-icons delete"
data-action="deleteItem"
data-c="${cIndex}"
data-i="${iIndex}">
delete
</span>
`
                itemsContainer.appendChild(itemLi)
            })
        }

        fragment.appendChild(catBlock)
    })

    sportsList.appendChild(fragment)
}

function addCategoryModalAfterCreate(sIndex){

    openModal(`
        <h2>${t("modal.createFirstCategory")}</h2>
        <input id="newCategoryName" placeholder="${t("modal.categoryName")}">
        <button id="modalAddCategoryBtn">${t("modal.continue")}</button>
    `)

    document.getElementById("modalAddCategoryBtn")
        .addEventListener("click", ()=>{

            const name = capitalizeFirst(
                document.getElementById("newCategoryName").value.trim()
            )

            if(!name) return

            const newCategory = {
                name,
                items: [],
                open: true
            }

            data[sIndex].categories.push(newCategory)

            save()
            render()
            closeModal()

            // 3. ORA CREA PRIMO ITEM
            addFirstItemModal(sIndex, data[sIndex].categories.length - 1)
        })
}

function addFirstItemModal(sIndex, cIndex){

    openModal(`
        <h2>${t("modal.addFirstItem")}</h2>
        <input id="newItemName" placeholder="${t("modal.itemName")}">
        <button id="modalAddItemBtn">${t("modal.create")}</button>
    `)

    document.getElementById("modalAddItemBtn")
        .addEventListener("click", ()=>{

            const name = capitalizeFirst(
                document.getElementById("newItemName").value.trim()
            )

            if(!name) return

            data[sIndex].categories[cIndex].items.push({
                name,
                done: false
            })

            save()
            render()
            closeModal()
        })
}

function openInfoModal(){
    openModal(`
        <div class="textcenter">
            <img src="${getLogoImage()}" class="info-logo" alt="${APP_NAME}">
            <p class="logo-tagline">${t("info.tagline")}</p>
            <p><strong>v. ${APP_VERSION}</strong></p>
            <p><small>${t("info.description")}<br>
            ${t("info.goodLuck")}</small></p>
            <p>${t("info.contact")}<br>
                <a href="mailto:${SUPPORT_EMAIL}">
                    <span class="material-icons mail-icon">mail</span> ${t("info.write")}
                </a>
            </p>
        </div>
    `)
}

// ---------- Language Modal ----------

function openLanguageModal(){
    const currentLanguage = getLanguage()
    openModal(`
        <h2>${t("language.title")}</h2>
        <div class="language-option" data-language="${SUPPORTED_LANGUAGES.SYSTEM}">
            <div class="language-info">
                <img src="assets/images/flag_system.png" alt="${t("language.system")}">
                <span>${t("language.system")}</span>
            </div>        
            ${
                currentLanguage === SUPPORTED_LANGUAGES.SYSTEM
                    ? '<span class="material-icons check-active">check</span>'
                    : ''
            }
        </div>
        <div class="language-option" data-language="${SUPPORTED_LANGUAGES.ITALIAN}">
            <div class="language-info">
                <img src="assets/images/flag_it.png" alt="${t("language.italian")}">
                <span>${t("language.italian")}</span>
            </div>        
            ${
                currentLanguage === SUPPORTED_LANGUAGES.ITALIAN
                    ? '<span class="material-icons check-active">check</span>'
                    : ''
            }
        </div>
        <div class="language-option" data-language="${SUPPORTED_LANGUAGES.ENGLISH}">
            <div class="language-info">
                <img src="assets/images/flag_en.png" alt="${t("language.english")}">
                <span>${t("language.english")}</span>
            </div>        
            ${
        currentLanguage === SUPPORTED_LANGUAGES.ENGLISH
            ? '<span class="material-icons check-active">check</span>'
            : ''
    }
        </div>
        <div class="language-option" data-language="${SUPPORTED_LANGUAGES.FRENCH}">
            <div class="language-info">
                <img src="assets/images/flag_fr.png" alt="${t("language.french")}">
                <span>${t("language.french")}</span>
            </div>        
            ${
        currentLanguage === SUPPORTED_LANGUAGES.FRENCH
            ? '<span class="material-icons check-active">check</span>'
            : ''
    }
        </div>
        <div class="language-option" data-language="${SUPPORTED_LANGUAGES.SPANISH}">
            <div class="language-info">
                <img src="assets/images/flag_es.png" alt="${t("language.spanish")}">
                <span>${t("language.spanish")}</span>
            </div>        
            ${
        currentLanguage === SUPPORTED_LANGUAGES.SPANISH
            ? '<span class="material-icons check-active">check</span>'
            : ''
    }
        </div>
        <div class="language-option" data-language="${SUPPORTED_LANGUAGES.GERMAN}">
            <div class="language-info">
                <img src="assets/images/flag_de.png" alt="${t("language.german")}">
                <span>${t("language.german")}</span>
            </div>        
            ${
        currentLanguage === SUPPORTED_LANGUAGES.GERMAN
            ? '<span class="material-icons check-active">check</span>'
            : ''
    }
        </div>
    `)

    document
        .querySelectorAll(".language-option")
        .forEach(option => {
            option.addEventListener("click", ()=>{
                setLanguage(
                    option.dataset.language
                )
                document.documentElement.lang = getLanguage()
            })
        })
}

// ---------- Theme Modal ----------
function openThemeModal(){
    const currentTheme = getTheme()
    openModal(`
        <h2>${t("themes.title")}</h2>

        <div class="theme-option" data-theme="green">
            <div class="theme-info">
                <span class="material-icons theme-icon green">palette</span>
                <span>${t("themes.green")}</span>
            </div>        
            ${
                currentTheme === "green"
                    ? '<span class="material-icons check-active">check</span>'
                    : ''
            }
        </div>
        <div class="theme-option" data-theme="red">
            <div class="theme-info">
                <span class="material-icons theme-icon red">palette</span>
                <span>${t("themes.red")}</span>
            </div>        
            ${
                currentTheme === "red"
                    ? '<span class="material-icons check-active">check</span>'
                    : ''
            }
        </div>
        
        <div class="theme-option" data-theme="blue">
            <div class="theme-info">
                <span class="material-icons theme-icon blue">palette</span>
                <span>${t("themes.blue")}</span>
            </div>        
            ${
                currentTheme === "blue"
                    ? '<span class="material-icons check-active">check</span>'
                    : ''
            }
        </div>
        
        <div class="theme-option" data-theme="purple">
            <div class="theme-info">
                <span class="material-icons theme-icon purple">palette</span>
                <span>${t("themes.purple")}</span>
            </div>        
            ${
                currentTheme === "purple"
                    ? '<span class="material-icons check-active">check</span>'
                    : ''
            }
        </div>
        
        <div class="theme-option" data-theme="orange">
            <div class="theme-info">
                <span class="material-icons theme-icon orange">palette</span>
                <span>${t("themes.orange")}</span>
            </div>        
            ${
                currentTheme === "orange"
                    ? '<span class="material-icons check-active">check</span>'
                    : ''
            }
        </div>
    `)

    document
        .querySelectorAll(".theme-option")
        .forEach(option => {
            option.addEventListener("click", ()=>{
                setTheme(
                    option.dataset.theme
                )
                closeModal()
            })
        })
}

// ---------- Eventi lista ----------
sportsList.addEventListener("click", (e)=>{
    const button = e.target.closest("[data-action]")
    if(!button) return

    const action = button.dataset.action
    const cIndex = Number(button.dataset.c)
    const iIndex = Number(button.dataset.i)

    if(action === "toggleCategory") toggleCategory(activeChecklistIndex,cIndex)
    if(action === "deleteCategory") deleteCategory(activeChecklistIndex,cIndex)
    if(action === "addItem") addItemModal(activeChecklistIndex,cIndex)
    if(action === "toggleItem") toggleItem(activeChecklistIndex,cIndex,iIndex)
    if(action === "deleteItem") deleteItem(activeChecklistIndex,cIndex,iIndex)

})

document.addEventListener("click", (e)=>{
    if(!e.target.closest("#menuBtn") && !e.target.closest("#topMenu")){
        topMenu.classList.add("hidden")
    }
})
menuBtn.addEventListener("click", (e)=>{
    e.stopPropagation()
    topMenu.classList.toggle("hidden")
})

topMenu.addEventListener("click", (e)=>{
    const actionEl = e.target.closest("[data-action]")
    if(!actionEl) return

    const action = actionEl.dataset.action
    if(action === "openSettings"){
        openSettingsModal()
    }
    if(action === "openLanguage"){
        openLanguageModal()
    }
    if(action === "openTheme"){
        openThemeModal()
    }
    if(action === "openInfo"){
        openInfoModal()
    }

    topMenu.classList.add("hidden")
})

// ---------- Back Home ----------
backToHome.onclick = () => {

    activeChecklistIndex = null
    render()

}

// ---------- Operazioni ----------
function toggleCategory(s,c){
    data[s].categories[c].open = !data[s].categories[c].open
    save()
    render()
}

function deleteCategory(s,c){
    data[s].categories.splice(c,1)
    save()
    render()
}

function toggleItem(s,c,i){
    const category = data[s].categories[c]

    category.items[i].done = !category.items[i].done
    save()

    // 🔥 aggiorna UI item (barrato)
    const itemEl = document.querySelector(
        `.item input[data-c="${c}"][data-i="${i}"]`
    )?.closest(".item-content")

    if(itemEl){
        itemEl.classList.toggle("done", category.items[i].done)
    }

    // Aggiorna contatore della categoria
    const done = category.items.filter(it => it.done).length
    const total = category.items.length

    const catBlock = document.querySelector(`.category-block:nth-child(${c+1})`)
    if(catBlock){
        const counterSpan = catBlock.querySelector(".category-count")
        if(counterSpan){
            counterSpan.textContent = `${done}/${total}`
        }

        catBlock.classList.toggle(
            "category-complete",
            done === total && total > 0
        )
    }

    // Aggiorna progressbar totale checklist
    updateChecklistProgress(data[s])
}

function deleteItem(s,c,i){
    data[s].categories[c].items.splice(i,1)
    save()
    render()
}

// ---------- Modali ----------
function addCategoryModal(sIndex){
    closeActionMenu()
    openModal(`
        <h2>${t("modal.addCategory")}</h2>
        <input id="newCategoryName" placeholder="${t("modal.categoryName")}">
        <button id="modalAddCategoryBtn">${t("modal.add")}</button>
    `)

    document.getElementById("modalAddCategoryBtn")
        .addEventListener("click", ()=>{
            const name = capitalizeFirst(
                document.getElementById("newCategoryName").value.trim()
            )

            if(!name) return

            data[sIndex].categories.push({
                name,
                items:[],
                open:true
            })

            save()
            render()
            closeModal()
        })
}

function addItemModal(sIndex,cIndex){

    closeActionMenu()
    openModal(`
        <h2>${t("modal.addItem")}</h2>
        <input id="newItemName" placeholder="${t("modal.itemName")}">
        <button id="modalAddItemBtn">${t("modal.add")}</button>
    `)

    document.getElementById("modalAddItemBtn")
        .addEventListener("click", ()=>{
            const name = capitalizeFirst(
                document.getElementById("newItemName").value.trim()
            )

            if(!name) return

            data[sIndex].categories[cIndex].items.push({
                name,
                done:false
            })

            save()
            render()
            closeModal()
        })
}

function renameChecklistModal(sIndex){
    closeActionMenu()

    const checklist = data[sIndex]

    openModal(`
        <h2>${t("modal.renameChecklist")}</h2>
        <input id="renameChecklistName" placeholder="${t("modal.checklistName")}">
        <button id="modalRenameChecklistBtn">${t("modal.save")}</button>
    `)

    document.getElementById("renameChecklistName").value = checklist.name

    document.getElementById("modalRenameChecklistBtn")
        .addEventListener("click", ()=>{
            const name = capitalizeFirst(
                document.getElementById("renameChecklistName").value.trim()
            )

            if(!name) return

            checklist.name = name

            save()
            render()
            closeModal()
        })
}


function loadTemplateModal(){

    closeActionMenu()

    const templates = Templates.filter(t => t.visible)

    if(!templates.length){
        alert(t("alert.noTemplate"))
        return
    }

    const options = templates
        .map(t => `<option value="${t.id}">${t.name}</option>`)
        .join("")

    openModal(`
        <h2>${t("modal.loadChecklist")}</h2>
        <select id="templateSelect">${options}</select>
        <button id="modalLoadTemplateBtn">${t("modal.load")}</button>
    `)

    document.getElementById("modalLoadTemplateBtn").addEventListener("click", () => {
        const selected = document.getElementById("templateSelect").value
        const template = Templates.find(t => t.id === selected)

        if(!template) return

        const newChecklist = {
            name: template.name,
            categories: template.categories.map(cat => ({
                name: cat.name,
                open: true,
                items: cat.items.map(i => ({
                    name: i.name,
                    done: false
                }))
            }))
        }

        data.push(newChecklist)
        activeChecklistIndex = data.length - 1

        save()
        render()
        closeModal()

    })
}

// ---------- Pulsanti FAB ----------
document.getElementById("addCategoryBtn").addEventListener("click", ()=>{
    if(activeChecklistIndex !== null){
        addCategoryModal(activeChecklistIndex)
    }
})
document.getElementById("renameChecklistBtn").addEventListener("click", ()=>{
    if(activeChecklistIndex !== null){
        renameChecklistModal(activeChecklistIndex)
    }
})
document.getElementById("loadTemplateBtn").addEventListener("click", ()=>{
    loadTemplateModal()
})
document.getElementById("resetChecklistBtn").addEventListener("click", ()=>{
    if(activeChecklistIndex !== null){
        openResetModal()
    }
})

// ---------- UI ----------
function updateActionMenuButtons(){
    const hasActiveChecklist = activeChecklistIndex !== null

    const loadBtn = document.getElementById("loadTemplateBtn")
    const createBtn = document.getElementById("createChecklistBtn")
    const addCatBtn = document.getElementById("addCategoryBtn")
    const renameBtn = document.getElementById("renameChecklistBtn")
    const resetBtn = document.getElementById("resetChecklistBtn")
    const backToHomeBtn = document.getElementById("backToHomeBtn")

    // 👉 HOME (nessuna checklist aperta)
    if(!hasActiveChecklist){
        loadBtn.classList.remove("hidden")
        createBtn.classList.remove("hidden")

        addCatBtn.classList.add("hidden")
        renameBtn.classList.add("hidden")
        resetBtn.classList.add("hidden")
        backToHomeBtn.classList.add("hidden")
        return
    }

    // 👉 CHECKLIST APERTA
    loadBtn.classList.add("hidden")
    createBtn.classList.add("hidden")

    addCatBtn.classList.remove("hidden")
    renameBtn.classList.remove("hidden")
    resetBtn.classList.remove("hidden")
    backToHomeBtn.classList.remove("hidden")
}

function resetChecklist(sIndex){
    const checklist = data[sIndex]
    checklist.categories.forEach(cat=>{
        cat.items.forEach(item=>{
            item.done = false
        })
    })

    save()
    render()
}

function updateChecklistProgress(checklist){
    let total = 0
    let done = 0

    checklist.categories.forEach(cat=>{
        total += cat.items.length
        done += cat.items.filter(i=>i.done).length
    })

    const percent = total ? Math.round((done/total)*100) : 0
    if(percent === 100){
        document.getElementById("progressComplete").classList.remove("hidden")
        document.getElementById("progressFill").classList.add("progress-complete")
    }
    else {
        document.getElementById("progressComplete").classList.add("hidden")
    }

    document.getElementById("progressFill").style.width = percent + "%"
    document.getElementById("progressText").textContent =
        `${done} / ${total} ${t("progress.itemsTaken")}`
    document.getElementById("progressPercent").textContent =
        percent + "%"
}

function openResetModal(){
    closeActionMenu()
    openModal(`
        <h2>${t("modal.resetChecklist")}</h2>
        <div class="textcenter">
        
            <p>
            <span class="material-icons alert-icon">warning</span>
            ${t("modal.resetWarning")}
            </p>
    
            <button id="confirmResetBtn">${t("modal.resetChecklist")}</button>
            <button id="cancelResetBtn">${t("modal.cancel")}</button>
        </div>
    `)
    document.getElementById("confirmResetBtn")
        .addEventListener("click", ()=>{
            resetChecklist(activeChecklistIndex)
            closeModal()
        })
    document.getElementById("cancelResetBtn")
        .addEventListener("click", closeModal)
}

function updateUI(){
    const isModalOpen = !document
        .getElementById("modalOverlay")
        .classList.contains("hidden")

    // 🔥 AGGIUNGI QUESTA RIGA
    updateActionMenuButtons()

    // FAB nascosto se modal aperto
    fab.classList.toggle("hidden", isModalOpen)

    // HOME visibile solo in checklist e senza modal
    const showHome = activeChecklistIndex !== null && !isModalOpen
    backToHome.classList.toggle("hidden", !showHome)
}

// ---------- Utility ----------
function capitalizeFirst(text){
    if(!text) return ""
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
}

function isStandaloneApp(){
    return window.matchMedia("(display-mode: standalone)").matches ||
        window.navigator.standalone === true
}

function isIOS(){
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
}

function isAndroid(){
    return /Android/.test(navigator.userAgent)
}

function getInstallHint(){
    if(isStandaloneApp()) return ""

    if(isIOS()){
        return `
            <div class="install-hint">
                <p><strong>${t("install.iosTitle")}</strong></p>
                <p>${t("install.iosText")}</p>
            </div>
        `
    }

    if(isAndroid()){
        if(PLAY_STORE_URL){
            return `
                <div class="install-hint">
                    <p><strong>${t("install.playStoreTitle")}</strong></p>
                    <p>${t("install.playStoreText")}</p>
                    <a class="install-link" href="${PLAY_STORE_URL}" target="_blank" rel="noopener">
                        ${t("install.playStoreButton")}
                    </a>
                </div>
            `
        }

        return `
            <div class="install-hint">
                <p><strong>${t("install.androidTitle")}</strong></p>
                <p>${t("install.androidText")}</p>
            </div>
        `
    }

    return ""
}

// ---------- Init ----------
async function init(){
    await initLanguage()
    applyTheme(
        getTheme()
    )
    await loadTemplates()

    render()
}

init()

