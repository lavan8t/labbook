declare module "@m3e/web/select";
declare module "@m3e/web/option";
declare module "@m3e/web/form-field";
declare module "@m3e/web/button";
declare module "@m3e/web/theme";
declare module "@m3e/web/card";
declare module "@m3e/web/badge";
declare module "@m3e/web/chips";
declare module "@m3e/web/switch";
declare module "@m3e/web/checkbox";
declare module "@m3e/web/date-input";
declare module "@m3e/web/datepicker";
declare module "@m3e/web/timepicker";
declare module "@m3e/web/tabs";
declare module "@m3e/web/icon";
declare module "@m3e/web/divider";
declare module "@m3e/web/tooltip";
declare module "@m3e/web/button-group";
declare module "@m3e/web/icon-button";
declare module "@m3e/web/segmented-button";

type CustomElementProps = React.HTMLAttributes<HTMLElement> & Record<string, unknown>;

declare namespace React {
  namespace JSX {
    interface IntrinsicElements {
      "m3e-theme": CustomElementProps;
      "m3e-select": CustomElementProps;
      "m3e-option": CustomElementProps;
      "m3e-form-field": CustomElementProps;
      "m3e-button": CustomElementProps;
      "m3e-button-group": CustomElementProps;
      "m3e-icon-button": CustomElementProps;
      "m3e-segmented-button": CustomElementProps;
      "m3e-card": CustomElementProps;
      "m3e-badge": CustomElementProps;
      "m3e-chip": CustomElementProps;
      "m3e-filter-chip": CustomElementProps;
      "m3e-assist-chip": CustomElementProps;
      "m3e-chip-set": CustomElementProps;
      "m3e-filter-chip-set": CustomElementProps;
      "m3e-switch": CustomElementProps;
      "m3e-checkbox": CustomElementProps;
      "m3e-date-input": CustomElementProps;
      "m3e-datepicker": CustomElementProps;
      "m3e-datepicker-toggle": CustomElementProps;
      "m3e-timepicker": CustomElementProps;
      "m3e-timepicker-toggle": CustomElementProps;
      "m3e-tabs": CustomElementProps;
      "m3e-tab": CustomElementProps;
      "m3e-tab-panel": CustomElementProps;
      "m3e-icon": CustomElementProps;
      "m3e-divider": CustomElementProps;
      "m3e-tooltip": CustomElementProps;
    }
  }
}
