import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/auth-provider';
import { Globe, LogOut, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function USFlag({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 640 480" xmlns="http://www.w3.org/2000/svg">
      <path fill="#bd3d44" d="M0 0h640v37h-640zm0 74h640v37h-640zm0 148h640v37h-640zm0 148h640v37h-640zm0-222h640v37h-640zm0 148h640v37h-640zm0 148h640v37h-640z"/>
      <path fill="#fff" d="M0 37h640v37h-640zm0 148h640v37h-640zm0 148h640v37h-640zm0-222h640v37h-640zm0 148h640v37h-640zm0 148h640v37h-640z"/>
      <path fill="#192f5d" d="M0 0h256v259h-256z"/>
      <g fill="#fff">
        <g id="s18">
          <g id="s9">
            <g id="s5">
              <g id="s4">
                <path id="s" d="M22 11l3.09 9.51h10l-8.09 5.88 3.09 9.51-8.09-5.88-8.09 5.88 3.09-9.51-8.09-5.88h10z"/>
                <use xlinkHref="#s" x="44"/>
              </g>
              <use xlinkHref="#s" x="88"/>
            </g>
            <use xlinkHref="#s4" x="132"/>
          </g>
          <use xlinkHref="#s9" y="37"/>
        </g>
        <use xlinkHref="#s18" y="74"/>
        <use xlinkHref="#s9" y="148"/>
        <use xlinkHref="#s5" y="185"/>
        <use xlinkHref="#s4" x="22" y="18.5"/>
        <use xlinkHref="#s4" x="22" y="55.5"/>
        <use xlinkHref="#s4" x="22" y="92.5"/>
        <use xlinkHref="#s4" x="22" y="129.5"/>
        <use xlinkHref="#s" x="22" y="166.5"/>
        <use xlinkHref="#s" x="66" y="166.5"/>
        <use xlinkHref="#s" x="154" y="166.5"/>
        <use xlinkHref="#s" x="198" y="166.5"/>
        <use xlinkHref="#s" x="110" y="166.5"/>
      </g>
    </svg>
  );
}

function BRFlag({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 640 480" xmlns="http://www.w3.org/2000/svg">
      <path fill="#229e45" d="M0 0h640v480H0z"/>
      <path fill="#f8e509" d="M320 76.8 553.6 240 320 403.2 86.4 240z"/>
      <circle fill="#2b49a3" cx="320" cy="240" r="86.4"/>
      <path fill="#fff" d="M234.4 263.2a115.2 115.2 0 0 1-.8-16c0-43.2 24-80.8 59.2-100a115.2 115.2 0 0 1 54.4-13.6c28 0 53.6 10 73.6 26.4a86 86 0 0 0-186.4 103.2z"/>
    </svg>
  );
}

const languages = [
  { code: 'en', label: 'english', Flag: USFlag },
  { code: 'pt-BR', label: 'portuguese', Flag: BRFlag },
] as const;

export function UserMenu() {
  const { t, i18n } = useTranslation('common');
  const { operator, logout } = useAuth();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground outline-none">
        {operator?.name}
        <ChevronDown className="h-3 w-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Globe className="mr-2 h-4 w-4" />
            {t('userMenu.language')}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {languages.map((lang) => (
              <DropdownMenuItem
                key={lang.code}
                onClick={() => changeLanguage(lang.code)}
                className={i18n.language === lang.code ? 'bg-accent font-semibold' : ''}
              >
                <span className="inline-flex items-center gap-2">
                  <lang.Flag className="h-3.5 w-5 rounded-sm shadow-sm" />
                  {t(`userMenu.${lang.label}`)}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout}>
          <LogOut className="mr-2 h-4 w-4" />
          {t('userMenu.signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
