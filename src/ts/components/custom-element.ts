function customElement(tagName: string) {
  return <T extends CustomElementConstructor>(
    ctor: T,
    context?: ClassDecoratorContext,
  ): T | void => {
    if (typeof customElements === "undefined") {
      return;
    }

    if (context) {
      context.addInitializer(() => {
        if (!customElements.get(tagName)) {
          customElements.define(tagName, ctor);
        }
      });
      return;
    }

    if (!customElements.get(tagName)) {
      customElements.define(tagName, ctor);
    }
  };
}

export { customElement };
