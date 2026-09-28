import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { customElement } from "../src/ts/components/custom-element";

beforeEach(() => {
  vi.stubGlobal("HTMLElement", class HTMLElement {});
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("customElement decorator", () => {
  it("defines custom element when not previously registered", () => {
    const defined = new Map<string, CustomElementConstructor>();
    vi.stubGlobal("customElements", {
      get: (name: string) => defined.get(name),
      define: (name: string, ctor: CustomElementConstructor) => {
        if (defined.has(name)) {
          throw new Error(`Already defined: ${name}`);
        }
        defined.set(name, ctor);
      },
    });

    class TestElement extends HTMLElement {}
    customElement("test-element")(TestElement);

    expect(defined.get("test-element")).toBe(TestElement);
  });

  it("does not throw or re-register when element is already defined", () => {
    const defined = new Map<string, CustomElementConstructor>();
    class FirstElement extends HTMLElement {}
    class SecondElement extends HTMLElement {}
    defined.set("test-element", FirstElement);

    const defineSpy = vi.fn((name: string, ctor: CustomElementConstructor) => {
      if (defined.has(name)) {
        throw new Error(`Already defined: ${name}`);
      }
      defined.set(name, ctor);
    });

    vi.stubGlobal("customElements", {
      get: (name: string) => defined.get(name),
      define: defineSpy,
    });

    expect(() => {
      customElement("test-element")(SecondElement);
    }).not.toThrow();

    expect(defineSpy).not.toHaveBeenCalled();
    expect(defined.get("test-element")).toBe(FirstElement);
  });

  it("safely handles undefined customElements registry", () => {
    vi.stubGlobal("customElements", undefined);

    class TestElement extends HTMLElement {}
    expect(() => {
      customElement("test-element")(TestElement);
    }).not.toThrow();
  });

  it("supports TC39 stage-3 decorator context initializers", () => {
    const defined = new Map<string, CustomElementConstructor>();
    vi.stubGlobal("customElements", {
      get: (name: string) => defined.get(name),
      define: (name: string, ctor: CustomElementConstructor) => {
        defined.set(name, ctor);
      },
    });

    const initializers: (() => void)[] = [];
    const context = {
      addInitializer: (fn: () => void) => initializers.push(fn),
    } as unknown as ClassDecoratorContext;

    class TestElement extends HTMLElement {}
    customElement("test-stage3")(TestElement, context);

    expect(defined.has("test-stage3")).toBe(false);
    expect(initializers).toHaveLength(1);

    initializers[0]!();
    expect(defined.get("test-stage3")).toBe(TestElement);
  });
});
