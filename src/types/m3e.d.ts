declare module "@m3e/web/select";
declare module "@m3e/web/option";
declare module "@m3e/web/form-field";
declare module "@m3e/web/button";
declare module "@m3e/web/theme";
declare module "@m3e/web/card";
declare module "@m3e/web/badge";
declare module "@m3e/web/chip";
declare module "@m3e/web/switch";
declare module "@m3e/web/checkbox";
declare module "@m3e/web/date-input";
declare module "@m3e/web/datepicker";
declare module "@m3e/web/timepicker";

declare namespace React {
  namespace JSX {
    interface IntrinsicElements {
      "m3e-theme": any;
      "m3e-select": any;
      "m3e-option": any;
      "m3e-form-field": any;
      "m3e-button": any;
      "m3e-card": any;
      "m3e-badge": any;
      "m3e-chip": any;
      "m3e-switch": any;
      "m3e-checkbox": any;
      "m3e-date-input": any;
      "m3e-datepicker": any;
      "m3e-datepicker-toggle": any;
      "m3e-timepicker": any;
      "m3e-timepicker-toggle": any;
    }
  }
}
