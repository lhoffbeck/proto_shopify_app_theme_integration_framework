// this file would need to be added by themes to register handlers for specific actions
// important -- this file must be added to the head tags after the event-bus.js

(() => {
  // -------- callback definitions --------
  function productUIPriceUpdate({ context: { sectionId }, price }) {
    const formatter = Intl.NumberFormat(Shopify.country, {
      style: "currency",
      currency: Shopify.currency.active,
    });

    // note -- this approach assumes 2 significant digits and should not be productionalized
    document.querySelector(
      `#${sectionId} .price-item`
    ).innerHTML = `${formatter.format(price / 100)} ${Shopify.currency.active}`;
  }

  function productFormSetInputs({ context: { sectionId }, inputs }) {
    const productForm = document.querySelector(
      `#${sectionId} product-form form`
    );

    for (const { input_name, value } of inputs) {
      const input = productForm.querySelector(`input[name=${input_name}]`);
      if (input) {
        input.value = value;
      } else {
        const newInput = document.createElement("input");
        newInput.setAttribute("type", "hidden");
        newInput.setAttribute("name", input_name);
        newInput.setAttribute("value", value);

        productForm.appendChild(newInput);
      }
    }
  }

  // -------- initialize --------
  const _a = window.Shopify.Actions;
  _a.initialize({
    [_a.definitions.PRODUCT_UI_PRICE_UPDATE]: productUIPriceUpdate,
    [_a.definitions.PRODUCT_FORM_SET_INPUTS]: productFormSetInputs,
  });
})();
