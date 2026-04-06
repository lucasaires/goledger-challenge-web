export type Field = {
  label: string;
  name: string;
  placeholder: string;
  type?: string;
  as?: "input" | "textarea" | "select" | "search-select" | "tag-select";
  required?: boolean;
  readOnly?: boolean;
  options?: Array<{ label: string; value: string }>;
};
