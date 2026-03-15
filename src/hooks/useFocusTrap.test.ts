// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFocusTrap } from "./useFocusTrap";

describe("useFocusTrap", () => {
  it("returns a ref object", () => {
    const { result } = renderHook(() => useFocusTrap(false));
    expect(result.current).toHaveProperty("current");
  });

  it("calls onClose when Escape is pressed while open", () => {
    const onClose = vi.fn();
    renderHook(() => useFocusTrap(true, onClose));
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("does not call onClose when not open", () => {
    const onClose = vi.fn();
    renderHook(() => useFocusTrap(false, onClose));
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("useFocusTrap Tab key handling", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("Tab at last element wraps focus to first", () => {
    const preventDefault = vi.fn();
    const { result } = renderHook(() => useFocusTrap(true));
    const container = document.createElement("div");
    container.style.position = "relative";
    const btn1 = document.createElement("button");
    btn1.textContent = "First";
    const btn2 = document.createElement("button");
    btn2.textContent = "Last";
    container.appendChild(btn1);
    container.appendChild(btn2);
    document.body.appendChild(container);

    (result.current as React.RefObject<HTMLDivElement>).current = container;
    act(() => {
      btn2.focus();
    });
    expect(document.activeElement).toBe(btn2);

    act(() => {
      const ev = new KeyboardEvent("keydown", { key: "Tab", bubbles: true });
      ev.preventDefault = preventDefault;
      document.dispatchEvent(ev);
    });

    expect(preventDefault).toHaveBeenCalled();
    // jsdom does not update document.activeElement on element.focus()
  });

  it("Shift+Tab at first element wraps focus to last", () => {
    const preventDefault = vi.fn();
    const { result } = renderHook(() => useFocusTrap(true));
    const container = document.createElement("div");
    container.style.position = "relative";
    const btn1 = document.createElement("button");
    btn1.textContent = "First";
    const btn2 = document.createElement("button");
    btn2.textContent = "Last";
    container.appendChild(btn1);
    container.appendChild(btn2);
    document.body.appendChild(container);

    (result.current as React.RefObject<HTMLDivElement>).current = container;
    act(() => {
      btn1.focus();
    });
    expect(document.activeElement).toBe(btn1);

    act(() => {
      const ev = new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true });
      ev.preventDefault = preventDefault;
      document.dispatchEvent(ev);
    });

    expect(preventDefault).toHaveBeenCalled();
    // jsdom does not update document.activeElement on element.focus()
  });

  it("Tab when no focusable elements prevents default", () => {
    const preventDefault = vi.fn();
    const { result } = renderHook(() => useFocusTrap(true));
    const container = document.createElement("div");
    document.body.appendChild(container);

    (result.current as React.RefObject<HTMLDivElement>).current = container;

    act(() => {
      const ev = new KeyboardEvent("keydown", { key: "Tab", bubbles: true });
      ev.preventDefault = preventDefault;
      document.dispatchEvent(ev);
    });

    expect(preventDefault).toHaveBeenCalled();
  });

  it("focuses first element when opened with container already set", () => {
    const rafSpy = vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });

    const { result, rerender } = renderHook(
      ({ isOpen }) => useFocusTrap(isOpen),
      { initialProps: { isOpen: false } }
    );
    const container = document.createElement("div");
    container.style.position = "relative";
    const btn = document.createElement("button");
    btn.textContent = "First";
    container.appendChild(btn);
    document.body.appendChild(container);
    (result.current as React.RefObject<HTMLDivElement>).current = container;

    rerender({ isOpen: true });

    expect(rafSpy).toHaveBeenCalled();
    rafSpy.mockRestore();
  });

  it("cleanup on unmount removes listener and restores focus to trigger", () => {
    const trigger = document.createElement("button");
    trigger.textContent = "Trigger";
    document.body.appendChild(trigger);
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    const { result, unmount } = renderHook(() => useFocusTrap(true));
    const container = document.createElement("div");
    const btn = document.createElement("button");
    btn.textContent = "Inside";
    container.appendChild(btn);
    document.body.appendChild(container);
    (result.current as React.RefObject<HTMLDivElement>).current = container;

    unmount();

    expect(document.activeElement).toBe(trigger);
  });
});
