import os
import asyncio
import base64
from typing import Any, Dict, List, Optional

from playwright.async_api import async_playwright, Browser, BrowserContext, Page


class BrowserBridge:
    def __init__(self) -> None:
        self._playwright = None
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.page: Optional[Page] = None
        self._lock = asyncio.Lock()

    async def start(self) -> None:
        if self.page is not None:
            return

        self._playwright = await async_playwright().start()
        chrome_path = os.environ.get("BROAI_CHROME_PATH") or r"C:\Program Files\Google\Chrome\Application\chrome.exe"
        launch_kwargs = {
            "headless": True,
            "args": ["--disable-dev-shm-usage", "--disable-gpu"],
        }
        if os.path.exists(chrome_path):
            launch_kwargs["executable_path"] = chrome_path
        self.browser = await self._playwright.chromium.launch(**launch_kwargs)
        self.context = await self.browser.new_context(viewport={"width": 1440, "height": 1024})
        self.page = await self.context.new_page()
        start_url = os.environ.get("BROAI_START_URL", "https://www.google.com")
        try:
            await self.page.goto(start_url, wait_until="domcontentloaded")
        except Exception:
            await self.page.goto("about:blank")

    async def shutdown(self) -> None:
        if self.context is not None:
            await self.context.close()
            self.context = None
        if self.browser is not None:
            await self.browser.close()
            self.browser = None
        if self._playwright is not None:
            await self._playwright.stop()
            self._playwright = None
        self.page = None

    async def snapshot(self) -> Dict[str, Any]:
        async with self._lock:
            try:
                page = await self._ensure_page()
                elements = await self._visible_elements(page)
                screenshot = await page.screenshot(type="png")
                return {
                    "ok": True,
                    "url": page.url,
                    "title": await page.title(),
                    "elements": elements,
                    "screenshot_base64": base64.b64encode(screenshot).decode("ascii"),
                }
            except Exception as exc:
                return {"ok": False, "error": str(exc)}

    async def execute(self, action: str, payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        payload = payload or {}
        async with self._lock:
            try:
                page = await self._ensure_page()
                if action == "get_page_state":
                    return await self._page_state(page)
                if action == "open_url":
                    url = payload["url"]
                    await page.goto(url, wait_until="domcontentloaded")
                    return await self._page_state(page)
                if action == "click":
                    selector = payload["selector"]
                    await page.locator(selector).first.click(timeout=8000)
                    return await self._page_state(page)
                if action == "type":
                    selector = payload["selector"]
                    text = payload["text"]
                    locator = page.locator(selector).first
                    await locator.fill(text, timeout=8000)
                    return await self._page_state(page)
                if action == "scroll":
                    direction = payload.get("direction")
                    pixels = int(payload.get("pixels") or 0)
                    if pixels == 0:
                        pixels = 800 if direction != "up" else -800
                    await page.mouse.wheel(0, pixels)
                    return await self._page_state(page)
                if action == "extract":
                    selector = payload["selector"]
                    text = await page.locator(selector).first.text_content(timeout=8000)
                    return {"ok": True, "selector": selector, "text": text or ""}
                if action == "wait":
                    seconds = max(1, min(int(payload["seconds"]), 30))
                    await asyncio.sleep(seconds)
                    return {"ok": True, "slept_seconds": seconds}
                if action == "back":
                    await page.go_back(wait_until="domcontentloaded")
                    return await self._page_state(page)
                if action == "forward":
                    await page.go_forward(wait_until="domcontentloaded")
                    return await self._page_state(page)
                return {"ok": False, "error": f"Unknown action: {action}"}
            except Exception as exc:
                return {"ok": False, "action": action, "error": str(exc)}

    async def _ensure_page(self) -> Page:
        if self.page is None or self.page.is_closed():
            await self.start()
        assert self.page is not None
        return self.page

    async def _page_state(self, page: Page) -> Dict[str, Any]:
        elements = await self._visible_elements(page)
        return {
            "ok": True,
            "url": page.url,
            "title": await page.title(),
            "elements": elements,
        }

    async def _visible_elements(self, page: Page) -> List[Dict[str, Any]]:
        script = """
        () => {
          const selectors = 'a,button,input,textarea,select,[role="button"],[contenteditable="true"]';
          const elements = Array.from(document.querySelectorAll(selectors))
            .filter((el) => {
              const r = el.getBoundingClientRect();
              const style = window.getComputedStyle(el);
              return r.width > 0 && r.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
            })
            .slice(0, 80);
          return elements.map((el, index) => {
            const id = String(index + 1);
            el.setAttribute('data-broai-id', id);
            return {
              id,
              selector: `[data-broai-id="${id}"]`,
              tag: el.tagName.toLowerCase(),
              text: (el.innerText || el.textContent || '').trim().slice(0, 120),
              placeholder: el.getAttribute('placeholder') || '',
              ariaLabel: el.getAttribute('aria-label') || '',
              role: el.getAttribute('role') || '',
              type: el.getAttribute('type') || '',
            };
          });
        }
        """
        try:
            return await page.evaluate(script)
        except Exception:
            return []
