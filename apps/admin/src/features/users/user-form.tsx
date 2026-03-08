import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

interface UserFormData {
  name: string;
  email: string;
  password?: string;
  role: string;
  isActive?: boolean;
}

interface UserFormProps {
  initialData?: Omit<UserFormData, 'password'>;
  onSubmit: (data: UserFormData) => void;
  isLoading?: boolean;
}

export function UserForm({ initialData, onSubmit, isLoading }: UserFormProps) {
  const { t } = useTranslation('users');
  const { t: tCommon } = useTranslation('common');
  const [name, setName] = useState(initialData?.name ?? '');
  const [email, setEmail] = useState(initialData?.email ?? '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(initialData?.role ?? 'company_admin');
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const data: UserFormData = { name, email, role };
    if (!initialData) data.password = password;
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
        <label htmlFor="email" className="text-sm font-medium">{t('form.email')}</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          required
        />
      </div>
      {!initialData && (
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium">{t('form.password')}</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            minLength={8}
            required
          />
        </div>
      )}
      <div className="space-y-2">
        <label htmlFor="role" className="text-sm font-medium">{t('form.role')}</label>
        <select
          id="role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="tenant_admin">{t('roles.tenant_admin')}</option>
          <option value="company_admin">{t('roles.company_admin')}</option>
        </select>
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
