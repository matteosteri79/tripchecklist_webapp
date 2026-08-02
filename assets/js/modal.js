const overlay = document.getElementById("modalOverlay")
const modal = document.getElementById("modal")

// Apri modal
export function openModal(content){
    modal.innerHTML = content
    overlay.classList.remove("hidden")

    // 🔔 notifica apertura
    document.dispatchEvent(new Event("modalOpened"))
}

// Chiudi modal
export function closeModal(){
    overlay.classList.add("hidden")

    // 🔔 notifica chiusura
    document.dispatchEvent(new Event("modalClosed"))
}

// Click fuori → chiudi
overlay.addEventListener("click", (e)=>{
    if(e.target === overlay){
        closeModal()
    }
})