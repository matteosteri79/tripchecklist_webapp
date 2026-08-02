import { COLORS } from "./colors.js"

const THEME_STORAGE_KEY = "sport_checklist_theme"

export const THEMES = {
    RED: "red",
    GREEN: "green",
    BLUE: "blue",
    ORANGE: "orange",
    PURPLE: "purple"
}

export function getTheme(){
    return localStorage.getItem(THEME_STORAGE_KEY)
        || THEMES.RED
}
export function setTheme(theme){
    localStorage.setItem(
        THEME_STORAGE_KEY,
        theme
    )
    applyTheme(theme)
}
export function applyTheme(theme){
    const colors = COLORS[theme]
    if(!colors) return

    document.documentElement.style.setProperty(
        "--theme-primary",
        colors.primary
    )
    document.documentElement.style.setProperty(
        "--theme-light",
        colors.light
    )
    document.documentElement.style.setProperty(
        "--theme-dark",
        colors.dark
    )
}