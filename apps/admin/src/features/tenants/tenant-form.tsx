import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

interface TenantFormData {
  name: string;
  slug: string;
}

interface TenantFormProps {
  initialData?: TenantFormData;
  onSubmit: (data: TenantFormData) => void;
  isLoading?: boolean;
}

export function TenantForm({ initialData, onSubmit, isLoading }: TenantFormProps) {
  const { t } = useTranslation('tenants');
  const { t: tCommon } = useTranslation('common');
  const [name, setName] = useState(initialData?.name ?? '');
  const [slug, setSlug] = useState(initialData?.slug ?? '');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({ name, slug });
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (!initialData) {
      setSlug(
        value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, ''),
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium">
          {t('form.name')}
        </label>
        <input
          id="name"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="slug" className="text-sm font-medium">
          {t('form.slug')}
        </label>
        <input
          id="slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          pattern="^[a-z0-9-]+$"
          required
        />
        <p className="text-xs text-muted-foreground">
          {t('form.slugHelp')}
        </p>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="inline-flex h-10 items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {isLoading ? tCommon('status.saving') : initialData ? tCommon('actions.update') : tCommon('actions.create')}
      </button>
    </form>
  );
}
