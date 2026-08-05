"use client"

import { useEffect, useRef } from "react"
import { useLanguage } from "./provider"
import { DEFAULT_LOCALE, type Locale } from "./config"

/**
 * Camada de tradução automática em tempo real.
 *
 * Quando o idioma não é português, esta camada:
 *  1. Varre os nós de texto e atributos visíveis do DOM.
 *  2. Preserva o português original de cada nó (WeakMap), para poder voltar ao
 *     PT ou trocar de idioma sem perder a fonte.
 *  3. Envia os textos em lote para /api/i18n/translate (dicionário -> cache no
 *     banco -> IA) e aplica o resultado.
 *  4. Observa mutações do DOM (navegação SPA, dados que chegam depois) e
 *     traduz o conteúdo novo, reaproveitando o cache em memória.
 *
 * Assim, TODAS as telas ficam traduzidas sem reescrever cada componente.
 */

// Tags cujo conteúdo textual não deve ser traduzido.
const SKIP_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "CODE",
  "PRE",
  "TEXTAREA",
  "SVG",
  "PATH",
])

// Atributos de texto visível que também traduzimos.
const ATTRS = ["placeholder", "title", "aria-label", "alt"]

// Guarda o texto PT original de cada nó de texto.
const originalText = new WeakMap<Text, string>()
// Guarda os valores PT originais de atributos por elemento.
const originalAttrs = new WeakMap<Element, Record<string, string>>()

// Cache de traduções em memória, por idioma (source PT -> traduzido).
const memCache: Record<string, Map<string, string>> = {}
// Textos já solicitados e ainda em voo (evita pedidos duplicados).
const inflight: Record<string, Set<string>> = {}

function cacheFor(locale: string): Map<string, string> {
  if (!memCache[locale]) memCache[locale] = new Map()
  return memCache[locale]
}
function inflightFor(locale: string): Set<string> {
  if (!inflight[locale]) inflight[locale] = new Set()
  return inflight[locale]
}

/** Só vale a pena traduzir texto que contenha ao menos uma letra. */
function hasLetters(s: string): boolean {
  return /\p{L}/u.test(s)
}

/** Um nó de texto deve ser ignorado por causa de um ancestral proibido? */
function isSkippable(node: Node): boolean {
  let el: HTMLElement | null =
    node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as HTMLElement)
  while (el) {
    if (SKIP_TAGS.has(el.tagName)) return true
    if (el.getAttribute("translate") === "no") return true
    if (el.hasAttribute("data-no-translate")) return true
    if (el.classList.contains("notranslate")) return true
    el = el.parentElement
  }
  return false
}

interface TextTarget {
  node: Text
  source: string
  lead: string
  trail: string
}
interface AttrTarget {
  el: Element
  attr: string
  source: string
}

/** Percorre o DOM e coleta nós de texto e atributos a traduzir. */
function collectTargets(root: HTMLElement): { texts: TextTarget[]; attrs: AttrTarget[] } {
  const texts: TextTarget[] = []
  const attrs: AttrTarget[] = []

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const raw = node.nodeValue ?? ""
      if (!raw.trim() || !hasLetters(raw)) return NodeFilter.FILTER_REJECT
      if (isSkippable(node)) return NodeFilter.FILTER_REJECT
      return NodeFilter.FILTER_ACCEPT
    },
  })

  let n = walker.nextNode() as Text | null
  while (n) {
    const current = n.nodeValue ?? ""
    // Fonte PT: o original preservado, ou o texto atual (ainda em PT).
    let source = originalText.get(n)
    if (source == null) {
      source = current
      originalText.set(n, current)
    }
    const lead = current.match(/^\s*/)?.[0] ?? ""
    const trail = current.match(/\s*$/)?.[0] ?? ""
    texts.push({ node: n, source: source.trim(), lead, trail })
    n = walker.nextNode() as Text | null
  }

  // Atributos visíveis.
  const els = root.querySelectorAll<HTMLElement>("[placeholder], [title], [aria-label], [alt]")
  els.forEach((el) => {
    if (isSkippable(el)) return
    let store = originalAttrs.get(el)
    for (const attr of ATTRS) {
      if (!el.hasAttribute(attr)) continue
      const currentVal = el.getAttribute(attr) ?? ""
      if (!currentVal.trim() || !hasLetters(currentVal)) continue
      const preserved = store?.[attr]
      const source = preserved ?? currentVal
      if (!store) {
        store = {}
        originalAttrs.set(el, store)
      }
      if (store[attr] == null) store[attr] = currentVal
      attrs.push({ el, attr, source: source.trim() })
    }
  })

  return { texts, attrs }
}

