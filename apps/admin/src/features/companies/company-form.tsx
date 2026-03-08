import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

interface CompanyFormData {
  name: string;
  document: string;
  isActive?: boolean;
}

interface CompanyFormProps {
  initialData?: CompanyFormData;
  onSubmit: (data: CompanyFormData) => void;
  isLoading?: boolean;
}

export function CompanyForm({ initialData, onSubmit, isLoading }: CompanyFormProps) {
  const { t } = useTranslation('companies');
  const { t: tCommon } = useTranslation('common');
  const [name, setName] = useState(initialData?.name ?? '');
  const [document, setDocument] = useState(initialData?.document ?? '');
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const data: CompanyFormData = { name, document };
    if (initialData) data.isActive = isActive;
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium">{t('form.name')}</label>
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          required
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="document" className="text-sm font-medium">{t('form.document')}</label>
        <input
          id="document"
          value={document}
          onChange={(e) => setDocument(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          required
        />
      </div>
      {initialData && (
        <div className="flex items-center gap-2">
          <input
            id="isActive"
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          <label htmlFor="isActive" className="text-sm font-medium">{t('form.active')}</label>
        </div>
      )}
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
