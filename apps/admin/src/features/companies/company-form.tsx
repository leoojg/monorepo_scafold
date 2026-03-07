import { useState, type FormEvent } from 'react';

interface CompanyFormData {
  name: string;
  document: string;
}

interface CompanyFormProps {
  initialData?: CompanyFormData;
  onSubmit: (data: CompanyFormData) => void;
  isLoading?: boolean;
}

export function CompanyForm({ initialData, onSubmit, isLoading }: CompanyFormProps) {
  const [name, setName] = useState(initialData?.name ?? '');
  const [document, setDocument] = useState(initialData?.document ?? '');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({ name, document });
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium">Name</label>
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          required
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="document" className="text-sm font-medium">Document</label>
        <input
          id="document"
          value={document}
          onChange={(e) => setDocument(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          required
        />
      </div>
      <button
        type="submit"
        disabled={isLoading}
        className="inline-flex h-10 items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {isLoading ? 'Saving...' : initialData ? 'Update' : 'Create'}
      </button>
    </form>
  );
}
