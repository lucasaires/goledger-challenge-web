import { type FieldErrors, type UseFormRegister } from "react-hook-form";
import styles from "./crud-form.module.scss";

import type { Field } from "./CrudForm";

type CrudFormValues = Record<string, string>;

type CrudFormFieldProps = {
  field: Field;
  register: UseFormRegister<CrudFormValues>;
  errors: FieldErrors<CrudFormValues>;
  searchValue: string;
  isSearchOpen: boolean;
  selectedOptionLabel?: string;
  filteredOptions: Array<{ label: string; value: string }>;
  pendingTag: string;
  selectedTags: Array<{ label: string; value: string }>;
  availableTagOptions: Array<{ label: string; value: string }>;
  onSearchChange: (value: string) => void;
  onSearchFocus: () => void;
  onSearchBlur: () => void;
  onPickSearchOption: (option: { label: string; value: string }) => void;
  onChangePendingTag: (value: string) => void;
  onAddTag: () => void;
  onRemoveTag: (tagValue: string) => void;
};

export function CrudFormField({
  field,
  register,
  errors,
  searchValue,
  isSearchOpen,
  selectedOptionLabel,
  filteredOptions,
  pendingTag,
  selectedTags,
  availableTagOptions,
  onSearchChange,
  onSearchFocus,
  onSearchBlur,
  onPickSearchOption,
  onChangePendingTag,
  onAddTag,
  onRemoveTag,
}: CrudFormFieldProps) {
  const fieldError = errors[field.name];

  const fieldInput = field.as === "textarea" ? (
    <textarea
      id={field.name}
      placeholder={field.placeholder}
      rows={4}
      readOnly={field.readOnly}
      {...register(field.name)}
    />
  ) : field.as === "search-select" ? (
    <div className={styles.searchSelect}>
      <input
        id={`${field.name}-search`}
        placeholder={field.placeholder}
        type="text"
        value={searchValue || selectedOptionLabel || ""}
        onChange={(event) => onSearchChange(event.target.value)}
        onFocus={onSearchFocus}
        onBlur={onSearchBlur}
        readOnly={field.readOnly}
        autoComplete="off"
      />
      <input type="hidden" {...register(field.name)} />
      {isSearchOpen && filteredOptions.length > 0 ? (
        <div className={styles.searchSelectOptions} role="listbox" aria-label={field.label}>
          {filteredOptions.slice(0, 8).map((option) => (
            <button
              key={option.value}
              type="button"
              className={styles.searchSelectOption}
              onClick={() => onPickSearchOption(option)}
            >
              <span>{option.label}</span>
              <small>{option.value}</small>
            </button>
          ))}
        </div>
      ) : searchValue ? (
        <div className={styles.searchSelectEmpty}>Nenhum resultado encontrado.</div>
      ) : null}
    </div>
  ) : field.as === "select" ? (
    <select id={field.name} disabled={field.readOnly} {...register(field.name)}>
      <option value="">Selecione</option>
      {field.options?.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ) : field.as === "tag-select" ? (
    <div className={styles.tagSelect}>
      <div className={styles.tagSelectControls}>
        <select
          id={field.name}
          value={pendingTag}
          disabled={field.readOnly || availableTagOptions.length === 0}
          onChange={(event) => onChangePendingTag(event.target.value)}
        >
          <option value="">Selecione uma serie</option>
          {availableTagOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button type="button" className={styles.tagAddButton} disabled={field.readOnly || !pendingTag} onClick={onAddTag}>
          Adicionar
        </button>
      </div>

      <input type="hidden" {...register(field.name)} />

      {selectedTags.length > 0 ? (
        <div className={styles.tagList}>
          {selectedTags.map((tag) => (
            <span key={tag.value} className={styles.tagItem}>
              <span>{tag.label}</span>
              <button type="button" disabled={field.readOnly} aria-label={`Remover ${tag.label}`} onClick={() => onRemoveTag(tag.value)}>
                x
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className={styles.tagHint}>Nenhuma serie selecionada.</p>
      )}
    </div>
  ) : (
    <input
      id={field.name}
      placeholder={field.placeholder}
      type={field.type ?? "text"}
      readOnly={field.readOnly}
      {...register(field.name)}
    />
  );

  return (
    <label htmlFor={field.as === "search-select" ? `${field.name}-search` : field.name}>
      <span>{field.label}</span>
      {fieldInput}
      {fieldError ? <small>{fieldError.message}</small> : null}
    </label>
  );
}
