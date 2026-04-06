"use client";

import { useMemo, useState } from "react";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoadingSpinner } from "@/components/shared/ui/LoadingSpinner";
import styles from "../styles/crud-form.module.scss";
import { CrudFormField } from "./CrudFormField";
import type { Field } from "../utils/catalog-form-types";

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
  const defaultValues = useMemo(
    () =>
      fields.reduce<CrudFormValues>((accumulator, field) => {
        accumulator[field.name] = "";
        return accumulator;
      }, {}),
    [fields],
  );

  const formKey = useMemo(
    () => JSON.stringify({ fields: fields.map((field) => field.name), initialValues: initialValues ?? defaultValues }),
    [defaultValues, fields, initialValues],
  );

  return (
    <CrudFormInner
      key={formKey}
      title={title}
      description={description}
      fields={fields}
      initialValues={initialValues}
      submitLabel={submitLabel}
      cancelLabel={cancelLabel}
      onSubmit={onSubmit}
      onCancel={onCancel}
      defaultValues={defaultValues}
    />
  );
}

function CrudFormInner({
  title,
  description,
  fields,
  initialValues,
  submitLabel = "Salvar",
  cancelLabel = "Limpar",
  onSubmit,
  onCancel,
  defaultValues,
}: CrudFormProps & { defaultValues: CrudFormValues }) {
  const schema = useMemo(() => buildSchema(fields), [fields]);
  const [searchQueries, setSearchQueries] = useState<Record<string, string>>({});
  const [openSearchField, setOpenSearchField] = useState<string | null>(null);
  const [pendingTagSelection, setPendingTagSelection] = useState<Record<string, string>>({});

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CrudFormValues>({
    resolver: zodResolver(schema) as Resolver<CrudFormValues>,
    defaultValues: initialValues ?? defaultValues,
    mode: "onTouched",
  });

  const watchedValues = useWatch({ control });

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
          const selectedValue = watchedValues[field.name];
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

          return (
            <CrudFormField
              key={field.name}
              field={field}
              register={register}
              errors={errors}
              searchValue={searchValue}
              isSearchOpen={isSearchOpen}
              selectedOptionLabel={selectedOption?.label}
              filteredOptions={filteredOptions}
              pendingTag={pendingTag}
              selectedTags={selectedTags}
              availableTagOptions={availableTagOptions}
              onSearchChange={(value) => {
                setOpenSearchField(field.name);
                setSearchQueries((current) => ({ ...current, [field.name]: value }));
              }}
              onSearchFocus={() => {
                setOpenSearchField(field.name);
                setSearchQueries((current) => ({
                  ...current,
                  [field.name]: current[field.name] ?? selectedOption?.label ?? "",
                }));
              }}
              onSearchBlur={() => {
                window.setTimeout(() => {
                  setOpenSearchField((current) => (current === field.name ? null : current));
                }, 120);
              }}
              onPickSearchOption={(option) => {
                setValue(field.name, option.value, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
                setSearchQueries((current) => ({ ...current, [field.name]: option.label }));
                setOpenSearchField(null);
              }}
              onChangePendingTag={(value) => {
                setPendingTagSelection((current) => ({ ...current, [field.name]: value }));
              }}
              onAddTag={() => {
                if (!pendingTag) {
                  return;
                }

                const nextKeys = [...selectedTagKeys, pendingTag];
                setValue(field.name, nextKeys.join(","), { shouldDirty: true, shouldTouch: true, shouldValidate: true });
                setPendingTagSelection((current) => ({ ...current, [field.name]: "" }));
              }}
              onRemoveTag={(tagValue) => {
                const nextKeys = selectedTagKeys.filter((key) => key !== tagValue);
                setValue(field.name, nextKeys.join(","), { shouldDirty: true, shouldTouch: true, shouldValidate: true });
              }}
            />
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
