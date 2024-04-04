// SFR will inject this file in the header by a theme adding a value here https://github.com/Shopify/dawn/blob/1b34f48a81f9e9618b8c63c438020eaa17c3f858/layout/theme.liquid#L38

if (!window?.Shopify?.events) {

  // For very complex args, this could measurably impact performance.
  // Is it better to define what the args should be in docs but not verify that the correct args are passed?
  function argumentsMatchDefinition(arg, definition, path = '') {
    for (let key in definition) {
      if (definition.hasOwnProperty(key)) {
        const newPath = path ? `${path}:${key}` : key;
  
        if (Array.isArray(definition[key])) {
          if (definition[key].length === 0 || !Array.isArray(arg[key])) {
            console.error(`Argument ${newPath} should be an array`);
            return false;
          }
          const isComplexArray = typeof definition[key][0] === 'object';
          for (let i = 0; i < arg[key].length; i++) {
            if (isComplexArray) {
              if (!argumentsMatchDefinition(arg[key][i], definition[key][0], `${newPath}[${i}]`)) {
                return false;
              }
            } else {
              if (typeof arg[key][i] !== definition[key][0]) {
                console.error(`Argument ${newPath}[${i}] should be a ${definition[key][0]}`);
                return false;
              }
            }
          }
        } else if (typeof definition[key] === 'object' && definition[key] !== null) {
          if (!argumentsMatchDefinition(arg[key], definition[key], newPath)) {
            return false;
          }
        } else {
          if (typeof arg[key] !== definition[key]) {
            console.error(`Argument ${newPath} should be a ${definition[key]}`);
            return false;
          }
        }
      }
    }

    return true;
  }
  
  
  const EVENTS = Object.freeze({
    SECTION_INITIALIZED: "section:init",
    PRODUCT_VARIANT_SELECTED: "product:variant:select",
    // ...
  });

  const CONTEXT_DEFINITION = Object.freeze({
    // will everything have a section?
    sectionId: "string",
    // TODO what else should context contain? 
  });

  const VARIANT_DEFINITION = Object.freeze({
    id: "number",
    // should we include all fields?
  });

  const EVENT_DEFINITIONS = Object.freeze({
    // TODO how do we type this effectively?
    [EVENTS.SECTION_INITIALIZED]: { context: CONTEXT_DEFINITION, sectionId: "string" },
    [EVENTS.PRODUCT_VARIANT_SELECTED]: { context: CONTEXT_DEFINITION, variant: VARIANT_DEFINITION },
  });

  class EventBus {
    #subscribers = {};

    constructor() {}

    publish(eventName, args) {
      console.debug(`%cpublishing ${eventName}`, "color: green");

      const eventDefinition = EVENT_DEFINITIONS[eventName];
      if (eventDefinition && !argumentsMatchDefinition(args, eventDefinition)) {
        return;
      }

      this.#subscribers[eventName]?.forEach((callback) => callback(args));
    }

    subscribe(eventName, callback) {
      if (!this.#subscribers[eventName]) {
        this.#subscribers[eventName] = [];
      }

      this.#subscribers[eventName].push(callback);

      const unsubscribe = () => {
        this.#subscribers[eventName] = this.#subscribers[eventName].filter(
          (_callback) => _callback !== callback
        );
      };
      return unsubscribe;
    }

    // --------------------------------------------------
    //              ALTERANTIVE APPROACH
    // --------------------------------------------------

    // by passing a target, we can have the event bubble and be captured at the section level
    //   for example: variant change is published at the variant picker component, app block listens for the change on its .closest("shopify-section")
    dispatchEvent(eventName, args, target = window) {
      console.debug(`%cpublishing ${eventName} as event`, "color: green");

      const eventDefinition = EVENT_DEFINITIONS[eventName];
      if (eventDefinition && !argumentsMatchDefinition(args, eventDefinition)) {
        return;
      }

      target.dispatchEvent(
        new CustomEvent(eventName, { bubbles: true, detail: args })
      );
    }

    addEventListener(eventName, callback, target = window) {
      target.addEventListener(eventName, (response) =>
        callback(response.detail)
      );

      const removeEventListener = () =>
        target.removeEventListener(eventName, callback);
      return removeEventListener;
    }

    get definitions() {
      return EVENTS;
    }
  }

  // --------------------------------------------------
  //              Actions
  // --------------------------------------------------

  const ACTIONS = Object.freeze({
    PRODUCT_UI_PRICE_UPDATE: "product:ui:price:update",
    PRODUCT_FORM_SET_INPUTS: "product:form:set_inputs",
    // ...
  });

  const ACTION_DEFINITIONS = {
    // TODO how do we type this effectively?
    // TODO how should we contextualize actions? 
    [ACTIONS.PRODUCT_UI_PRICE_UPDATE]: {
      context: CONTEXT_DEFINITION,
      price: "number",
    },
    [ACTIONS.PRODUCT_FORM_SET_INPUTS]: {
      context: CONTEXT_DEFINITION,
      inputs: [
        {
          input_name: "string",
          value: "string",
        }
      ],
    },
  };

  class ActionRegister {
    #registeredCallbacks = undefined;
    #isInitialized = false;

    // Unlike the event bus, this only allows registering known actions
    initialize(callbackHash = {}) {
      if (this.#isInitialized) {
        console.error('ActionRegister is already initialized');
        return;
      }

      console.debug(`%cInitializing ActionRegister`, "color: green");
      
      let _registeredCallbacks = {};
      for (const [callbackName, callback] of Object.entries(callbackHash)) {
        if (callbackName && ACTION_DEFINITIONS[callbackName]) {
          _registeredCallbacks = {
            ..._registeredCallbacks,
            [callbackName]: callback,
          };
        } else {
          console.error(`No action definition found for ${callbackName}`);
        }
      }

      this.#registeredCallbacks = Object.freeze(_registeredCallbacks);
      this.#isInitialized = true;
    }

    isRegistered(actionName) {
      return !!this.#registeredCallbacks[actionName];
    }

    call(actionName, args = {}) {
      const callback = this.#registeredCallbacks[actionName];
      if (!callback) {
        console.error(`No callback registered for ${actionName}`);
        return;
      }

      const actionDefinition = ACTION_DEFINITIONS[actionName];
      if (!actionDefinition) {
        console.error(`No action found for ${actionName}`);
        return;
      } else if (actionDefinition && !argumentsMatchDefinition(args, actionDefinition)) {
        return;
      }

      callback(args);
    }

    get definitions() {
      return ACTIONS;
    }
  }
  

  window.Shopify = {
    ...window.Shopify,
    EventBus: new EventBus(),
    Actions: new ActionRegister(),

    // TODO how do we want to handle versioning? events and action definitions as well as args for each could theoretically evolve
    version: "1.0.0",
  };
}
