import styles from "./crud-form.module.scss";

type Field = {
  label: string;
  name: string;
  placeholder: string;
  type?: string;
  as?: "input" | "textarea";
};

type CrudFormProps = {
  title: string;
  description: string;
  fields: Field[];
};

export function CrudForm({ title, description, fields }: CrudFormProps) {
  return (
    <section className={styles.formCard} aria-label={title}>
      <div className={styles.header}>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>

      <form className={styles.form}>
        {fields.map((field) => {
          const commonProps = {
            id: field.name,
            name: field.name,
            placeholder: field.placeholder,
          };

          return (
            <label key={field.name} htmlFor={field.name}>
              <span>{field.label}</span>
              {field.as === "textarea" ? (
                <textarea {...commonProps} rows={4} />
              ) : (
                <input {...commonProps} type={field.type ?? "text"} />
              )}
            </label>
          );
        })}

        <div className={styles.actions}>
          <button type="button" className={styles.secondary}>
            Limpar
          </button>
          <button type="submit" className={styles.primary}>
            Salvar
          </button>
        </div>
      </form>
    </section>
  );
}