/** Restaura o DOM para o português original preservado. */
function restoreToPortuguese(root: HTMLElement) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null)
  let n = walker.nextNode() as Text | null
  while (n) {
    const orig = originalText.get(n)
    if (orig != null && n.nodeValue !== orig) n.nodeValue = orig
    n = walker.nextNode() as Text | null
  }
  const els = root.querySelectorAll<HTMLElement>("[placeholder], [title], [aria-label], [alt]")
  els.forEach((el) => {
    const store = originalAttrs.get(el)
    if (!store) return
    for (const attr of Object.keys(store)) {
      if (el.getAttribute(attr) !== store[attr]) el.setAttribute(attr, store[attr])
    }
  })
}

async function requestTranslations(locale: string, sources: string[]): Promise<void> {
  const cache = cacheFor(locale)
  const pend = inflightFor(locale)

  const needed = Array.from(new Set(sources)).filter((s) => s && !cache.has(s) && !pend.has(s))
  if (needed.length === 0) return

  needed.forEach((s) => pend.add(s))

  // Envia em lotes (a rota aceita até 400 por vez).
  const CHUNK = 200
  try {
    for (let i = 0; i < needed.length; i += CHUNK) {
      const batch = needed.slice(i, i + CHUNK)
      const res = await fetch("/api/i18n/translate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale, texts: batch }),
      })
      if (!res.ok) throw new Error(`translate ${res.status}`)
      const data = (await res.json()) as { translations?: Record<string, string> }
      const map = data.translations ?? {}
      for (const src of batch) {
        cache.set(src, map[src] ?? src)
      }
    }
  } catch (err) {
    console.log("[v0] auto-translate fetch falhou:", err instanceof Error ? err.message : String(err))
    // Em caso de erro, marca como identidade para não travar a UI.
    needed.forEach((s) => {
      if (!cache.has(s)) cache.set(s, s)
    })
  } finally {
    needed.forEach((s) => pend.delete(s))
  }
}

/** Aplica as traduções em cache aos alvos coletados. */
function applyCached(locale: string, targets: { texts: TextTarget[]; attrs: AttrTarget[] }) {
  const cache = cacheFor(locale)
  for (const t of targets.texts) {
    const translated = cache.get(t.source)
    if (translated == null) continue
    const next = t.lead + translated + t.trail
    if (t.node.nodeValue !== next) t.node.nodeValue = next
  }
  for (const a of targets.attrs) {
    const translated = cache.get(a.source)
    if (translated == null) continue
    if (a.el.getAttribute(a.attr) !== translated) a.el.setAttribute(a.attr, translated)
  }
}

export function AutoTranslate() {
  const { locale } = useLanguage()
  const localeRef = useRef<Locale>(locale)
  const runningRef = useRef(false)

  useEffect(() => {
    localeRef.current = locale
    const root = document.body
    if (!root) return

    // Português: restaura e encerra (o observer continua para futuras trocas).
    if (locale === DEFAULT_LOCALE) {
      restoreToPortuguese(root)
    }

    let scheduled = false
    let cancelled = false

    async function run() {
      if (runningRef.current) return
      const activeLocale = localeRef.current
      if (activeLocale === DEFAULT_LOCALE) return
      runningRef.current = true
      try {
        const targets = collectTargets(root)
        const allSources = [
          ...targets.texts.map((t) => t.source),
          ...targets.attrs.map((a) => a.source),
        ]
        // Aplica o que já está em cache (instantâneo) antes de buscar o resto.
        applyCached(activeLocale, targets)
        await requestTranslations(activeLocale, allSources)
        if (cancelled || localeRef.current !== activeLocale) return
        // Recoleta (o DOM pode ter mudado) e aplica o cache atualizado.
        applyCached(activeLocale, collectTargets(root))
      } finally {
        runningRef.current = false
      }
    }

    function schedule() {
      if (scheduled) return
      scheduled = true
      setTimeout(() => {
        scheduled = false
        void run()
      }, 250)
    }

    // Primeira passada.
    if (locale !== DEFAULT_LOCALE) schedule()

    // Observa mudanças do DOM para traduzir conteúdo que chega depois.
    const observer = new MutationObserver((mutations) => {
      if (localeRef.current === DEFAULT_LOCALE) return
      let relevant = false
      for (const m of mutations) {
        if (m.type === "childList" && (m.addedNodes.length || m.removedNodes.length)) {
          relevant = true
          break
        }
        if (m.type === "characterData") {
          relevant = true
          break
        }
      }
      if (relevant) schedule()
    })
    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
      attributeFilter: ATTRS,
    })

    return () => {
      cancelled = true
      observer.disconnect()
    }
  }, [locale])

  return null
}
