"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Ban } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import styles from "./crud-form.module.scss";

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

type CrudFormValues = Record<string, string>;

type CrudFormProps = {
  title: string;
  description: string;
  fields: Field[];
  initialValues?: CrudFormValues;
  submitLabel?: string;
  cancelLabel?: string;
  onSubmit?: (values: CrudFormValues) => void | Promise<void>;
  onCancel?: () => void;
};

function buildSchema(fields: Field[]) {
  const shape = Object.fromEntries(
    fields.map((field) => {
      const schema = field.required === false
        ? z.string().trim().optional().transform((value) => value ?? "")
        : z.string().trim().min(1, `${field.label} e obrigatorio`);

      return [field.name, schema];
    }),
  );

  return z.object(shape as Record<string, z.ZodTypeAny>);
}

export function CrudForm({
  title,
  description,
  fields,
  initialValues,
  submitLabel = "Salvar",
  cancelLabel = "Limpar",
  onSubmit,
  onCancel,
}: CrudFormProps) {
  const schema = useMemo(() => buildSchema(fields), [fields]);
  const [searchQueries, setSearchQueries] = useState<Record<string, string>>({});
  const [openSearchField, setOpenSearchField] = useState<string | null>(null);
  const [pendingTagSelection, setPendingTagSelection] = useState<Record<string, string>>({});

  const defaultValues = useMemo(
    () =>
      fields.reduce<CrudFormValues>((accumulator, field) => {
        accumulator[field.name] = "";
        return accumulator;
      }, {}),
    [fields],
  );

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CrudFormValues>({
    resolver: zodResolver(schema) as Resolver<CrudFormValues>,
    defaultValues: initialValues ?? defaultValues,
    mode: "onTouched",
  });

  useEffect(() => {
    reset(initialValues ?? defaultValues);
    setSearchQueries({});
    setOpenSearchField(null);
    setPendingTagSelection({});
  }, [defaultValues, initialValues, reset]);

  const submitForm = handleSubmit(async (values) => {
    await onSubmit?.(values);
    reset(defaultValues);
  });

  return (
    <section className={styles.formCard} aria-label={title}>
      <div className={styles.header}>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>

      <form className={styles.form} onSubmit={submitForm} noValidate>
        {fields.map((field) => {
          const fieldError = errors[field.name];
          const selectedValue = watch(field.name);
          const normalizedSelectedValue = typeof selectedValue === "string" ? selectedValue : "";
          const selectedOption = field.options?.find((option) => option.value === normalizedSelectedValue);
          const searchValue = searchQueries[field.name] ?? "";
          const isSearchOpen = openSearchField === field.name;
          const selectedTagKeys = normalizedSelectedValue
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean);
          const selectedTags = (field.options ?? []).filter((option) => selectedTagKeys.includes(option.value));
          const availableTagOptions = (field.options ?? []).filter((option) => !selectedTagKeys.includes(option.value));
          const pendingTag = pendingTagSelection[field.name] ?? "";
          const filteredOptions = field.options?.filter((option) => {
            const query = searchValue.trim().toLowerCase();

            if (!query) {
              return true;
            }

            return option.label.toLowerCase().includes(query) || option.value.toLowerCase().includes(query);
          }) ?? [];
          const inputId = field.as === "search-select" ? `${field.name}-search` : field.name;

          return (
            <label key={field.name} htmlFor={inputId}>
              <span>{field.label}</span>
              {field.as === "textarea" ? (
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
                    value={searchValue || selectedOption?.label || ""}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      setOpenSearchField(field.name);
                      setSearchQueries((current) => ({ ...current, [field.name]: nextValue }));
                    }}
                    onFocus={() => {
                      setOpenSearchField(field.name);
                      setSearchQueries((current) => ({
                        ...current,
                        [field.name]: current[field.name] ?? selectedOption?.label ?? "",
                      }));
                    }}
                    onBlur={() => {
                      window.setTimeout(() => {
                        setOpenSearchField((current) => (current === field.name ? null : current));
                      }, 120);
                    }}
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
                          onClick={() => {
                            setValue(field.name, option.value, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
                            setSearchQueries((current) => ({ ...current, [field.name]: option.label }));
                            setOpenSearchField(null);
                          }}
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
                <select
                  id={field.name}
                  disabled={field.readOnly}
                  {...register(field.name)}
                >
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
                      onChange={(event) => {
                        setPendingTagSelection((current) => ({ ...current, [field.name]: event.target.value }));
                      }}
                    >
                      <option value="">Selecione uma serie</option>
                      {availableTagOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className={styles.tagAddButton}
                      disabled={field.readOnly || !pendingTag}
                      onClick={() => {
                        if (!pendingTag) {
                          return;
                        }

                        const nextKeys = [...selectedTagKeys, pendingTag];
                        setValue(field.name, nextKeys.join(","), { shouldDirty: true, shouldTouch: true, shouldValidate: true });
                        setPendingTagSelection((current) => ({ ...current, [field.name]: "" }));
                      }}
                    >
                      Adicionar
                    </button>
                  </div>

                  <input type="hidden" {...register(field.name)} />

                  {selectedTags.length > 0 ? (
                    <div className={styles.tagList}>
                      {selectedTags.map((tag) => (
                        <span key={tag.value} className={styles.tagItem}>
                          <span>{tag.label}</span>
                          <button
                            type="button"
                            disabled={field.readOnly}
                            aria-label={`Remover ${tag.label}`}
                            onClick={() => {
                              const nextKeys = selectedTagKeys.filter((key) => key !== tag.value);
                              setValue(field.name, nextKeys.join(","), { shouldDirty: true, shouldTouch: true, shouldValidate: true });
                            }}
                          >
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
              )}
              {fieldError ? <small>{fieldError.message}</small> : null}
            </label>
          );
        })}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.secondary}
            onClick={() => {
              reset(defaultValues);
              onCancel?.();
            }}
          >
            <span className={styles.actionLabel}>
              <Ban size={16} aria-hidden="true" />
              <span>{cancelLabel}</span>
            </span>
          </button>
          <button type="submit" className={styles.primary} disabled={isSubmitting}>
            {isSubmitting ? (
              <span className={styles.buttonLoading}>
                <LoadingSpinner size={14} label="Salvando" />
                <span>Salvando...</span>
              </span>
            ) : (
              submitLabel
            )}
          </button>
        </div>
      </form>
    </section>
  );
}
