"use client";

import { useEffect, useMemo } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import styles from "./crud-form.module.scss";

type Field = {
  label: string;
  name: string;
  placeholder: string;
  type?: string;
  as?: "input" | "textarea";
  required?: boolean;
  readOnly?: boolean;
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
    formState: { errors, isSubmitting },
  } = useForm<CrudFormValues>({
    resolver: zodResolver(schema) as Resolver<CrudFormValues>,
    defaultValues: initialValues ?? defaultValues,
    mode: "onTouched",
  });

  useEffect(() => {
    reset(initialValues ?? defaultValues);
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

          return (
            <label key={field.name} htmlFor={field.name}>
              <span>{field.label}</span>
              {field.as === "textarea" ? (
                <textarea
                  id={field.name}
                  placeholder={field.placeholder}
                  rows={4}
                  readOnly={field.readOnly}
                  {...register(field.name)}
                />
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
            {cancelLabel}
          </button>
          <button type="submit" className={styles.primary} disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : submitLabel}
          </button>
        </div>
      </form>
    </section>
  );
}
